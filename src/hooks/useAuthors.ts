import { useQuery } from '@tanstack/react-query';
import { useSimplePool } from '@/hooks/useSimplePool';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNostrConnectionState } from '@/components/NostrProvider';
import { createConnectionAwareSignal } from '@/lib/queryOptimization';

export function useAuthors(pubkeys: string[]) {
  const { simplePool, simplePoolRelays } = useSimplePool();
  const { getOptimalRelaysForQuery } = useNostrConnectionState();

  return useQuery({
    queryKey: ['authors', pubkeys.sort()],
    queryFn: async ({ signal }) => {
      if (!pubkeys.length) return [];

      // Phase 2: Use connection-aware signal with optimal relays for metadata
      const connectionAwareSignal = createConnectionAwareSignal({
        availableRelays: getOptimalRelaysForQuery('profile', 5),
        queryType: 'profile',
        baseTimeout: 8000,
      }, signal);
      
      // Optimized batch query for metadata events (kind 0)
      const events = simplePool.querySync(
        simplePoolRelays,
        {
          kinds: [0],
          authors: pubkeys,
          limit: pubkeys.length * 2, // Allow for multiple metadata events per author
        }
      );

      // Create a map of pubkey -> latest metadata event
      const metadataMap = new Map<string, NostrEvent>();
      
      events.forEach(event => {
        const existing = metadataMap.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          metadataMap.set(event.pubkey, event);
        }
      });

      // Return authors with metadata, preserving order and including missing ones
      return pubkeys.map(pubkey => {
        const metadataEvent = metadataMap.get(pubkey);
        let metadata;
        
        if (metadataEvent) {
          try {
            metadata = JSON.parse(metadataEvent.content);
          } catch {
            metadata = {};
          }
        }

        return {
          pubkey,
          metadata,
          event: metadataEvent,
        };
      });
    },
    enabled: pubkeys.length > 0,
    // Optimized cache configuration for author metadata
    staleTime: 10 * 60 * 1000,    // 10 minutes - metadata changes infrequently
    gcTime: 60 * 60 * 1000,      // 1 hour - keep author data longer
    refetchOnWindowFocus: false,  // Don't refetch metadata on focus
    refetchOnReconnect: false,    // Don't refetch metadata on reconnect (it's stable)
  });
}
