import { useSyncExternalStore, useEffect } from 'react';
import { videoCommentsService } from '@/services/videoComments.service';

// Re-export VideoComments type for backward compatibility
export type { VideoComments } from '@/services/videoComments.service';

/**
 * Hook to get video comments using Jumble's service + useSyncExternalStore pattern
 * This implementation uses DataLoader batching to reduce concurrent queries
 * 
 * Note: Service must be initialized at feed level using useInitializeAnalyticsServices()
 * This hook only subscribes to the service and loads data - it does NOT initialize.
 */
export function useVideoComments(videoId: string) {
  // Subscribe to comment updates using useSyncExternalStore (Jumble's pattern)
  const comments = useSyncExternalStore(
    (callback) => videoCommentsService.subscribe(callback),
    () => videoCommentsService.getSnapshot(videoId)
  );

  // Load comments on mount if not cached
  useEffect(() => {
    if (videoId) {
      videoCommentsService.getComments(videoId).catch((error) => {
        console.error('Failed to load comments for video:', videoId, error);
      });
    }
  }, [videoId]); // Don't depend on comments - service handles caching/deduplication

  // Return comments or default empty state
  return comments || {
    comments: [],
    commentCount: 0,
  };
}