import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { validateVideoEvent } from '@/lib/validateVideoEvent';
import type { VideoEvent } from '@/lib/validateVideoEvent';
import type { NostrEvent } from '@nostrify/nostrify';

export function useRepostedVideos(pubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['user-reposts', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);
      
      console.log('🔁 Fetching reposts for pubkey:', pubkey);
      
      // Query for repost events by this user (kinds 6 and 16)
      const repostEvents = await nostr.query([
        {
          kinds: [6, 16], // Regular and generic reposts
          authors: [pubkey],
          limit: 200,
        }
      ], { signal });

      console.log('🔁 Found repost events:', repostEvents.length);

      if (repostEvents.length === 0) {
        return [];
      }

      // Extract the original event IDs from reposts
      const originalEventIds = repostEvents
        .map(repost => repost.tags.find(tag => tag[0] === 'e')?.[1])
        .filter((id): id is string => Boolean(id));

      console.log('🔁 Original event IDs from reposts:', originalEventIds.length);

      if (originalEventIds.length === 0) {
        return [];
      }

      // Fetch the original events
      const originalEvents = await nostr.query([
        {
          ids: originalEventIds,
        }
      ], { signal });

      console.log('🔁 Found original events:', originalEvents.length);

      // Filter for video events and validate
      const repostedVideoEvents: (VideoEvent & { repostedAt: number })[] = [];
      
      for (const originalEvent of originalEvents) {
        const videoEvent = validateVideoEvent(originalEvent);
        if (videoEvent && videoEvent.videoUrl) {
          // Find the corresponding repost to get the repost timestamp
          const repostEvent = repostEvents.find(repost => 
            repost.tags.some(tag => tag[0] === 'e' && tag[1] === originalEvent.id)
          );
          
          if (repostEvent) {
            repostedVideoEvents.push({
              ...videoEvent,
              repostedAt: repostEvent.created_at,
            });
          }
        }
      }

      console.log('🔁 Valid reposted video events:', repostedVideoEvents.length);

      // Sort by repost time (most recently reposted first)
      return repostedVideoEvents.sort((a, b) => b.repostedAt - a.repostedAt);
    },
    enabled: !!pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
