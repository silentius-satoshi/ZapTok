import { useCallback, useEffect, useRef, useState } from 'react';
import { timelineService } from '@/services/timelineService';
import { relayDistributionService } from '@/services/relayDistributionService';
import { validateVideoEvent, type VideoEvent } from '@/lib/validateVideoEvent';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollowing } from '@/hooks/useFollowing';
import { bundleLog } from '@/lib/logBundler';
import type { NostrEvent } from '@nostrify/nostrify';

interface TimelineVideoFeedState {
  videos: VideoEvent[];
  newVideos: VideoEvent[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  until?: number;
  timelineKey?: string;
}

interface TimelineVideoFeedOptions {
  limit?: number;
  enableNewEvents?: boolean;
  autoRefresh?: boolean;
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
  } = options;

  const { user } = useCurrentUser();
  const followingQuery = useFollowing(user?.pubkey || '');
  const following = followingQuery.data?.pubkeys || [];

  // Feed state following Jumble's pattern
  const [state, setState] = useState<TimelineVideoFeedState>({
    videos: [],
    newVideos: [],
    loading: true,
    hasMore: true,
    error: null,
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

      // Following feed: distribute authors across preferred relays (Jumble pattern)
      return await relayDistributionService.generateSubRequestsForPubkeys(
        [user.pubkey, ...following],
        user.pubkey
      );
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
  }, [feedType, user?.pubkey, following, limit]);

  // Handle new events (following Jumble's onNew pattern)
  const handleNewEvent = useCallback((event: NostrEvent) => {
    // Only process new events if enabled
    if (!enableNewEvents || !validateVideoEvent(event)) return;

    const videoEvent = event as VideoEvent;

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
          .slice(0, 50) // Limit new events buffer
      };
    });
  }, []);

  // Handle batch events (following Jumble's onEvents pattern)
  const handleEvents = useCallback((events: NostrEvent[], eosed: boolean) => {
    const validVideos = events
      .filter(validateVideoEvent)
      .map(e => e as VideoEvent)
      .sort((a, b) => b.created_at - a.created_at);

    bundleLog('timelineVideoBatch', `📹 Received ${validVideos.length} video events, EOSED: ${eosed}`);

    setState(prev => {
      // Deduplicate with existing videos
      const existingIds = new Set(prev.videos.map(v => v.id));
      const newVideos = validVideos.filter(v => !existingIds.has(v.id));

      return {
        ...prev,
        videos: [...prev.videos, ...newVideos],
        loading: eosed ? false : prev.loading,
        hasMore: validVideos.length > 0,
        until: validVideos.length > 0 ?
          validVideos[validVideos.length - 1].created_at - 1 :
          prev.until,
      };
    });
  }, []);

  // Initialize timeline subscription (following Jumble's init pattern)
  const initializeTimeline = useCallback(async () => {
    if (isInitializedRef.current) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

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
  }, [generateSubRequests, feedType, limit, handleEvents, handleNewEvent, enableNewEvents]);

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
        .filter(validateVideoEvent)
        .map(e => e as VideoEvent);

      setState(prev => {
        // Deduplicate with existing videos
        const existingIds = new Set(prev.videos.map(v => v.id));
        const newVideos = validVideos.filter(v => !existingIds.has(v.id));

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
    });

    isInitializedRef.current = false;

    // Reinitialize
    await initializeTimeline();
  }, [feedType, initializeTimeline]);

  // Initialize on mount and when dependencies change
  useEffect(() => {
    initializeTimeline();

    return () => {
      if (closerRef.current) {
        closerRef.current();
        closerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [initializeTimeline]);

  // Auto-refresh when user changes (following feed) - but avoid infinite loops
  useEffect(() => {
    if (feedType === 'following' && autoRefresh && user?.pubkey) {
      refresh();
    }
  }, [user?.pubkey, feedType]); // Removed autoRefresh, refresh, and following.length to prevent loops

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
  };
}

/**
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