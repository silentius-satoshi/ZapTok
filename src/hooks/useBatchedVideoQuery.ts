import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { validateVideoEvent, type VideoEvent } from '@/lib/validateVideoEvent';
import { relayRateLimiter, QueryDeduplicator } from '@/lib/relayRateLimiter';
import { useNostrConnectionState } from '@/components/NostrProvider';
import { createConnectionAwareSignal } from '@/lib/queryOptimization';
import { bundleLog } from '@/lib/logBundler';
import type { NostrEvent } from '@nostrify/nostrify';

interface BatchedVideoData {
  videos: VideoEvent[];
  authors: Map<string, NostrEvent>;
  reactions: Map<string, NostrEvent[]>;
  metadata: {
    totalQueried: number;
    validVideos: number;
    processingTime: number;
  };
}

/**
 * Batched video query hook that fetches videos, authors, and reactions efficiently
 * Replaces individual queries with smart batching to reduce relay load
 */
export function useBatchedVideoQuery(
  filter: any, 
  options: {
    limit?: number;
    includeReactions?: boolean;
    includeAuthors?: boolean;
    priority?: 'high' | 'medium' | 'low';
    cacheDuration?: number;
  } = {}
) {
  const { nostr } = useNostr();
  const { getOptimalRelaysForQuery } = useNostrConnectionState();
  const queryClient = useQueryClient();

  const {
    limit = 15,
    includeReactions = true,
    includeAuthors = true,
    priority = 'medium',
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
  } = options;

  return useQuery({
    queryKey: ['batched-videos', filter, { limit, includeReactions, includeAuthors }],
    queryFn: async ({ signal }): Promise<BatchedVideoData> => {
      const startTime = Date.now();
      
      // Create connection-aware signal with timeout
      const connectionSignal = createConnectionAwareSignal({
        availableRelays: getOptimalRelaysForQuery('events', 3),
        queryType: 'events',
        baseTimeout: 8000, // Longer timeout for batched queries
      }, signal);

      // Step 1: Fetch videos with rate limiting
      const videoQueryKey = `videos-${JSON.stringify(filter)}`;
      const videos = await QueryDeduplicator.dedupe(videoQueryKey, async () => {
        const events = await nostr.query([{
          ...filter,
          kinds: [21, 22], // Ensure video kinds
          limit,
        }], { signal: connectionSignal });

        return events.filter(validateVideoEvent) as VideoEvent[];
      });

      if (videos.length === 0) {
        return {
          videos: [],
          authors: new Map(),
          reactions: new Map(),
          metadata: {
            totalQueried: 0,
            validVideos: 0,
            processingTime: Date.now() - startTime,
          },
        };
      }

      // Extract unique author pubkeys and video IDs
      const authorPubkeys = [...new Set(videos.map(v => v.pubkey))];
      const videoIds = videos.map(v => v.id);

      // Step 2: Batch fetch authors if requested
      const authors = new Map<string, NostrEvent>();
      if (includeAuthors && authorPubkeys.length > 0) {
        try {
          const authorQueryKey = `authors-${authorPubkeys.sort().join(',')}`;
          const authorEvents = await QueryDeduplicator.dedupe(authorQueryKey, async () => {
            // Rate-limited author query
            return await relayRateLimiter.queueQuery(
              'authors-batch',
              () => nostr.query([{
                kinds: [0], // Profile metadata
                authors: authorPubkeys.slice(0, 50), // Limit to prevent huge queries
              }], { signal: connectionSignal }),
              'low' // Lower priority than video content
            );
          });

          // Map authors by pubkey
          authorEvents.forEach(author => {
            authors.set(author.pubkey, author);
          });
        } catch (error) {
          bundleLog('batchedVideoQuery', `⚠️ Author fetch failed: ${error.message}`);
        }
      }

      // Step 3: Batch fetch reactions if requested  
      const reactions = new Map<string, NostrEvent[]>();
      if (includeReactions && videoIds.length > 0) {
        try {
          const reactionQueryKey = `reactions-${videoIds.sort().join(',')}`;
          const reactionEvents = await QueryDeduplicator.dedupe(reactionQueryKey, async () => {
            // Rate-limited reaction query
            return await relayRateLimiter.queueQuery(
              'reactions-batch',
              () => nostr.query([{
                kinds: [7, 9735], // Reactions and zaps
                '#e': videoIds,
                limit: Math.min(videoIds.length * 20, 1000), // Reasonable limit based on video count
              }], { signal: connectionSignal }),
              'low' // Lower priority than video content
            );
          });

          // Group reactions by video ID
          reactionEvents.forEach(reaction => {
            const eventId = reaction.tags.find(tag => tag[0] === 'e')?.[1];
            if (eventId) {
              if (!reactions.has(eventId)) {
                reactions.set(eventId, []);
              }
              reactions.get(eventId)!.push(reaction);
            }
          });
        } catch (error) {
          bundleLog('batchedVideoQuery', `⚠️ Reaction fetch failed: ${error.message}`);
        }
      }

      const processingTime = Date.now() - startTime;
      const metadata = {
        totalQueried: videos.length,
        validVideos: videos.length,
        processingTime,
      };

      bundleLog('batchedVideoQuery', `🎬 Batched query: ${videos.length} videos, ${authors.size} authors, ${reactions.size} reaction groups (${processingTime}ms)`);

      return {
        videos,
        authors,
        reactions,
        metadata,
      };
    },
    enabled: true,
    staleTime: cacheDuration,
    gcTime: cacheDuration * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    // Retry with exponential backoff
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      if (error.message.includes('timeout')) return true;
      if (error.message.includes('too many')) return false; // Don't retry rate limit errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook for paginated video feeds with smart batching
 */
export function usePaginatedVideoFeed(
  baseFilter: any,
  options: {
    pageSize?: number;
    includeReactions?: boolean;
    includeAuthors?: boolean;
    cacheTime?: number;
  } = {}
) {
  const {
    pageSize = 10, // Smaller initial page size
    includeReactions = false, // Defer reactions for better performance
    includeAuthors = true,
    cacheTime = 10 * 60 * 1000, // 10 minutes cache
  } = options;

  return useBatchedVideoQuery(
    { ...baseFilter, limit: pageSize },
    {
      limit: pageSize,
      includeReactions,
      includeAuthors,
      priority: 'high',
      cacheDuration: cacheTime,
    }
  );
}

/**
 * Utility to preload video data for intersection observer
 */
export function useVideoPreloader() {
  const queryClient = useQueryClient();

  const preloadVideos = async (videoIds: string[]) => {
    // Only preload if not already cached
    const uncachedIds = videoIds.filter(id => 
      !queryClient.getQueryData(['video-data', id])
    );

    if (uncachedIds.length === 0) return;

    // Preload in smaller batches
    const batchSize = 5;
    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize);
      
          // Queue preload queries with low priority
          batch.forEach(videoId => {
            queryClient.prefetchQuery({
              queryKey: ['video-data', videoId],
              queryFn: async () => {
                // Lightweight video data fetch
                return await relayRateLimiter.queueQuery(
                  'video-preload',
                  async () => Promise.resolve({ id: videoId, preloaded: true }),
                  'low'
                );
              },
              staleTime: 5 * 60 * 1000,
            });
          });      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  return { preloadVideos };
}