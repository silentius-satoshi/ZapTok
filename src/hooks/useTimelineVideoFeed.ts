import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { timelineService } from '@/services/timelineService';
import { relayDistributionService, BIG_RELAY_URLS } from '@/services/relayDistributionService';
import { timelineFilterService } from '@/services/timelineFilterService';
import { videoRealTimeService } from '@/services/realTimeEventService';
import { timelineAnalyticsService } from '@/services/timelineAnalyticsService';
import { validateVideoEvent, type VideoEvent } from '@/lib/validateVideoEvent';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollowing } from '@/hooks/useFollowing';
import { useFollowingFavoriteRelays } from '@/hooks/useFollowingFavoriteRelays';
import { bundleLog } from '@/lib/logBundler';
import indexedDBService from '@/services/indexedDB.service';
import type { NostrEvent } from '@nostrify/nostrify';

// Import video analytics services for prefetching
import { videoCommentsService } from '@/services/videoComments.service';
import { videoRepostsService } from '@/services/videoReposts.service';
import { videoNutzapsService } from '@/services/videoNutzaps.service';
import videoReactionsService from '@/services/videoReactions.service';

interface TimelineVideoFeedState {
  videos: VideoEvent[];
  newVideos: VideoEvent[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  until?: number;
  timelineKey?: string;
  // Phase 3 enhancements
  filteredCount: number;
  realTimeBuffer: number;
  feedHealth: 'healthy' | 'degraded' | 'poor';
}

interface TimelineVideoFeedOptions {
  limit?: number;
  enableNewEvents?: boolean;
  autoRefresh?: boolean;
  waitForFollowingList?: boolean; // New option to wait for following list before refreshing
}

/**
 * Timeline-based video feed hook following Jumble's proven patterns
 * Replaces direct nostr.query calls with timeline subscriptions
 */
export function useTimelineVideoFeed(
  feedType: 'global' | 'following',
  options: TimelineVideoFeedOptions = {}
) {
  const {
    limit = 20,
    enableNewEvents = true,
    autoRefresh = true,
    waitForFollowingList = true, // Default to waiting for following list
  } = options;

  const { user } = useCurrentUser();
  const followingQuery = useFollowing(user?.pubkey || '');
  const following = useMemo(() => followingQuery.data?.pubkeys || [], [followingQuery.data?.pubkeys]);

  // ✅ Category 1 Optimization: Fetch favorite relays from users we follow
  const { data: favoriteRelays } = useFollowingFavoriteRelays(
    user?.pubkey,
    following
  );

  // ✅ Use optimized relays (top 5 by popularity) or fallback to default
  const optimizedRelays = useMemo(() => {
    if (feedType !== 'following' || !favoriteRelays || favoriteRelays.length === 0) {
      return null; // Use default behavior
    }
    
    // Extract relay URLs and take top 5 by popularity (already sorted by service)
    const relays = favoriteRelays.map(([url]) => url).slice(0, 5);
    
    bundleLog('relayOptimization', 
      `🎯 Using ${relays.length} optimized relays for following feed (from ${favoriteRelays.length} favorite relays)`
    );
    
    return relays;
  }, [feedType, favoriteRelays]);

  // Feed state following Jumble's pattern
  const [state, setState] = useState<TimelineVideoFeedState>({
    videos: [],
    newVideos: [],
    loading: true,
    hasMore: true,
    error: null,
    // Phase 3 enhancements
    filteredCount: 0,
    realTimeBuffer: 0,
    feedHealth: 'healthy',
  });

  // Refs for managing subscriptions
  const closerRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);
  const hasLoggedNoFollowingRef = useRef(false);

