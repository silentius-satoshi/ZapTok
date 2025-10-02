import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useTimelineFollowingVideoFeed } from '@/hooks/useTimelineVideoFeed';
import { OptimizedVideoCard } from '@/components/OptimizedVideoCard';
import { VideoActionButtons } from '@/components/VideoActionButtons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCurrentVideo } from '@/contexts/CurrentVideoContext';
import { useLoginAutoRefresh } from '@/hooks/useLoginAutoRefresh';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { bundleLog } from '@/lib/logBundler';

export interface FollowingVideoFeedRef {
  refresh: () => void;
}

export const TimelineFollowingVideoFeed = forwardRef<FollowingVideoFeedRef>((props, ref) => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setCurrentVideo } = useCurrentVideo();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-refresh after login
  const { justLoggedIn } = useLoginAutoRefresh();

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
    autoRefresh: true,
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

  // Auto-refresh following feed after login
  useEffect(() => {
    if (justLoggedIn && user?.pubkey) {
      bundleLog('loginAutoRefresh', '🔄 Auto-refreshing timeline following feed after login');
      refreshTimeline();
    }
  }, [justLoggedIn, user?.pubkey, refreshTimeline]);

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
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
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

    const videoElements = containerRef.current.querySelectorAll('.video-card');
    videoElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [videos.length, hasMore, loading, loadMore]);

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
        className={`h-full ${
          isMobile ? 'snap-y snap-mandatory overflow-y-scroll' : 'overflow-y-auto'
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Hide scrollbar for webkit */}
        <style dangerouslySetInnerHTML={{
          __html: `
            div::-webkit-scrollbar {
              display: none;
            }
          `
        }} />

        {videos.map((video, index) => (
          <div
            key={video.id}
            data-index={index}
            className={`video-card relative ${
              isMobile 
                ? 'h-screen w-full snap-start snap-always' 
                : 'h-screen w-full'
            } flex items-center justify-center`}
          >
            <Card className="w-full h-full bg-black border-0 rounded-none overflow-hidden">
              <CardContent className="p-0 h-full relative">
                {/* Video Component */}
                <div className="h-full w-full flex items-center justify-center bg-black">
                  <OptimizedVideoCard 
                    event={video}
                    isActive={index === currentVideoIndex}
                    onNext={() => setCurrentVideoIndex(Math.min(index + 1, videos.length - 1))}
                    onPrevious={() => setCurrentVideoIndex(Math.max(index - 1, 0))}
                  />
                </div>

                {/* Video Action Buttons */}
                <div className="absolute right-4 bottom-20 flex flex-col space-y-4 z-10">
                  <VideoActionButtons 
                    event={video}
                  />
                </div>

                {/* Settings button for desktop */}
                {!isMobile && (
                  <div className="absolute top-4 right-4 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/settings')}
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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