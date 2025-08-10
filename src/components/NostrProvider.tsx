import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { getOptimalRelays, type RelayContext } from '@/lib/relayOptimization';
import { useCashuRelayStore } from '@/stores/cashuRelayStore';
import { logRelay } from '@/lib/devLogger';

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
}

const NostrConnectionContext = createContext<NostrConnectionContextValue>({
  connectionState: {},
  isAnyRelayConnected: false,
  areAllRelaysConnected: false,
  connectedRelayCount: 0,
  totalRelayCount: 0,
  activeRelays: [],
  relayContext: 'all',
});

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays: _presetRelays } = useAppContext();
  const queryClient = useQueryClient();
  const cashuRelayStore = useCashuRelayStore();

  // Track relay connection states
  const [connectionState, setConnectionState] = useState<RelayConnectionState>({});

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

  // Get active relays based on context - with Cashu relay integration
  const relayContext = config.relayContext || 'all';
  const getActiveRelays = useCallback(() => {
    if (relayContext === 'cashu-only' || relayContext === 'settings-cashu') {
      // Use the active Cashu relay from the store instead of hardcoded relay
      const cashuRelay = cashuRelayStore.activeRelay;
      if (import.meta.env.DEV) {
        logRelay('debug', `Using Cashu relay for ${relayContext} context: ${cashuRelay}`);
      }
      return [cashuRelay];
    }
    const optimalRelays = getOptimalRelays(relayContext, config.relayUrls);
    if (import.meta.env.DEV) {
      logRelay('debug', `Using optimal relays for ${relayContext} context: ${optimalRelays.length} relays`);
    }
    return optimalRelays;
  }, [relayContext, config.relayUrls, cashuRelayStore.activeRelay]);

  const activeRelays = getActiveRelays();

  // Use refs so the pool always has the latest data
  const relayUrls = useRef<string[]>(activeRelays);

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
    if (import.meta.env.DEV) {
      logRelay('debug', `🔄 useEffect triggered: relayContext=${relayContext}, activeRelay=${cashuRelayStore.activeRelay}`);
    }
    
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
  }, [relayContext, config.relayUrls, cashuRelayStore.activeRelay, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        // Set initial connecting state
        setConnectionState(prev => ({ ...prev, [url]: 'connecting' }));
        
        const relay = new NRelay1(url);
        
        // Monitor connection status with bundled logging
        let hasLogged = false;
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
              setTimeout(logConnectionSummary, 500);
            } else if (relay.socket.readyState === 3) {
              // Failed - add to failed list (avoid duplicates)
              setConnectionState(prev => ({ ...prev, [url]: 'failed' }));
              if (!connectionSummary.current.failed.includes(url)) {
                connectionSummary.current.failed.push(url);
              }
              hasLogged = true;
              
              // Try to log summary after a delay to collect other connections
              setTimeout(logConnectionSummary, 500);
            }
          }
        };

        // Check connection status after delays
        setTimeout(checkConnection, 1000);
        setTimeout(checkConnection, 3000);
        setTimeout(checkConnection, 5000);
        
        return relay;
      },
      reqRouter(filters) {
        // Distribute requests across all selected relays
        const relayMap = new Map<string, typeof filters>();
        for (const relayUrl of relayUrls.current) {
          relayMap.set(relayUrl, filters);
        }
        return relayMap;
      },
      eventRouter(_event: NostrEvent) {
        // Publish only to the configured relays - don't auto-add preset relays
        return [...relayUrls.current];
      },
    });
  }

  return (
    <NostrConnectionContext.Provider value={{
      connectionState,
      isAnyRelayConnected,
      areAllRelaysConnected,
      connectedRelayCount,
      totalRelayCount,
      activeRelays,
      relayContext,
    }}>
      <NostrContext.Provider value={{ nostr: pool.current }}>
        {children}
      </NostrContext.Provider>
    </NostrConnectionContext.Provider>
  );
};

// Hook to access relay connection state
export const useNostrConnection = () => {
  return useContext(NostrConnectionContext);
};

export default NostrProvider;