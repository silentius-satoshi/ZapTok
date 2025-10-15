import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { validateVideoEvent, type VideoEvent } from '@/lib/validateVideoEvent';
import { useNostrQuery } from './useNostrQuery';

/**
 * Hook to fetch video events tagged with a specific hashtag
 */
export function useHashtagVideos(tag: string): UseQueryResult<VideoEvent[], Error> {
  const { nostr } = useNostr();
  const { queryDiscovery } = useNostrQuery();

  return useQuery({
    queryKey: ['hashtag-videos', tag],
    queryFn: async ({ signal }) => {
      if (!tag) {
        return [];
      }

      const timeout = AbortSignal.timeout(5000);
      const combinedSignal = AbortSignal.any([signal, timeout]);

      try {
        // Query for video events with this hashtag
        const events = await queryDiscovery([
          {
            kinds: [21, 22], // NIP-71 video events
            '#t': [tag.toLowerCase()], // Hashtags are stored lowercase
            limit: 50,
          },
        ], { signal: combinedSignal });

        // Filter and validate video events
        const videoEvents = events
          .map(validateVideoEvent)
          .filter((event): event is VideoEvent => event !== null)
          .sort((a, b) => b.created_at - a.created_at); // Most recent first

        return videoEvents;
      } catch (error) {
        console.error('useHashtagVideos: Error fetching videos:', error);
        throw error;
      }
    },
    enabled: !!tag,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
