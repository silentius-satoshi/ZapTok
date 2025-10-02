import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useTimelineFollowingVideoFeed } from '@/hooks/useTimelineVideoFeed';
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
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    videos,
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
            onClick={mergeNewVideos}
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

        {videos.map((video, index) => (
          <div
            key={`${video.id}-${index}`}
            data-video-index={index}
            className={
              isMobile
                ? "mobile-video-item"
                : "h-screen flex items-center justify-center snap-start"
            }
            >
              <div className={`flex w-full items-end h-full ${isMobile ? 'flex-col relative' : 'gap-6 max-w-2xl'}`}>
                <div className={`overflow-hidden bg-black shadow-2xl hover:shadow-3xl transition-all duration-300 ${
                  isMobile
                    ? 'w-full h-full border-none'
                    : 'flex-1 h-full rounded-3xl border-2 border-gray-800'
                }`}>
                  <VideoCard
                    event={video}
                    isActive={index === currentVideoIndex}
                    showVerificationBadge={!isMobile}
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
        ))}

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