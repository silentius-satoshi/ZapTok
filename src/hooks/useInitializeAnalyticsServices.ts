import { useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { videoCommentsService } from '@/services/videoComments.service';
import { videoRepostsService } from '@/services/videoReposts.service';
import videoReactionsService from '@/services/videoReactions.service';
import { BIG_RELAY_URLS } from '@/constants/relays';
import { logInfo } from '@/lib/logger';

/**
 * Initialize analytics services with query functions at feed level
 * This enables feed-level prefetching of comments, reposts, and reactions
 * 
 * Must be called ONCE per feed component before any prefetch operations.
 * Services are initialized with BIG_RELAY_URLS (4 major relays) to maximize
 * discovery of analytics data across the network.
 * 
 * Note: Individual analytics hooks (useVideoComments, useVideoReposts, 
 * useVideoReactions) will skip initialization if services are already set up.
 * 
 * @example
 * function GlobalVideoFeed() {
 *   useInitializeAnalyticsServices(); // Initialize once at feed level
 *   // ... rest of feed logic
 * }
 */
export function useInitializeAnalyticsServices() {
  const { nostr } = useNostr();

  useEffect(() => {
    // Create relay group for analytics (BIG_RELAY_URLS = 4 major relays)
    const relayGroup = nostr.group([...BIG_RELAY_URLS]);
    const queryFn = relayGroup.query.bind(relayGroup);

    // Initialize all analytics services with same query function
    videoCommentsService.setNostrQueryFn(queryFn);
    videoRepostsService.setNostrQueryFn(queryFn);
    videoReactionsService.setNostrQueryFn(queryFn);

    logInfo('[Analytics] ✅ Initialized comments, reposts, reactions services for feed-level prefetching');

    // No cleanup needed - services are singletons that persist across feed mounts
    // Query function updates automatically when nostr changes
  }, [nostr]);
}
