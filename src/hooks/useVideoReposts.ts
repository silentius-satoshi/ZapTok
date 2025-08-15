import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export function useVideoReposts(videoId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['video-reposts', videoId],
    queryFn: async () => {
      if (!videoId) {
        return { count: 0, reposts: [] };
      }

      const signal = AbortSignal.timeout(3000);
      
      // Query for repost events that reference this video
      const repostEvents = await nostr.query([
        {
          kinds: [6, 16], // Regular and generic reposts
          '#e': [videoId],
          limit: 500,
        }
      ], { signal });

      // Deduplicate by user (one repost per user)
      const uniqueReposts = new Map();
      repostEvents.forEach(repost => {
        const existing = uniqueReposts.get(repost.pubkey);
        if (!existing || repost.created_at > existing.created_at) {
          uniqueReposts.set(repost.pubkey, repost);
        }
      });

      const reposts = Array.from(uniqueReposts.values());

      return {
        count: reposts.length,
        reposts,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute for live updates
    enabled: !!videoId,
  });
}
