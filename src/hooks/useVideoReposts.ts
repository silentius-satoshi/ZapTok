import { useSyncExternalStore, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { videoRepostsService } from '@/services/videoReposts.service';

// Re-export VideoReposts type for backward compatibility
export type { VideoReposts } from '@/services/videoReposts.service';

/**
 * Hook to get video reposts using Jumble's service + useSyncExternalStore pattern
 * This implementation uses DataLoader batching to reduce concurrent queries
 */
export function useVideoReposts(videoId: string) {
  const { nostr } = useNostr();

  // Initialize the service with the Nostr query function
  useEffect(() => {
    videoRepostsService.setNostrQueryFn(nostr.query.bind(nostr));
  }, [nostr]);

  // Subscribe to repost updates using useSyncExternalStore (Jumble's pattern)
  const reposts = useSyncExternalStore(
    (callback) => videoRepostsService.subscribe(callback),
    () => videoRepostsService.getSnapshot(videoId)
  );

  // Load reposts on mount if not cached
  useEffect(() => {
    if (!reposts && videoId) {
      videoRepostsService.getReposts(videoId).catch((error) => {
        console.error('Failed to load reposts for video:', videoId, error);
      });
    }
  }, [videoId, reposts]);

  // Return reposts or default empty state
  return reposts || {
    count: 0,
    reposts: [],
  };
}