  // Generate subscription requests based on feed type (following Jumble's approach)
  const generateSubRequests = useCallback(async () => {
    if (feedType === 'global') {
      // Global feed: use default relays
      return [{
        urls: ['wss://relay.nostr.band', 'wss://nos.lol', 'wss://relay.damus.io'],
        filter: {
          kinds: [21, 22], // Video events
          limit,
        }
      }];
    }

    if (feedType === 'following' && user?.pubkey && following.length > 0) {
      // Reset the no-following flag when we have follows
      hasLoggedNoFollowingRef.current = false;

      bundleLog('timelineFollowing', `👥 Generating sub-requests for ${following.length + 1} users (user + ${following.length} following)`);

      // ✅ Category 1 Optimization: Use optimized relays if available
      if (optimizedRelays && optimizedRelays.length > 0) {
        bundleLog('timelineFollowing', `🎯 Using optimized relays: ${optimizedRelays.join(', ')}`);
        
        // Use optimized relays for following feed
        return [{
          urls: optimizedRelays,
          filter: {
            kinds: [21, 22],
            authors: [user.pubkey, ...following],
            limit,
          }
        }];
      }

      // Fallback: Use relay distribution service with default behavior
      const subRequests = await relayDistributionService.generateSubRequestsForPubkeys(
        [user.pubkey, ...following],
        user.pubkey
      );

      bundleLog('timelineFollowing', `📡 Generated ${subRequests.length} sub-requests for following feed (using fallback)`);
      return subRequests;
    }

    if (feedType === 'following' && user?.pubkey && following.length === 0) {
      // Following feed with no follows: return empty (no fallback to global)
      // Only log once to prevent spam
      if (!hasLoggedNoFollowingRef.current) {
        bundleLog('timelineFollowing', '👥 No following users found, showing empty feed');
        hasLoggedNoFollowingRef.current = true;
      }
      return [];
    }

    return [];
  }, [feedType, user?.pubkey, following, limit, optimizedRelays]);

