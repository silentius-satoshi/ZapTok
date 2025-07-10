import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

export function useAuthors(pubkeys: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['authors', pubkeys.sort()],
    queryFn: async (c) => {
      if (!pubkeys.length) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Query for metadata events (kind 0) for all pubkeys
      const events = await nostr.query([
        {
          kinds: [0],
          authors: pubkeys,
          limit: pubkeys.length,
        }
      ], { signal });

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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
