import { useSyncExternalStore, useEffect } from 'react';
import videoReactionsService from '@/services/videoReactions.service';

// Re-export VideoReactions type for backward compatibility
export type { VideoReactions } from '@/services/videoReactions.service';

/**
 * Hook to get video reactions using Jumble's service + useSyncExternalStore pattern
 * This implementation uses DataLoader batching to reduce concurrent queries from 14+ to 1-2
 * 
 * Note: Service must be initialized at feed level using useInitializeAnalyticsServices()
 * This hook only subscribes to the service and loads data - it does NOT initialize.
 */
export function useVideoReactions(videoId: string) {
  // Subscribe to reaction updates using useSyncExternalStore (Jumble's pattern)
  const reactions = useSyncExternalStore(
    (callback) => videoReactionsService.subscribeReactions(videoId, callback),
    () => videoReactionsService.getReactions(videoId)
  );

  // Load reactions on mount if not cached
  useEffect(() => {
    if (!reactions && videoId) {
      videoReactionsService.loadReactions(videoId).catch((error) => {
        console.error('Failed to load reactions for video:', videoId, error);
      });
    }
  }, [videoId, reactions]);

  // Return reactions or default empty state
  return reactions || {
    zaps: 0,
    totalSats: 0,
  };
}
