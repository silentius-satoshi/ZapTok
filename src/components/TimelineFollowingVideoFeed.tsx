import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useTimelineFollowingVideoFeed } from '@/hooks/useTimelineVideoFeed';
import { useInitializeAnalyticsServices } from '@/hooks/useInitializeAnalyticsServices';
import { VideoCard } from '@/components/VideoCard';
import { VideoActionButtons } from '@/components/VideoActionButtons';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCurrentVideo } from '@/contexts/CurrentVideoContext';
import { useLoginAutoRefresh } from '@/hooks/useLoginAutoRefresh';
import { useFollowing } from '@/hooks/useFollowing';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { bundleLog } from '@/lib/logBundler';
import { ZapTokLogo } from '@/components/ZapTokLogo';
import { filterValidVideos } from '@/lib/videoValidation';
import { brokenVideoTracker } from '@/services/brokenVideoTracker';
import { useContentPolicy } from '@/providers/ContentPolicyProvider';
import { useProfileCache } from '@/hooks/useProfileCache';
import { useVideoPrefetch } from '@/hooks/useVideoPrefetch';

export interface FollowingVideoFeedRef {
  refresh: () => void;
}

interface TimelineFollowingVideoFeedProps {
  disableAutoRefresh?: boolean; // Option to disable all auto-refresh behavior
}

