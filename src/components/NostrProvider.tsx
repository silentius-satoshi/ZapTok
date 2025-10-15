import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { getOptimalRelays, type RelayContext } from '@/lib/relayOptimization';
import { useCashuRelayStore } from '@/stores/cashuRelayStore';
import { useLocation } from 'react-router-dom';
import { logRelay } from '@/lib/devLogger';
import { useNostrLogin } from '@nostrify/react/login';
import relayListService, { type RelayListConfig } from '@/services/relayList.service';
import smartRelaySelectionService from '@/services/smartRelaySelection.service';
import { relayHealthMonitor } from '@/services/relayHealthMonitor';
import { connectionPoolManager } from '@/services/connectionPoolManager';
import { queryStrategyManager, type QueryType } from '@/services/queryStrategyManager';
import { simplePool, getSimplePoolRelays, CASHU_RELAY } from '@/lib/simplePool';

interface NostrProviderProps {
  children: React.ReactNode;
}

interface RelayConnectionState {
  [relayUrl: string]: 'connecting' | 'connected' | 'failed';
}

interface NostrConnectionContextValue {
  connectionState: RelayConnectionState;
  isAnyRelayConnected: boolean;
  areAllRelaysConnected: boolean;
  connectedRelayCount: number;
  totalRelayCount: number;
  activeRelays: string[];
  relayContext: RelayContext;
  userRelayList: RelayListConfig | null;
  refreshUserRelayList: (forceRefresh?: boolean) => Promise<void>;
  // Phase 2: Connection optimization
  getOptimalRelaysForQuery: (queryType: QueryType, limit?: number) => string[];
  getRelayHealth: (relayUrl: string) => { score: number; status: 'healthy' | 'degraded' | 'unhealthy' } | null;
  getConnectionStats: () => { pool: any; health: any };
  // Phase 1: Dual-pool architecture
  simplePool: any; // SimplePool type mismatch between nostr-tools versions
  simplePoolRelays: string[];
}

