import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { getOptimalRelays, type RelayContext } from '@/lib/relayOptimization';

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

  // Get active relays based on context
  const relayContext = config.relayContext || 'all';
  const activeRelays = getOptimalRelays(relayContext, config.relayUrls);

  // Use refs so the pool always has the latest data
  const relayUrls = useRef<string[]>(activeRelays);

  // Calculate connection stats
  const connectedRelayCount = Object.values(connectionState).filter(state => state === 'connected').length;
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
    
    if (connected.length > 0) {
      if (import.meta.env.DEV) {
      console.log(`✅ [NostrProvider] Connected to ${connected.length}/${totalAttempted} relays: ${connected.map(url => new URL(url).hostname).join(', ')}`);
      }
    }
    
    if (failed.length > 0) {
      console.warn(`❌ [NostrProvider] Failed to connect to ${failed.length} relays: ${failed.map(url => new URL(url).hostname).join(', ')}`);
    }
    
    connectionSummary.current.hasLoggedSummary = true;
  }, []);

  // Update refs and connection state when config changes
  useEffect(() => {
    const newActiveRelays = getOptimalRelays(relayContext, config.relayUrls);
    relayUrls.current = newActiveRelays;
    
    // Reset connection summary for new relay set
    connectionSummary.current = {
      connecting: [...newActiveRelays],
      connected: [],
      failed: [],
      hasLoggedSummary: false,
    };
    
    // Initialize connection state for active relays only
    const newConnectionState: RelayConnectionState = {};
    newActiveRelays.forEach(url => {
      newConnectionState[url] = 'connecting';
    });
    setConnectionState(newConnectionState);
    
    if (import.meta.env.DEV) {
      if (newActiveRelays.length > 0) {
        if (import.meta.env.DEV) {
        console.log(`[NostrProvider] Switching to ${relayContext} context with ${newActiveRelays.length} relays`);
        }
      } else {
        if (import.meta.env.DEV) {
        console.log(`[NostrProvider] Switching to ${relayContext} context with no relays`);
        }
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
  }, [config.relayUrls, relayContext, queryClient]);

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
              // Success - add to connected list
              setConnectionState(prev => ({ ...prev, [url]: 'connected' }));
              connectionSummary.current.connected.push(url);
              hasLogged = true;
              
              // Try to log summary after a delay to collect other connections
              setTimeout(logConnectionSummary, 500);
            } else if (relay.socket.readyState === 3) {
              // Failed - add to failed list
              setConnectionState(prev => ({ ...prev, [url]: 'failed' }));
              connectionSummary.current.failed.push(url);
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