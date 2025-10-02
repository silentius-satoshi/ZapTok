import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { relayRateLimiter } from '@/lib/relayRateLimiter';
import { validateVideoEvent, hasVideoContent, normalizeVideoUrl, type VideoEvent } from '@/lib/validateVideoEvent';
import { bundleLog } from '@/lib/logBundler';
import { useVideoCache } from '@/hooks/useVideoCache';
import { useFollowing } from '@/hooks/useFollowing';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { NostrEvent } from '@nostrify/nostrify';

export function useOptimizedGlobalVideoFeed() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
  const { cacheVideoMetadata } = useVideoCache();

  return useInfiniteQuery({
    queryKey: ['optimized-global-video-feed'],
    queryFn: async ({ pageParam, signal }) => {
      bundleLog('globalVideoFetch', '🌍 Fetching global video content with rate limiting');

      // Use rate-limited query instead of direct nostr.query
      // Use a generic relay identifier for global queries
      const events = await relayRateLimiter.queueQuery(
        'global-relay-pool',
        () => nostr.query([
          {
            kinds: [21, 22], // NIP-71 normal videos, NIP-71 short videos
            limit: 15, // Reduced batch size for better rate limiting
            until: pageParam,
          }
        ], { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) }),
        'medium'
      );

      bundleLog('globalVideoProcessing', `🌍 Found ${events.length} global video events`);

      // Filter out videos from users we're already following to avoid duplicates
      const followedPubkeys = new Set(following.data?.pubkeys || []);
      const unfollowedEvents = events.filter(event => !followedPubkeys.has(event.pubkey));

      bundleLog('globalVideoFiltering', `🌍 Filtered to ${unfollowedEvents.length} videos from unfollowed users (${events.length} → ${unfollowedEvents.length})`);

      // Filter and validate video events
      const uniqueEvents = new Map<string, NostrEvent>();
      const seenVideoUrls = new Set<string>();

      unfollowedEvents.forEach(event => {
        if (!hasVideoContent(event)) return;

        // Log what types of video events we're finding
        if (event.kind === 21) {
          bundleLog('nipVideoEvents', `🌍📹 Found NIP-71 normal video event: ${event.content.substring(0, 50)}`);
        } else if (event.kind === 22) {
          bundleLog('nipVideoEvents', `🌍📱 Found NIP-71 short video event: ${event.content.substring(0, 50)}`);
        }

        // Only keep the latest version of each event ID
        const existing = uniqueEvents.get(event.id);
        if (existing && event.created_at <= existing.created_at) return;

        uniqueEvents.set(event.id, event);
      });

      // Validate events and deduplicate by video URL
      const validatedEvents: VideoEvent[] = [];

      for (const event of uniqueEvents.values()) {
        const videoEvent = validateVideoEvent(event);
        if (!videoEvent || !videoEvent.videoUrl) continue;

        bundleLog('validVideoEvents', `🌍✅ Valid global video event [kind ${event.kind}]: ${videoEvent.title || 'No title'}`);

        // Normalize URL for comparison
        const normalizedUrl = normalizeVideoUrl(videoEvent.videoUrl);
        if (seenVideoUrls.has(normalizedUrl)) continue;

        seenVideoUrls.add(normalizedUrl);
        validatedEvents.push(videoEvent);
      }

      // Sort by creation time (most recent first)
      const videoEvents = validatedEvents.sort((a, b) => b.created_at - a.created_at);

      if (videoEvents.length > 0) {
        cacheVideoMetadata(videoEvents);
      }

      bundleLog('globalVideoBatch', `⚡ Processed ${videoEvents.length} global videos in current batch`);
      return videoEvents;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      const oldestEvent = lastPage[lastPage.length - 1];
      return oldestEvent.created_at;
    },
    initialPageParam: undefined as number | undefined,
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: false,
  });
}