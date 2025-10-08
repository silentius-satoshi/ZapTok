import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { relayRateLimiter } from '@/lib/relayRateLimiter';
import { validateVideoEvent, hasVideoContent, normalizeVideoUrl, type VideoEvent } from '@/lib/validateVideoEvent';
import { bundleLog } from '@/lib/logBundler';
import { useVideoCache } from '@/hooks/useVideoCache';
import { useFollowing } from '@/hooks/useFollowing';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { NostrEvent } from '@nostrify/nostrify';
import { useState, useEffect, useCallback, useRef } from 'react';

// Import analytics services for feed-level prefetching
import { videoCommentsService } from '@/services/videoComments.service';
import { videoRepostsService } from '@/services/videoReposts.service';
import { videoNutzapsService } from '@/services/videoNutzaps.service';
import videoReactionsService from '@/services/videoReactions.service';

export function useOptimizedGlobalVideoFeed() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
  const { cacheVideoMetadata } = useVideoCache();

  // Real-time state management
  const [newVideos, setNewVideos] = useState<VideoEvent[]>([]);

  const query = useInfiniteQuery({
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
            limit: 30, // Increased batch size for more content availability
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

        // ✅ Feed-level prefetching: Load all analytics for videos in this batch
        const videoIds = videoEvents.map(v => v.id);
        console.log(`[GlobalFeed] 🚀 Triggering feed-level prefetch for ${videoIds.length} videos`);

        // Prefetch all analytics in parallel (fire-and-forget)
        Promise.all([
          videoCommentsService.prefetchComments(videoIds),
          videoRepostsService.prefetchReposts(videoIds),
          videoNutzapsService.prefetchNutzaps(videoIds),
          videoReactionsService.prefetchReactions(videoIds),
        ]).catch(error => {
          console.error('[GlobalFeed] Failed to prefetch video analytics:', error);
        });
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

  // Real-time subscription for new events using NPool
  useEffect(() => {
    const abortController = new AbortController();
    let eosedAt: number | null = null;

    const processEvents = async () => {
      try {
        const events = nostr.req([
          {
            kinds: [21, 22],
            since: Math.floor(Date.now() / 1000), // Only future events
          }
        ], { signal: abortController.signal });

        for await (const msg of events) {
          if (msg[0] === 'EVENT') {
            const event = msg[2] as NostrEvent;

            if (!eosedAt) {
              // Still collecting initial events, skip
              continue;
            }

            // Only process events created after EOSE
            if (event.created_at <= eosedAt) continue;

            // Validate video event
            const videoEvent = validateVideoEvent(event);
            if (!videoEvent || !videoEvent.videoUrl) continue;

            // Filter out followed users
            const followedPubkeys = new Set(following.data?.pubkeys || []);
            if (followedPubkeys.has(event.pubkey)) continue;

            bundleLog('globalVideoRealTime', `🌍⚡ New video event received: ${videoEvent.id.slice(0, 8)}`);

            setNewVideos(prev => {
              // Check if event already exists in buffer
              const exists = prev.some(v => v.id === videoEvent.id);
              if (exists) return prev;

              // Note: We don't check query.data here to avoid dependency issues
              // The deduplication will happen when merging new videos
              
              // Check for duplicate video URLs in the buffer
              if (videoEvent.videoUrl) {
                const normalizedUrl = normalizeVideoUrl(videoEvent.videoUrl);
                const urlExistsInNew = prev.some(v =>
                  v.videoUrl && normalizeVideoUrl(v.videoUrl) === normalizedUrl
                );
                
                if (urlExistsInNew) return prev;
              }

              // Add to new videos buffer (limit to 50)
              return [videoEvent, ...prev]
                .sort((a, b) => b.created_at - a.created_at)
                .slice(0, 50);
            });
          } else if (msg[0] === 'EOSE') {
            // Mark EOSE timestamp
            if (!eosedAt) {
              eosedAt = Date.now() / 1000;
              bundleLog('globalVideoRealTime', '🌍✅ Real-time subscription EOSE reached');
            }
          }
        }
      } catch (error) {
        // Ignore abort errors (normal cleanup)
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('[globalVideoRealTime] Subscription error:', error);
      }
    };

    processEvents();

    // Cleanup on unmount
    return () => {
      abortController.abort();
    };
  }, [nostr, following.data?.pubkeys]); // Removed query.data dependency to prevent infinite loop

  // Merge new videos into main feed
  const mergeNewVideos = useCallback(() => {
    if (newVideos.length === 0) return;

    bundleLog('globalVideoMerge', `🌍🔄 Merging ${newVideos.length} new videos into feed`);

    // Trigger refetch to get fresh data
    query.refetch();

    // Clear new videos buffer
    setNewVideos([]);
  }, [newVideos.length, query]);

  return {
    ...query,
    newVideosCount: newVideos.length,
    newVideos,
    mergeNewVideos,
  };
}