  // Handle new events (following Jumble's onNew pattern)
  const handleNewEvent = useCallback((event: NostrEvent) => {
    // Only process new events if enabled
    if (!enableNewEvents) return;

    const videoEvent = validateVideoEvent(event);
    if (!videoEvent) return;
    const feedId = `${feedType}_${user?.pubkey || 'anon'}`;

    // Phase 3: Apply content filtering to new events
    const filteredEvents = timelineFilterService.filterEvents([videoEvent]);
    if (filteredEvents.length === 0) {
      bundleLog('timelineNewVideo', `📹 New video event filtered out: ${videoEvent.id.slice(0, 8)}`);
      return;
    }

    // Phase 3: Process through real-time service
    videoRealTimeService.processEvents(filteredEvents);

    setState(prev => {
      // Check if event already exists
      const exists = prev.videos.some(v => v.id === videoEvent.id) ||
                     prev.newVideos.some(v => v.id === videoEvent.id);

      if (exists) return prev;

      bundleLog('timelineNewVideo', `📹 New video event received: ${videoEvent.id.slice(0, 8)}`);

      return {
        ...prev,
        newVideos: [videoEvent, ...prev.newVideos]
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, 50), // Limit new events buffer
        realTimeBuffer: videoRealTimeService.getBufferSize(),
      };
    });
  }, [enableNewEvents, feedType, user?.pubkey]);

  // Handle batch events (following Jumble's onEvents pattern)
  const handleEvents = useCallback((events: NostrEvent[], eosed: boolean) => {
    const validVideos = events
      .map(validateVideoEvent)
      .filter((e): e is VideoEvent => e !== null)
      .sort((a, b) => b.created_at - a.created_at);

    // Phase 3: Record events for analytics
    const feedId = `${feedType}_${user?.pubkey || 'anon'}`;
    timelineAnalyticsService.recordEvents(feedId, validVideos);

    // Phase 3: Apply content filtering
    const filteredVideos = timelineFilterService.filterEvents(validVideos);
    const filteredCount = validVideos.length - filteredVideos.length;

    // Phase 3: Process through real-time service
    videoRealTimeService.processEvents(filteredVideos);

    bundleLog('timelineVideoBatch',
      `📹 Received ${validVideos.length} video events, filtered to ${filteredVideos.length}, EOSED: ${eosed}`);

    // Phase 6.3: Cache video events in IndexedDB
    if (filteredVideos.length > 0) {
      Promise.all(filteredVideos.map(v => indexedDBService.putVideoEvent(v)))
        .then(() => {
          bundleLog('videoCache', `💾 Cached ${filteredVideos.length} videos in IndexedDB`);
        })
        .catch(error => {
          console.error('[Timeline] Failed to cache videos in IndexedDB:', error);
        });
    }

    // ✅ Feed-level prefetching: Trigger immediately after receiving videos
    console.log(`[Timeline] DEBUG: About to check prefetch - filteredVideos.length: ${filteredVideos.length}`);
    
    if (filteredVideos.length > 0) {
      const videoIds = filteredVideos.map(v => v.id);
      console.log(`[Timeline] 🚀 Triggering feed-level prefetch for ${videoIds.length} videos`);

      // Prefetch all analytics in parallel (fire-and-forget)
      Promise.all([
        videoCommentsService.prefetchComments(videoIds),
        videoRepostsService.prefetchReposts(videoIds),
        videoNutzapsService.prefetchNutzaps(videoIds),
        videoReactionsService.prefetchReactions(videoIds),
      ]).catch(error => {
        console.error('[Timeline] Failed to prefetch video analytics:', error);
      });
    } else {
      console.log(`[Timeline] DEBUG: Skipping prefetch - no filtered videos`);
    }

    setState(prev => {
      // Deduplicate by both event ID and video URL
      const existingIds = new Set(prev.videos.map(v => v.id));
      const existingUrls = new Set(
        prev.videos
          .map((v: VideoEvent) => v.videoUrl)
          .filter((url): url is string => !!url)
          .map(url => url.toLowerCase())
      );
      
      const newVideos = filteredVideos.filter((v: VideoEvent) => {
        // Skip if we've already seen this event ID
        if (existingIds.has(v.id)) return false;
        
        // Skip if we've already seen this video URL (case-insensitive)
        if (v.videoUrl && existingUrls.has(v.videoUrl.toLowerCase())) return false;
        
        return true;
      });

      // Get feed health status
      const feedHealth = timelineAnalyticsService.getFeedHealth(feedId);

      return {
        ...prev,
        videos: [...prev.videos, ...newVideos],
        loading: eosed ? false : prev.loading,
        hasMore: filteredVideos.length > 0,
        until: filteredVideos.length > 0 ?
          filteredVideos[filteredVideos.length - 1].created_at - 1 :
          prev.until,
        // Phase 3 updates
        filteredCount: prev.filteredCount + filteredCount,
        realTimeBuffer: videoRealTimeService.getBufferSize(),
        feedHealth: feedHealth.overall,
      };
    });
  }, [feedType, user?.pubkey]);

  // Initialize timeline subscription (following Jumble's init pattern)
  const initializeTimeline = useCallback(async () => {
    if (isInitializedRef.current) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Phase 6.3: Load from IndexedDB cache first (offline-first pattern)
      const startTime = performance.now();
      const cachedVideos = feedType === 'following' && user?.pubkey
        ? await indexedDBService.getVideoEventsByAuthor(user.pubkey, 20)
        : await indexedDBService.getRecentVideoEvents(30);

      if (cachedVideos.length > 0) {
        const duration = performance.now() - startTime;
        bundleLog('videoCache', `✅ Cache HIT: Loaded ${cachedVideos.length} videos from IndexedDB (${duration.toFixed(1)}ms)`);
        
        // Validate and convert to VideoEvent format
        const validatedCached = cachedVideos
          .map(validateVideoEvent)
          .filter((e): e is VideoEvent => e !== null);
        
        if (validatedCached.length > 0) {
          bundleLog('videoCache', `✅ Returning ${validatedCached.length} cached videos (instant load)`);
          
          setState(prev => ({
            ...prev,
            videos: validatedCached,
            loading: false, // Show cached data immediately
          }));
          
          // Prefetch analytics for cached videos
          const videoIds = validatedCached.map(v => v.id);
          Promise.all([
            videoCommentsService.prefetchComments(videoIds),
            videoRepostsService.prefetchReposts(videoIds),
            videoNutzapsService.prefetchNutzaps(videoIds),
            videoReactionsService.prefetchReactions(videoIds),
          ]).catch(error => {
            console.error('[Timeline] Failed to prefetch analytics for cached videos:', error);
          });
        }
      } else {
        bundleLog('videoCache', '❌ Cache MISS - fetching from network');
      }

      // Phase 3: Initialize analytics service for this feed
      const feedId = `${feedType}_${user?.pubkey || 'anon'}`;
      timelineAnalyticsService.initializeFeed(feedId);

      const requests = await generateSubRequests();
      if (requests.length === 0) {
        // For following feed with no follows, show as successfully loaded but empty
        setState(prev => ({
          ...prev,
          loading: false,
          error: null,
          hasMore: false
        }));
        isInitializedRef.current = true;
        return;
      }

      bundleLog('timelineInit', `📹 Initializing ${feedType} video timeline with ${requests.length} requests`);

      // Phase 3: Record load time start
      const loadStartTime = Date.now();

      // Subscribe to timeline using Jumble's pattern
      const { closer, timelineKey } = await timelineService.subscribeTimeline(
        requests.map(({ urls, filter }) => ({
          urls,
          filter: {
            kinds: [21, 22], // Video events
            ...filter,
            limit,
          }
        })),
        {
          onEvents: handleEvents,
          onNew: handleNewEvent, // Always provide the handler, it will check enableNewEvents internally
          onClose: (url: string, reason: string) => {
            bundleLog('timelineClose', `📹 Timeline closed for ${url}: ${reason}`);
          }
        }
      );

      // Phase 3: Record load time
      const loadTime = Date.now() - loadStartTime;
      timelineAnalyticsService.recordLoadTime(feedId, loadTime);

      closerRef.current = closer;
      setState(prev => ({ ...prev, timelineKey }));
      isInitializedRef.current = true;

    } catch (error) {
      bundleLog('timelineError', `❌ Timeline initialization error: ${error}`);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Timeline initialization failed'
      }));
    }
  }, [generateSubRequests, feedType, user?.pubkey, limit, handleEvents, handleNewEvent]);

  // Load more videos (following Jumble's loadMore pattern)
  const loadMore = useCallback(async () => {
    if (!state.timelineKey || state.loading || !state.hasMore || !state.until) {
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      bundleLog('timelineLoadMore', `📹 Loading more videos until: ${state.until}`);

      const moreEvents = await timelineService.loadMoreTimeline(
        state.timelineKey,
        state.until,
        limit
      );

      const validVideos = moreEvents
        .map(validateVideoEvent)
        .filter((e): e is VideoEvent => e !== null);

      setState(prev => {
        // Deduplicate by both event ID and video URL
        const existingIds = new Set(prev.videos.map(v => v.id));
        const existingUrls = new Set(
          prev.videos
            .map((v: VideoEvent) => v.videoUrl)
            .filter((url): url is string => !!url)
            .map(url => url.toLowerCase())
        );
        
        const newVideos = validVideos.filter((v: VideoEvent) => {
          // Skip if we've already seen this event ID
          if (existingIds.has(v.id)) return false;
          
          // Skip if we've already seen this video URL (case-insensitive)
          if (v.videoUrl && existingUrls.has(v.videoUrl.toLowerCase())) return false;
          
          return true;
        });

        return {
          ...prev,
          videos: [...prev.videos, ...newVideos],
          loading: false,
          hasMore: validVideos.length === limit,
          until: validVideos.length > 0 ?
            validVideos[validVideos.length - 1].created_at - 1 :
            prev.until,
        };
      });

      bundleLog('timelineLoadMore', `📹 Loaded ${validVideos.length} more videos`);

    } catch (error) {
      bundleLog('timelineLoadMoreError', `❌ Load more error: ${error}`);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load more videos'
      }));
    }
  }, [state.timelineKey, state.loading, state.hasMore, state.until, limit]);

  // Merge new videos into main feed
  const mergeNewVideos = useCallback(() => {
    setState(prev => {
      if (prev.newVideos.length === 0) return prev;

      const allVideos = [...prev.newVideos, ...prev.videos]
        .sort((a, b) => b.created_at - a.created_at);

      // Remove duplicates
      const uniqueVideos: VideoEvent[] = [];
      const seenIds = new Set<string>();

      for (const video of allVideos) {
        if (!seenIds.has(video.id)) {
          seenIds.add(video.id);
          uniqueVideos.push(video);
        }
      }

      bundleLog('timelineMerge', `📹 Merged ${prev.newVideos.length} new videos`);

      return {
        ...prev,
        videos: uniqueVideos,
        newVideos: [],
      };
    });
  }, []);

  // Refresh timeline (reset and restart)
  const refresh = useCallback(async () => {
    bundleLog('timelineRefresh', `📹 Refreshing ${feedType} video timeline`);

    // Close existing subscription
    if (closerRef.current) {
      closerRef.current();
      closerRef.current = null;
    }

    // Reset state
    setState({
      videos: [],
      newVideos: [],
      loading: true,
      hasMore: true,
      error: null,
      // Phase 3 enhancements
      filteredCount: 0,
      realTimeBuffer: 0,
      feedHealth: 'healthy',
    });

    isInitializedRef.current = false;

    // Reinitialize
    await initializeTimeline();
  }, [feedType, user?.pubkey]);

  // Initialize on mount and when core dependencies change
  useEffect(() => {
    initializeTimeline();

    return () => {
      if (closerRef.current) {
        closerRef.current();
        closerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [feedType, user?.pubkey]);

  // Auto-refresh when user changes (following feed) - but avoid infinite loops
  // Only refresh after contact list is loaded to prevent spam (if waitForFollowingList is enabled)
  useEffect(() => {
    if (feedType === 'following' && autoRefresh && user?.pubkey) {
      if (waitForFollowingList && (!followingQuery.data || following.length === 0)) {
        console.log('📊 [useTimelineVideoFeed] Waiting for contact list to load before auto-refreshing...');
        return;
      }
      
      console.log('📊 [useTimelineVideoFeed] Auto-refreshing following feed - contact list loaded with', following.length, 'pubkeys');
      
      // Reset and reinitialize directly to avoid dependency on refresh function
      if (closerRef.current) {
        closerRef.current();
        closerRef.current = null;
      }

      setState({
        videos: [],
        newVideos: [],
        loading: true,
        hasMore: true,
        error: null,
        filteredCount: 0,
        realTimeBuffer: 0,
        feedHealth: 'healthy',
      });

      isInitializedRef.current = false;
      initializeTimeline();
    }
  }, [user?.pubkey, feedType, followingQuery.data, following.length, waitForFollowingList, autoRefresh]); // Wait for contact list to load if enabled

  return {
    // Feed data
    videos: state.videos,
    newVideos: state.newVideos,

    // Loading states
    loading: state.loading,
    hasMore: state.hasMore,
    error: state.error,

    // Actions
    loadMore,
    refresh,
    mergeNewVideos,

    // Metadata
    timelineKey: state.timelineKey,
    newVideosCount: state.newVideos.length,

    // Following info
    hasFollowing: following.length > 0,
    followingCount: following.length,

    // Phase 3 enhanced features
    filteredCount: state.filteredCount,
    realTimeBuffer: state.realTimeBuffer,
    feedHealth: state.feedHealth,

    // Phase 3 analytics access
    getAnalytics: () => {
      const feedId = `${feedType}_${user?.pubkey || 'anon'}`;
      return timelineAnalyticsService.getFeedAnalytics(feedId);
    },
    getFeedHealth: () => {
      const feedId = `${feedType}_${user?.pubkey || 'anon'}`;
      return timelineAnalyticsService.getFeedHealth(feedId);
    },
  };

  return {
    videos: state.videos,
    newVideos: state.newVideos,
    loading: state.loading,
    hasMore: state.hasMore,
    error: state.error,

    // Actions
    loadMore,
    refresh,
    mergeNewVideos,

    // Metadata
    timelineKey: state.timelineKey,
    newVideosCount: state.newVideos.length,

    // Following info
    hasFollowing: following.length > 0,
    followingCount: following.length,

    // Phase 3 enhanced features
    filteredCount: state.filteredCount,
    realTimeBuffer: state.realTimeBuffer,
    feedHealth: state.feedHealth,

    // Phase 3 analytics access
    getAnalytics: () => {
      const feedId = `${feedType}_${user?.pubkey || 'anon'}`;
      return timelineAnalyticsService.getFeedAnalytics(feedId);
    },
    getFeedHealth: () => {
      const feedId = `${feedType}_${user?.pubkey || 'anon'}`;
      return timelineAnalyticsService.getFeedHealth(feedId);
    },
  };
}/**
 * Global video feed using timeline service
 */
export function useTimelineGlobalVideoFeed(options?: TimelineVideoFeedOptions) {
  return useTimelineVideoFeed('global', options);
}

/**
 * Following video feed using timeline service
 */
export function useTimelineFollowingVideoFeed(options?: TimelineVideoFeedOptions) {
  return useTimelineVideoFeed('following', options);
}