const NostrConnectionContext = createContext<NostrConnectionContextValue>({
  connectionState: {},
  isAnyRelayConnected: false,
  areAllRelaysConnected: false,
  connectedRelayCount: 0,
  totalRelayCount: 0,
  activeRelays: [],
  relayContext: 'all',
  userRelayList: null,
  refreshUserRelayList: async () => {},
  getOptimalRelaysForQuery: () => [],
  getRelayHealth: () => null,
  getConnectionStats: () => ({ pool: {}, health: {} }),
  simplePool,
  simplePoolRelays: [],
});

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays: _presetRelays } = useAppContext();
  const queryClient = useQueryClient();
  const cashuRelayStore = useCashuRelayStore();
  const location = useLocation(); // Add location for route-based decisions
  const { logins } = useNostrLogin(); // Get authentication state

  // Track relay connection states
  const [connectionState, setConnectionState] = useState<RelayConnectionState>({});
  
  // Track user's NIP-65 relay list
  const [userRelayList, setUserRelayList] = useState<RelayListConfig | null>(null);

  // Track connection summary for bundled logging
  const connectionSummary = useRef<{
    connecting: string[];
    connected: string[];
    failed: string[];
    hasLoggedSummary: boolean;
  }>({
    connecting: [],
    connected: [],
    failed: [],
    hasLoggedSummary: false,
  });

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Function to refresh user's relay list
  const refreshUserRelayList = useCallback(async (forceRefresh: boolean = false) => {
    const currentUser = logins[0]; // Get the first logged in user
    if (!currentUser || !pool.current) return;

    try {
      const relayList = await relayListService.getUserRelayList(currentUser.pubkey, pool.current, forceRefresh);
      setUserRelayList(relayList);
      
      if (import.meta.env.DEV) {
        logRelay('info', `Updated user relay list: ${relayList.read.length} read, ${relayList.write.length} write`);
      }
    } catch (error) {
      console.warn('Failed to refresh user relay list:', error);
    }
  }, [logins]);

  // Load user relay list when user logs in
  useEffect(() => {
    if (logins.length > 0 && pool.current) {
      refreshUserRelayList();
    } else {
      setUserRelayList(null);
    }
  }, [logins.length, refreshUserRelayList]);

  // Get active relays based on context - with Cashu relay integration
  const relayContext = config.relayContext || 'all';
  const getActiveRelays = useCallback(() => {
    // Check if user is logged in
    const isLoggedIn = logins.length > 0;

    // For public routes, always allow relay connections
    const isPublicRoute = location.pathname === '/' || location.pathname === '/global' || location.pathname === '/about';

    // Only connect to relays if:
    // 1. It's a public route, OR
    // 2. User is logged in
    if (!isPublicRoute && !isLoggedIn) {
      if (import.meta.env.DEV) {
        logRelay('debug', 'No relays activated: not viewing public content and not logged in');
      }
      return [];
    }

    if (relayContext === 'cashu-only' || relayContext === 'settings-cashu') {
      // Use the active Cashu relay from the store instead of hardcoded relay
      const cashuRelay = cashuRelayStore.activeRelay;
      if (import.meta.env.DEV) {
        logRelay('debug', `Using Cashu relay for ${relayContext} context: ${cashuRelay}`);
      }
      return [cashuRelay];
    }
    
    // If user is logged in and has a NIP-65 relay list, use it instead of config.relayUrls
    let relaysToUse = config.relayUrls;
    if (isLoggedIn && userRelayList) {
      // Combine read and write relays from NIP-65, remove duplicates
      const userRelays = new Set([...userRelayList.read, ...userRelayList.write]);
      if (userRelays.size > 0) {
        relaysToUse = Array.from(userRelays);
        if (import.meta.env.DEV) {
          logRelay('debug', `Using user's NIP-65 relay list: ${relaysToUse.length} relays (${userRelayList.read.length} read, ${userRelayList.write.length} write)`);
        }
      }
    }
    
    const optimalRelays = getOptimalRelays(relayContext, relaysToUse);
    if (import.meta.env.DEV) {
      logRelay('debug', `Using optimal relays for ${relayContext} context: ${optimalRelays.length} relays`);
    }
    return optimalRelays;
  }, [relayContext, config.relayUrls, cashuRelayStore.activeRelay, location.pathname, logins.length, userRelayList]);

  const activeRelays = getActiveRelays();

  // Use refs so the pool always has the latest data
  const relayUrls = useRef<string[]>(activeRelays);

  // Phase 2: Initialize health monitoring and connection pooling
  useEffect(() => {
    // Set the active relays provider so health monitoring only checks currently active relays
    relayHealthMonitor.setActiveRelaysProvider(() => getActiveRelays());

    // Services start automatically, just initialize metrics for active relays
    activeRelays.forEach(url => {
      if (!relayHealthMonitor.getMetrics(url)) {
        // Initialize metrics for new relays
        relayHealthMonitor.onSuccess(url, 0); // Initialize with neutral latency
      }
    });

    return () => {
      // Cleanup when component unmounts
      relayHealthMonitor.destroy();
      connectionPoolManager.destroy();
    };
  }, [getActiveRelays]);

  // Phase 2: Update health monitoring when active relays change
  useEffect(() => {
    // Track health for new relays
    activeRelays.forEach(url => {
      if (!relayHealthMonitor.getMetrics(url)) {
        relayHealthMonitor.onSuccess(url, 0);
      }
    });
  }, [activeRelays]);

  // Calculate connection stats - only count relays that are currently active
  const connectedRelayCount = activeRelays.filter(url => connectionState[url] === 'connected').length;
  const totalRelayCount = activeRelays.length;
  const isAnyRelayConnected = connectedRelayCount > 0;
  const areAllRelaysConnected = connectedRelayCount === totalRelayCount && totalRelayCount > 0;

  // Log connection summary once all attempts are complete
  const logConnectionSummary = useCallback(() => {
    const { connecting, connected, failed } = connectionSummary.current;
    const totalAttempted = connecting.length;

    if (totalAttempted === 0 || connectionSummary.current.hasLoggedSummary) return;

    // Check if we have results for all connection attempts
    const totalResults = connected.length + failed.length;
    if (totalResults < totalAttempted) return; // Still waiting for some results

    // Filter connected/failed to only include currently active relays
    const currentlyActiveConnected = connected.filter(url => activeRelays.includes(url));
    const currentlyActiveFailed = failed.filter(url => activeRelays.includes(url));

    if (currentlyActiveConnected.length > 0) {
      logRelay('info', `Connected to ${currentlyActiveConnected.length}/${activeRelays.length} relays`,
        currentlyActiveConnected.map(url => new URL(url).hostname).join(', '));
    }

    if (currentlyActiveFailed.length > 0) {
      logRelay('warn', `Failed to connect to ${currentlyActiveFailed.length} relays`,
        currentlyActiveFailed.map(url => new URL(url).hostname).join(', '));
    }

    connectionSummary.current.hasLoggedSummary = true;
  }, [activeRelays]);

  // Update refs and connection state when config changes
  useEffect(() => {
    const newActiveRelays = getActiveRelays();
    relayUrls.current = newActiveRelays;

    // Initialize connection state for active relays, preserving existing connections
    const newConnectionState: RelayConnectionState = {};
    const alreadyConnected: string[] = [];
    const alreadyFailed: string[] = [];
    const stillConnecting: string[] = [];

    // Debug: Log current connection state
    if (import.meta.env.DEV) {
      logRelay('debug', `Current connection state:`, connectionState);
    }

    newActiveRelays.forEach(url => {
      // Preserve existing connection state if the relay is still active
      const existingState = connectionState[url];
      logRelay('debug', `Relay ${url}: existing state = ${existingState || 'undefined'}`);
      if (existingState === 'connected') {
        newConnectionState[url] = existingState;
        alreadyConnected.push(url);
      } else if (existingState === 'failed') {
        newConnectionState[url] = existingState;
        alreadyFailed.push(url);
      } else {
        newConnectionState[url] = 'connecting';
        stillConnecting.push(url);
      }
    });

    // Reset connection summary for new relay set, accounting for existing connections
    connectionSummary.current = {
      connecting: [...newActiveRelays], // All relays that were attempted
      connected: alreadyConnected,
      failed: alreadyFailed,
      hasLoggedSummary: false,
    };

    // Only update connection state if we have active relays
    // This preserves connection state when switching to 'none' context
    if (newActiveRelays.length > 0) {
      setConnectionState(newConnectionState);
    }

    if (import.meta.env.DEV) {
      if (newActiveRelays.length > 0) {
        logRelay('info', `Switching to ${relayContext} context with ${newActiveRelays.length} relays`);
        if (alreadyConnected.length > 0) {
          logRelay('info', `Already connected to ${alreadyConnected.length} relays: ${alreadyConnected.join(', ')}`);
        }
        if (stillConnecting.length > 0) {
          logRelay('info', `Still connecting to ${stillConnecting.length} relays: ${stillConnecting.join(', ')}`);
        }
        if (alreadyFailed.length > 0) {
          logRelay('warn', `Previously failed connections: ${alreadyFailed.join(', ')}`);
        }
      } else {
        logRelay('info', `Switching to ${relayContext} context with no relays`);
      }
    }

    // Only reset queries if we're switching to a context that needs fresh data
    if (relayContext === 'wallet' || relayContext === 'cashu-only') {
      queryClient.resetQueries({ queryKey: ['cashu'] });
    } else if (relayContext === 'feed') {
      queryClient.resetQueries({ queryKey: ['posts'] });
      queryClient.resetQueries({ queryKey: ['events'] });
    }
    // Don't reset queries for 'none' context or minor changes

    // Trigger relay connections when context changes
    if (pool.current && newActiveRelays.length > 0) {
      // Use a simple subscription to trigger relay connections
      setTimeout(() => {
        if (pool.current && relayUrls.current.length > 0) {
          // Create a minimal subscription that will trigger connections
          const controller = new AbortController();

          // Start a query with immediate timeout to just trigger connections
          (async () => {
            try {
              const iter = pool.current!.req([{ kinds: [1], limit: 1 }], {
                signal: controller.signal
              });

              // Take one result to trigger connections, then abort
              const iterator = iter[Symbol.asyncIterator]();
              setTimeout(() => controller.abort(), 50); // Quick abort
              await iterator.next().catch(() => {}); // Ignore errors
            } catch (error) {
              // Ignore all errors - this is just to trigger connections
            }
          })();
        }
      }, 10);
    }
  }, [relayContext, config.relayUrls, cashuRelayStore.activeRelay, queryClient, logins.length]);

  // Initialize NPool only once with Priority 2 enhancements
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        // Set initial connecting state
        setConnectionState(prev => ({ ...prev, [url]: 'connecting' }));

        const relay = new NRelay1(url);

        // Monitor connection status with bundled logging
        let hasLogged = false;
        const cleanupTimeouts: NodeJS.Timeout[] = [];
        
        const checkConnection = () => {
          if (relay.socket && !hasLogged) {
            if (relay.socket.readyState === 1) {
              // Success - add to connected list (avoid duplicates)
              setConnectionState(prev => ({ ...prev, [url]: 'connected' }));
              if (!connectionSummary.current.connected.includes(url)) {
                connectionSummary.current.connected.push(url);
              }
              hasLogged = true;

              // Try to log summary after a delay to collect other connections
              const summaryTimeout = setTimeout(logConnectionSummary, 500);
              cleanupTimeouts.push(summaryTimeout);
            } else if (relay.socket.readyState === 3) {
              // Failed - add to failed list (avoid duplicates)
              setConnectionState(prev => ({ ...prev, [url]: 'failed' }));
              if (!connectionSummary.current.failed.includes(url)) {
                connectionSummary.current.failed.push(url);
              }
              hasLogged = true;

              // Try to log summary after a delay to collect other connections
              const summaryTimeout = setTimeout(logConnectionSummary, 500);
              cleanupTimeouts.push(summaryTimeout);
            }
          }
        };

        // Check connection status after delays
        const timeout1 = setTimeout(checkConnection, 1000);
        const timeout2 = setTimeout(checkConnection, 3000);
        const timeout3 = setTimeout(checkConnection, 5000);
        cleanupTimeouts.push(timeout1, timeout2, timeout3);

        // Store cleanup function on relay for later use
        (relay as any)._cleanup = () => {
          cleanupTimeouts.forEach(timeout => clearTimeout(timeout));
        };

        return relay;
      },
      reqRouter(filters) {
        // Use smart relay selection for optimal request distribution
        const relayMap = new Map<string, typeof filters>();
        
        // For now, use basic relay distribution while Priority 2 services are integrated
        // TODO: Integrate smart relay selection when filter analysis is implemented
        for (const relayUrl of relayUrls.current) {
          relayMap.set(relayUrl, filters);
        }
        
        return relayMap;
      },
      eventRouter(event: NostrEvent) {
        // For now, publish to all configured relays
        // TODO: Use smart relay selection for event publishing
        return [...relayUrls.current];
      },
    });
  }

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up timers in all relays
      if (pool.current) {
        // Access the private relays Map from NPool
        const relays = (pool.current as any)._relays;
        if (relays && relays instanceof Map) {
          for (const relay of relays.values()) {
            if (relay._cleanup) {
              relay._cleanup();
            }
          }
        }
      }
    };
  }, []);

  // Phase 2: Connection optimization methods
  const getOptimalRelaysForQuery = useCallback((queryType: QueryType, limit?: number) => {
    const options = limit ? { relayCount: limit } : {};
    return queryStrategyManager.selectRelays(activeRelays, queryType, options);
  }, [activeRelays]);

  const getRelayHealth = useCallback((relayUrl: string) => {
    const metrics = relayHealthMonitor.getMetrics(relayUrl);
    if (!metrics) return null;

    // Use existing healthScore from metrics or calculate basic score
    const score = metrics.healthScore;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (score >= 0.7) status = 'healthy';
    else if (score >= 0.4) status = 'degraded';
    else status = 'unhealthy';

    return { score, status };
  }, []);

  const getConnectionStats = useCallback(() => {
    return {
      pool: connectionPoolManager.getStats(),
      health: {
        healthy: relayHealthMonitor.getHealthyRelays().length,
        unhealthy: relayHealthMonitor.getUnhealthyRelays().length,
        total: relayHealthMonitor.getAllMetrics().size,
      },
    };
  }, []);

  return (
    <NostrConnectionContext.Provider value={{
      connectionState,
      isAnyRelayConnected,
      areAllRelaysConnected,
      connectedRelayCount,
      totalRelayCount,
      activeRelays,
      relayContext,
      userRelayList,
      refreshUserRelayList,
      getOptimalRelaysForQuery,
      getRelayHealth,
      getConnectionStats,
      simplePool,
      simplePoolRelays: getSimplePoolRelays(activeRelays),
    }}>
      <NostrContext.Provider value={{ nostr: pool.current }}>
        {children}
      </NostrContext.Provider>
    </NostrConnectionContext.Provider>
  );
};

// Hook to access relay connection state
export const useNostrConnectionState = () => {
  const context = useContext(NostrConnectionContext);
  if (!context) {
    throw new Error('useNostrConnectionState must be used within a NostrProvider');
  }
  return context;
};
export const useNostrConnection = () => {
  return useContext(NostrConnectionContext);
};

export default NostrProvider;