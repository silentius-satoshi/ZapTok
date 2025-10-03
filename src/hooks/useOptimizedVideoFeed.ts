import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSimplePool } from '@/hooks/useSimplePool';
import { validateVideoEvent, type VideoEvent } from '@/lib/validateVideoEvent';
import { relayRateLimiter, QueryDeduplicator } from '@/lib/relayRateLimiter';
import { useBatchedVideoQuery } from '@/hooks/useBatchedVideoQuery';
import { useNostrConnectionState } from '@/components/NostrProvider';
import { createConnectionAwareSignal } from '@/lib/queryOptimization';
import { bundleLog } from '@/lib/logBundler';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollowing } from '@/hooks/useFollowing';
import type { NostrEvent } from '@nostrify/nostrify';

interface OptimizedFeedPage {
  videos: VideoEvent[];
  hasMore: boolean;
  nextCursor?: number;
  metadata: {
    queryTime: number;
    totalResults: number;
    relaysUsed: number;
  };
}

/**
 * Optimized feed hook with pagination, rate limiting, and smart caching
 * Replaces the original feed implementation with relay-friendly batching
 */
export function useOptimizedGlobalVideoFeed(options: {
  pageSize?: number;
  enableIntersectionLoading?: boolean;
  maxPages?: number;
  cacheDuration?: number;
} = {}) {
  const { simplePool, simplePoolRelays } = useSimplePool();
  const { getOptimalRelaysForQuery } = useNostrConnectionState();
  const queryClient = useQueryClient();

  const {
    pageSize = 10, // Smaller page size to reduce relay load
    enableIntersectionLoading = true,
    maxPages = 10, // Prevent infinite loading
    cacheDuration = 5 * 60 * 1000, // 5 minutes
  } = options;

  return useInfiniteQuery({
    queryKey: ['optimized-global-video-feed', { pageSize }],
    queryFn: async ({ pageParam, signal }): Promise<OptimizedFeedPage> => {
      const startTime = Date.now();
      
      // Connection-aware signal with longer timeout for global queries
      const connectionSignal = createConnectionAwareSignal({
        availableRelays: getOptimalRelaysForQuery('events', 3),
        queryType: 'events',
        baseTimeout: 10000, // Longer timeout for global queries
      }, signal);

      // Use query deduplication to avoid duplicate requests
      const queryKey = `global-feed-${pageParam || 'initial'}-${pageSize}`;
      
      const events = await QueryDeduplicator.dedupe(queryKey, async () => {
        // Rate-limited global video query
        return await relayRateLimiter.queueQuery(
          'global-video-feed',
          async () => {
            const filter = {
              kinds: [21, 22], // NIP-71 video events
              limit: pageSize,
              ...(pageParam && { until: pageParam }),
            };

            const events = simplePool.querySync(simplePoolRelays, filter);
            
            bundleLog('globalVideoFetch', '🌍 Fetching global video content');
            return events;
          },
          'high' // High priority for visible content
        );
      }) as NostrEvent[];

      // Filter and validate events
      const validEvents = events.filter(validateVideoEvent) as VideoEvent[];
      
      // Sort by creation time
      const sortedVideos = validEvents.sort((a, b) => b.created_at - a.created_at);
      
      const queryTime = Date.now() - startTime;
      const hasMore = sortedVideos.length === pageSize && sortedVideos.length > 0;
      const nextCursor = hasMore ? sortedVideos[sortedVideos.length - 1].created_at : undefined;

      bundleLog('globalVideoProcessing', `🌍 Found ${sortedVideos.length} global video events`);

      return {
        videos: sortedVideos,
        hasMore,
        nextCursor,
        metadata: {
          queryTime,
          totalResults: sortedVideos.length,
          relaysUsed: 3, // Based on our query strategy
        },
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: undefined as number | undefined,
    enabled: true,
    staleTime: cacheDuration,
    gcTime: cacheDuration * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    maxPages, // Prevent infinite loading
    retry: (failureCount, error) => {
      // Don't retry rate limit errors
      if (error.message.includes('too many')) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Optimized following feed with smart author batching
 */
export function useOptimizedFollowingVideoFeed(options: {
  pageSize?: number;
  maxAuthors?: number;
  cacheDuration?: number;
} = {}) {
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
  const { simplePool, simplePoolRelays } = useSimplePool();
  const { getOptimalRelaysForQuery } = useNostrConnectionState();

  const {
    pageSize = 15, // Slightly larger for following feed
    maxAuthors = 50, // Limit authors to prevent huge queries
    cacheDuration = 3 * 60 * 1000, // Shorter cache for fresher content
  } = options;

  return useInfiniteQuery({
    queryKey: ['optimized-following-feed', following.data?.pubkeys?.slice(0, maxAuthors), { pageSize }],
    queryFn: async ({ pageParam, signal }): Promise<OptimizedFeedPage> => {
      const startTime = Date.now();
      
      if (!following.data?.pubkeys?.length) {
        return {
          videos: [],
          hasMore: false,
          metadata: { queryTime: Date.now() - startTime, totalResults: 0, relaysUsed: 0 },
        };
      }

      const connectionSignal = createConnectionAwareSignal({
        availableRelays: getOptimalRelaysForQuery('events', 3),
        queryType: 'events',
        baseTimeout: 8000,
      }, signal);

      // Limit authors to prevent overwhelming queries
      const limitedAuthors = following.data.pubkeys.slice(0, maxAuthors);
      
      const queryKey = `following-feed-${limitedAuthors.join(',')}-${pageParam || 'initial'}-${pageSize}`;
      
      const events = await QueryDeduplicator.dedupe(queryKey, async () => {
        return await relayRateLimiter.queueQuery(
          'following-feed',
          async () => {
            const filter = {
              kinds: [21, 22],
              authors: limitedAuthors,
              limit: pageSize,
              ...(pageParam && { until: pageParam }),
            };

            return simplePool.querySync(simplePoolRelays, filter);
          },
          'high'
        );
      }) as NostrEvent[];

      // Validate and deduplicate videos
      const validEvents = events.filter(validateVideoEvent) as VideoEvent[];
      const uniqueVideos = new Map<string, VideoEvent>();
      
      validEvents.forEach(video => {
        if (!uniqueVideos.has(video.id) || video.created_at > uniqueVideos.get(video.id)!.created_at) {
          uniqueVideos.set(video.id, video);
        }
      });

      const sortedVideos = Array.from(uniqueVideos.values())
        .sort((a, b) => b.created_at - a.created_at);

      const queryTime = Date.now() - startTime;
      const hasMore = sortedVideos.length === pageSize;
      const nextCursor = hasMore ? sortedVideos[sortedVideos.length - 1].created_at : undefined;

      bundleLog('followingVideoProcessing', `👥 Processed ${sortedVideos.length} following videos from ${limitedAuthors.length} authors`);

      return {
        videos: sortedVideos,
        hasMore,
        nextCursor,
        metadata: {
          queryTime,
          totalResults: sortedVideos.length,
          relaysUsed: 3,
        },
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: undefined as number | undefined,
    enabled: !!following.data?.pubkeys?.length,
    staleTime: cacheDuration,
    gcTime: cacheDuration * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    maxPages: 5, // Limit for following feed
  });
}

/**
 * Lazy loading hook for video engagement data
 * Only loads when video becomes visible or user interacts
 */
export function useVideoEngagementLazy(videoId: string, options: {
  enabled?: boolean;
  priority?: 'high' | 'medium' | 'low';
} = {}) {
  const { enabled = false, priority = 'low' } = options;
  
  return useBatchedVideoQuery(
    { ids: [videoId] },
    {
      limit: 1,
      includeReactions: true,
      includeAuthors: false, // Skip authors for engagement-only data
      priority,
      cacheDuration: 10 * 60 * 1000, // 10 minute cache for engagement
    }
  );
}

/**
 * Intersection Observer hook for triggering lazy loads
 */
export function useVideoIntersection(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  const defaultOptions: IntersectionObserverInit = {
    threshold: 0.1, // Trigger when 10% visible
    rootMargin: '100px', // Preload 100px before becoming visible
    ...options,
  };

  const observer = new IntersectionObserver(callback, defaultOptions);
  
  return {
    observe: (element: Element) => observer.observe(element),
    unobserve: (element: Element) => observer.unobserve(element),
    disconnect: () => observer.disconnect(),
  };
}