export const TimelineFollowingVideoFeed = forwardRef<FollowingVideoFeedRef, TimelineFollowingVideoFeedProps>(({ disableAutoRefresh = false }, ref) => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setCurrentVideo } = useCurrentVideo();
  const { autoLoadMedia } = useContentPolicy();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track failed video IDs to filter them out from rendering
  const [failedVideoIds, setFailedVideoIds] = useState<Set<string>>(new Set());
  
  // Track aspect ratios for each video to dynamically size containers
  const [videoAspectRatios, setVideoAspectRatios] = useState<Map<string, number>>(new Map());

  // Enhanced caching hooks for prefetching
  const { batchLoadProfiles } = useProfileCache();
  const { preloadThumbnails } = useVideoPrefetch();

  // Initialize analytics services for feed-level prefetching
  // This enables comments, reposts, and reactions to batch together
  useInitializeAnalyticsServices();

  // Auto-refresh after login
  const { justLoggedIn } = useLoginAutoRefresh();
  
  // Get following data to wait for contact list to load
  const followingQuery = useFollowing(user?.pubkey || '');
  const following = followingQuery.data?.pubkeys || [];

  // Lock body scroll on mobile to prevent dual scrolling
  useEffect(() => {
    if (!isMobile) return;

    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = original;
    };
  }, [isMobile]);

  // Use timeline-based following feed
  const {
    videos: rawVideos,
    newVideos,
    loading,
    hasMore,
    error,
    loadMore,
    refresh: refreshTimeline,
    mergeNewVideos,
    newVideosCount,
  } = useTimelineFollowingVideoFeed({
    limit: 15, // Reasonable page size
    enableNewEvents: true,
    autoRefresh: !disableAutoRefresh, // Respect the disable flag
    waitForFollowingList: true, // Wait for contact list to be loaded
  });

  // Filter out videos with no working sources AND videos that have failed to load
  // Use brokenVideoTracker for persistent filtering across sessions
  const videos = brokenVideoTracker.filterBrokenVideos(
    filterValidVideos(rawVideos).filter(video => !failedVideoIds.has(video.id))
  );

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      bundleLog('followingVideoRefresh', '🔄 Manual refresh triggered for timeline following feed');
      await refreshTimeline();
      setCurrentVideoIndex(0);
      
      // Scroll back to top
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }), [refreshTimeline]);

  // Handle merging new videos and scroll to top
  const handleMergeNewVideos = () => {
    bundleLog('followingVideoMerge', '🔄🔼 Merging new videos and scrolling to top');
    
    // Merge new videos
    mergeNewVideos();
    
    // Reset to first video
    setCurrentVideoIndex(0);
    
    // Scroll to top
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Auto-refresh following feed after login - but wait for contact list to load
  useEffect(() => {
    if (disableAutoRefresh) return; // Skip auto-refresh if disabled
    
    if (justLoggedIn && user?.pubkey && followingQuery.data && following.length > 0) {
      bundleLog('loginAutoRefresh', `🔄 Auto-refreshing timeline following feed after login - contact list loaded with ${following.length} pubkeys`);
      refreshTimeline();
    } else if (justLoggedIn && user?.pubkey && (!followingQuery.data || following.length === 0)) {
      bundleLog('loginAutoRefresh', '⏳ Waiting for contact list to load before auto-refreshing feed...');
    }
  }, [justLoggedIn, user?.pubkey, followingQuery.data, following.length, refreshTimeline, disableAutoRefresh]);

  // Set current video in context
  useEffect(() => {
    if (videos.length > 0 && currentVideoIndex < videos.length) {
      setCurrentVideo(videos[currentVideoIndex]);
    }
  }, [videos, currentVideoIndex, setCurrentVideo]);

  // Prefetch metadata for next 3 videos when current video changes
  useEffect(() => {
    if (!autoLoadMedia || videos.length === 0) return;

    const nextVideos = videos.slice(currentVideoIndex + 1, currentVideoIndex + 4);
    
    if (nextVideos.length > 0) {
      const nextAuthorPubkeys = [...new Set(nextVideos.map(event => event.pubkey))];
      const nextThumbnailUrls = nextVideos
        .map(event => event.thumbnail)
        .filter(Boolean) as string[];

      // Prefetch profiles and thumbnails for next 3 videos
      if (nextAuthorPubkeys.length > 0) {
        batchLoadProfiles(nextAuthorPubkeys).catch(() => {});
      }

      if (nextThumbnailUrls.length > 0) {
        preloadThumbnails(nextThumbnailUrls);
      }

      bundleLog('video-preload', `🎬 Preloading metadata for next ${nextVideos.length} videos`);
    }
  }, [currentVideoIndex, videos, autoLoadMedia, batchLoadProfiles, preloadThumbnails]);

  // Intersection Observer for auto-navigation
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-video-index') || '0');
            setCurrentVideoIndex(index);

            // Preload more when near the end
            if (index >= videos.length - 3 && hasMore && !loading) {
              loadMore();
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.7,
      }
    );

    const videoElements = containerRef.current.querySelectorAll('[data-video-index]');
    videoElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [videos.length, hasMore, loading, loadMore]);

  // Scroll to video function
  const scrollToVideo = (index: number) => {
    if (containerRef.current) {
      const videoHeight = window.innerHeight;
      const targetTop = index * videoHeight;

      containerRef.current.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      });
    }
  };

  // Handle errors
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-white">Unable to load videos</h3>
          <p className="text-gray-400 max-w-md">{error}</p>
        </div>
        <Button 
          onClick={refreshTimeline} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Show loading state while fetching contact list or initial videos
  if (user && (followingQuery.isLoading || (loading && videos.length === 0))) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-pulse">
            <ZapTokLogo size={80} className="opacity-80" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium text-white">Loading your feed...</h3>
            <p className="text-gray-400 text-sm">
              {followingQuery.isLoading 
                ? "Fetching your contact list..." 
                : "Finding videos from people you follow..."}
            </p>
          </div>
        </div>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Show empty state for following feed when no user
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Your Following Feed</h2>
          <p className="text-gray-400 max-w-md">
            Connect your Nostr identity to see videos from creators you follow
          </p>
        </div>
        <Button 
          onClick={() => navigate('/login')} 
          className="bg-purple-600 hover:bg-purple-700"
        >
          Connect Account
        </Button>
      </div>
    );
  }

  // Show empty state when no videos
  if (!loading && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">No Videos Yet</h2>
          <p className="text-gray-400 max-w-md">
            Follow some creators to see their videos here, or check out the global feed for discovery
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate('/global')} 
            className="bg-purple-600 hover:bg-purple-700"
          >
            Explore Global Feed
          </Button>
          <Button 
            onClick={refreshTimeline} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* New Videos Indicator */}
      {newVideosCount > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <Button
            onClick={handleMergeNewVideos}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg animate-bounce"
          >
            {newVideosCount} new video{newVideosCount !== 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {/* Video Feed */}
      <div
        ref={containerRef}
        className={
          isMobile
            ? "mobile-feed-scroller video-container"
            : "h-screen overflow-y-auto scrollbar-hide bg-black snap-y snap-mandatory relative video-container"
        }
        style={{ scrollBehavior: 'smooth' }}
      >

        {videos
          .filter((video) => {
            // On mobile, filter out landscape videos (aspect ratio > 1)
            if (isMobile) {
              const aspectRatio = videoAspectRatios.get(video.id);
              // If aspect ratio is known and it's landscape, filter it out
              // If aspect ratio is unknown, allow it through (will be detected on load)
              return !aspectRatio || aspectRatio <= 1;
            }
            return true; // Desktop: show all videos
          })
          .map((video, index) => {
          const aspectRatio = videoAspectRatios.get(video.id);
          
          // Calculate exact container dimensions based on video aspect ratio
          let containerStyle: React.CSSProperties = {};
          if (!isMobile && aspectRatio) {
            // Account for sidebar widths on desktop:
            // Left sidebar: 16rem (--sidebar-width) - always visible on md+
            // Right sidebar (login area): 24rem (w-96) - only visible on lg+ (≥1024px)
            // 
            // Using calc(100vw - 40rem) for maximum width
            // The container will naturally shrink on smaller screens due to flex-1 behavior
            const maxWidthLandscape = 'calc(100vw - 40rem)';
            
            containerStyle = {
              aspectRatio: aspectRatio.toString(),
              maxWidth: aspectRatio > 1 ? maxWidthLandscape : '60vh',
              maxHeight: '100vh',
            };
          }
          
          return (
          <div
            key={`${video.id}-${index}`}
            data-video-index={index}
            className={
              isMobile
                ? "mobile-video-item"
                : "h-screen flex items-center justify-center snap-start"
            }
            >
              <div 
                className={`flex w-full h-full ${isMobile ? 'flex-col relative items-end' : 'items-end gap-6'}`}
                style={!isMobile ? containerStyle : undefined}
              >
                <div className={`overflow-hidden bg-black shadow-2xl hover:shadow-3xl transition-all duration-300 ${
                  isMobile
                    ? 'w-full h-full border-none'
                    : 'w-full h-full rounded-3xl border-2 border-gray-800'
                }`}>
                  <VideoCard
                    event={video}
                    isActive={index === currentVideoIndex}
                    showVerificationBadge={!isMobile}
                    shouldPreload={autoLoadMedia && index > currentVideoIndex && index <= currentVideoIndex + 3}
                    onAspectRatioDetected={(ratio) => {
                      setVideoAspectRatios(prev => new Map(prev).set(video.id, ratio));
                    }}
                    onNext={() => {
                      const newIndex = Math.min(index + 1, videos.length - 1);
                      setCurrentVideoIndex(newIndex);
                      scrollToVideo(newIndex);
                    }}
                    onPrevious={() => {
                      const newIndex = Math.max(index - 1, 0);
                      setCurrentVideoIndex(newIndex);
                      scrollToVideo(newIndex);
                    }}
                    onVideoUnavailable={() => {
                      // Mark video as failed to prevent re-rendering
                      setFailedVideoIds(prev => new Set(prev).add(video.id));
                      
                      // The video will be automatically filtered out by the filter above
                      // causing the feed to re-render without this video, and the current index
                      // will now point to the next video in the list
                      if (import.meta.env.DEV) {
                        bundleLog('TimelineFollowingVideoFeed', `🚫 Video ${video.id.slice(0, 8)} marked as failed and filtered out`);
                      }
                    }}
                  />
                </div>

                <div className={isMobile
                  ? 'absolute right-1 bottom-4 z-10'
                  : 'flex items-end'
                }>
                  <VideoActionButtons event={video} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading indicator at bottom */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {/* End of feed indicator */}
        {!hasMore && videos.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-400">You've reached the end of your feed</p>
          </div>
        )}
      </div>
    </div>
  );
});

TimelineFollowingVideoFeed.displayName = 'TimelineFollowingVideoFeed';