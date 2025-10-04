import { useSyncExternalStore, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { videoRepostsService } from '@/services/videoReposts.service';
import { BIG_RELAY_URLS } from '@/constants/relays';

// Re-export VideoReposts type for backward compatibility
export type { VideoReposts } from '@/services/videoReposts.service';

/**
 * Hook to get video reposts using Jumble's service + useSyncExternalStore pattern
 * This implementation uses DataLoader batching to reduce concurrent queries
 * 
 * Uses BIG_RELAY_URLS (4 major relays) to maximize discovery of analytics data
 */
export function useVideoReposts(videoId: string) {
  const { nostr } = useNostr();

  // Initialize the service with a multi-relay query function
  // Use nostr.group() to query from 4 major relays instead of default single relay
  useEffect(() => {
    const relayGroup = nostr.group([...BIG_RELAY_URLS]);
    videoRepostsService.setNostrQueryFn(relayGroup.query.bind(relayGroup));
  }, [nostr]);

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
