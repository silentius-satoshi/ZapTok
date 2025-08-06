import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

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
}

const NostrConnectionContext = createContext<NostrConnectionContextValue>({
  connectionState: {},
  isAnyRelayConnected: false,
  areAllRelaysConnected: false,
  connectedRelayCount: 0,
  totalRelayCount: 0,
});

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays: _presetRelays } = useAppContext();
  const queryClient = useQueryClient();

  // Track relay connection states
  const [connectionState, setConnectionState] = useState<RelayConnectionState>({});

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayUrls = useRef<string[]>(config.relayUrls);

  // Calculate connection stats
  const connectedRelayCount = Object.values(connectionState).filter(state => state === 'connected').length;
  const totalRelayCount = config.relayUrls.length;
  const isAnyRelayConnected = connectedRelayCount > 0;
  const areAllRelaysConnected = connectedRelayCount === totalRelayCount && totalRelayCount > 0;

  // Update refs and connection state when config changes
  useEffect(() => {
    relayUrls.current = config.relayUrls;
    
    // Initialize connection state for all relays
    const newConnectionState: RelayConnectionState = {};
    config.relayUrls.forEach(url => {
      newConnectionState[url] = 'connecting';
    });
    setConnectionState(newConnectionState);
    
    queryClient.resetQueries();
  }, [config.relayUrls, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        console.log(`[NostrProvider] Connecting to relay: ${url}`);
        
        // Set initial connecting state
        setConnectionState(prev => ({ ...prev, [url]: 'connecting' }));
        
        const relay = new NRelay1(url);
        
        // Monitor connection status
        const checkConnection = () => {
          if (relay.socket) {
            if (relay.socket.readyState === 1) {
              console.log(`✅ [NostrProvider] Successfully connected to: ${url}`);
              setConnectionState(prev => ({ ...prev, [url]: 'connected' }));
            } else if (relay.socket.readyState === 3) {
              console.warn(`❌ [NostrProvider] Failed to connect to: ${url}`);
              setConnectionState(prev => ({ ...prev, [url]: 'failed' }));
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