import { useSyncExternalStore, useEffect } from 'react';
import { videoNutzapsService } from '@/services/videoNutzaps.service';

// Re-export VideoNutzaps type for backward compatibility
export type { VideoNutzaps } from '@/services/videoNutzaps.service';

/**
 * Hook to get video nutzaps using Jumble's service + useSyncExternalStore pattern
 * This implementation uses DataLoader batching with a dedicated Cashu relay pool
 * 
 * IMPORTANT: Unlike other video services, this uses a dedicated NPool for Cashu isolation
 * The service creates its own pool internally - no need to pass nostr.query
 */
export function useVideoNutzaps(videoId: string) {
  // Subscribe to nutzap updates using useSyncExternalStore (Jumble's pattern)
  const nutzaps = useSyncExternalStore(
    (callback) => videoNutzapsService.subscribe(callback),
    () => videoNutzapsService.getSnapshot(videoId)
  );

  // Load nutzaps on mount if not cached
  useEffect(() => {
    if (!nutzaps && videoId) {
      videoNutzapsService.getNutzaps(videoId).catch((error) => {
        console.error('Failed to load nutzaps for video:', videoId, error);
      });
    }
  }, [videoId, nutzaps]);

  // Return nutzaps or default empty state
  return nutzaps || {
    totalAmount: 0,
    count: 0,
    nutzaps: [],
  };
}
