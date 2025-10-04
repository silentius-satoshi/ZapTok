import { useSyncExternalStore, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { videoCommentsService } from '@/services/videoComments.service';

// Re-export VideoComments type for backward compatibility
export type { VideoComments } from '@/services/videoComments.service';

/**
 * Hook to get video comments using Jumble's service + useSyncExternalStore pattern
 * This implementation uses DataLoader batching to reduce concurrent queries
 */
export function useVideoComments(videoId: string) {
  const { nostr } = useNostr();

  // Initialize the service with the Nostr query function
  useEffect(() => {
    videoCommentsService.setNostrQueryFn(nostr.query.bind(nostr));
  }, [nostr]);

  // Subscribe to comment updates using useSyncExternalStore (Jumble's pattern)
  const comments = useSyncExternalStore(
    (callback) => videoCommentsService.subscribe(callback),
    () => videoCommentsService.getSnapshot(videoId)
  );

  // Load comments on mount if not cached
  useEffect(() => {
    if (!comments && videoId) {
      videoCommentsService.getComments(videoId).catch((error) => {
        console.error('Failed to load comments for video:', videoId, error);
      });
    }
  }, [videoId, comments]);

  // Return comments or default empty state
  return comments || {
    comments: [],
    commentCount: 0,
  };
}