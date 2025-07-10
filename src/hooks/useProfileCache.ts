import { useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCallback } from 'react';
import type { NostrMetadata } from '@nostrify/nostrify';

export function useProfileCache() {
  const queryClient = useQueryClient();
  const { nostr } = useNostr();

  const batchLoadProfiles = useCallback(async (pubkeys: string[]) => {
    if (!pubkeys.length) return;

    // Filter out already cached profiles
    const uncachedPubkeys = pubkeys.filter(pk => 
      !queryClient.getQueryData(['profile', pk])
    );
    
    if (uncachedPubkeys.length === 0) return;

    try {
      const signal = AbortSignal.timeout(5000);
      
      // Batch fetch profiles from uncached pubkeys
      const events = await nostr.query([{
        kinds: [0],
        authors: uncachedPubkeys,
        limit: uncachedPubkeys.length,
      }], { signal });

      // Create a map of pubkey -> latest metadata event
      const metadataMap = new Map();
      
      events.forEach(event => {
        const existing = metadataMap.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          metadataMap.set(event.pubkey, event);
        }
      });

      // Cache individual profiles
      uncachedPubkeys.forEach(pubkey => {
        const event = metadataMap.get(pubkey);
        let metadata: NostrMetadata = {};
        
        if (event) {
          try {
            metadata = JSON.parse(event.content);
          } catch {
            metadata = {};
          }
        }

        // Set individual profile cache
        queryClient.setQueryData(['profile', pubkey], {
          metadata,
          event,
        });
      });
    } catch (error) {
      console.error('Failed to batch load profiles:', error);
    }
  }, [queryClient, nostr]);

  return { batchLoadProfiles };
}
