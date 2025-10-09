import { useSyncExternalStore, useEffect } from 'react';
import { videoRepostsService } from '@/services/videoReposts.service';

// Re-export VideoReposts type for backward compatibility
export type { VideoReposts } from '@/services/videoReposts.service';

/**
 * Hook to get video reposts using Jumble's service + useSyncExternalStore pattern
 * This implementation uses DataLoader batching to reduce concurrent queries
 * 
 * Note: Service must be initialized at feed level using useInitializeAnalyticsServices()
 * This hook only subscribes to the service and loads data - it does NOT initialize.
 */
export function useVideoReposts(videoId: string) {
  // Subscribe to repost updates using useSyncExternalStore (Jumble's pattern)
  const reposts = useSyncExternalStore(
    (callback) => videoRepostsService.subscribe(callback),
    () => videoRepostsService.getSnapshot(videoId)
  );

    // Trigger query if not already cached
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
