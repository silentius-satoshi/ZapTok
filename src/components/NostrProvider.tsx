import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config, presetRelays } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayUrls = useRef<string[]>(config.relayUrls);

  // Update refs when config changes
  useEffect(() => {
    relayUrls.current = config.relayUrls;
    queryClient.resetQueries();
  }, [config.relayUrls, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        console.log(`[NostrProvider] Connecting to relay: ${url}`);
        const relay = new NRelay1(url);
        
        // Simple connection status check after a delay
        setTimeout(() => {
          if (relay.socket && relay.socket.readyState === 1) {
            console.log(`✅ [NostrProvider] Successfully connected to: ${url}`);
          } else {
            console.warn(`⚠️ [NostrProvider] Connection pending or failed for: ${url}`);
          }
        }, 2000);
        
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
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;