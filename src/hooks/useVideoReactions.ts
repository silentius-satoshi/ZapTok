import { useSyncExternalStore, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import videoReactionsService from '@/services/videoReactions.service';
import { BIG_RELAY_URLS } from '@/constants/relays';

// Re-export VideoReactions type for backward compatibility
export type { VideoReactions } from '@/services/videoReactions.service';

/**
 * Hook to get video reactions using Jumble's service + useSyncExternalStore pattern
 * This implementation uses DataLoader batching to reduce concurrent queries from 14+ to 1-2
 * 
 * Uses BIG_RELAY_URLS (4 major relays) to maximize discovery of analytics data
 */
export function useVideoReactions(videoId: string) {
  const { nostr } = useNostr();

  // Initialize the service with a multi-relay query function
  // Use nostr.group() to query from 4 major relays instead of default single relay
  useEffect(() => {
    const relayGroup = nostr.group([...BIG_RELAY_URLS]);
    videoReactionsService.setNostrQueryFn(relayGroup.query.bind(relayGroup));
  }, [nostr]);

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
