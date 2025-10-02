import { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { OptimizedVideoCard } from '@/components/OptimizedVideoCard';
import { useOptimizedFollowingVideoFeed } from '@/hooks/useOptimizedVideoFeed';
import { VideoActionButtons } from '@/components/VideoActionButtons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollowing } from '@/hooks/useFollowing';
import { useCurrentVideo } from '@/contexts/CurrentVideoContext';
import { useLoginAutoRefresh } from '@/hooks/useLoginAutoRefresh';
import { type VideoEvent } from '@/lib/validateVideoEvent';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { bundleLog } from '@/lib/logBundler';

export interface FollowingVideoFeedRef {
  refresh: () => void;
}

export const FollowingVideoFeed = forwardRef<FollowingVideoFeedRef>((props, ref) => {
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setCurrentVideo } = useCurrentVideo();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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

  // Use optimized feed with smart pagination and rate limiting
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useOptimizedFollowingVideoFeed({
    pageSize: 15, // Reasonable page size
    maxAuthors: 50, // Prevent huge queries
    cacheDuration: 3 * 60 * 1000, // 3 minutes
  });

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      bundleLog('followingVideoRefresh', '🔄 Manual refresh triggered for following feed');

      // Reset the infinite query to start fresh and show latest videos
      await queryClient.resetQueries({
        queryKey: ['optimized-following-feed']
      });

      // Reset video index to show newest content
      setCurrentVideoIndex(0);

      // Scroll back to top
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }), [queryClient]);

  // Auto-refresh following feed after login
  useEffect(() => {
    if (justLoggedIn && user?.pubkey) {
      bundleLog('loginAutoRefresh', '🔄 Auto-refreshing following feed after login');
      queryClient.resetQueries({ queryKey: ['optimized-following-feed'] });
    }
  }, [justLoggedIn, user?.pubkey, queryClient]);

  // Flatten all pages into single array
  const allVideos = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.videos);
  }, [data?.pages]);

  // Set current video in context
  useEffect(() => {
    if (allVideos.length > 0 && currentVideoIndex < allVideos.length) {
      setCurrentVideo(allVideos[currentVideoIndex]);
    }
  }, [allVideos, currentVideoIndex, setCurrentVideo]);

  // Scroll to video when index changes programmatically
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use requestAnimationFrame for smooth scrolling
    const scrollToVideo = () => {
      const targetScrollTop = currentVideoIndex * window.innerHeight;
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    };

    requestAnimationFrame(scrollToVideo);
  }, [currentVideoIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setCurrentVideoIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setCurrentVideoIndex(prev => Math.min(allVideos.length - 1, prev + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allVideos.length]);

  // Smart scroll handling with intersection observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-video-index') || '0');
            setCurrentVideoIndex(index);

            // Load more when approaching end
            if (index >= allVideos.length - 3 && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6, // Video is 60% visible
      }
    );

    // Observe all video elements
    const videoElements = container.querySelectorAll('[data-video-index]');
    videoElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [allVideos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading your feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Feed Error</h3>
            <p className="text-muted-foreground mb-4">
              {error.message.includes('too many')
                ? 'Too many requests to relay. Please wait a moment and try again.'
                : 'Unable to load your feed. Please check your connection and try again.'
              }
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!following.data?.pubkeys?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Your Following Feed is Empty</h2>
          <p className="text-muted-foreground max-w-md">
            Follow some creators to see their video content here. Start by exploring the Discover page!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/discover')} className="min-w-[120px]">
              Discover Videos
            </Button>
            <Button onClick={() => navigate('/settings')} variant="outline" className="min-w-[120px]">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (allVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No Videos Yet</h2>
          <p className="text-muted-foreground max-w-md">
            The creators you follow haven't posted any videos recently. Check back later or discover new content!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/discover')} className="min-w-[120px]">
              Discover Videos
            </Button>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['optimized-following-feed'] })}
              variant="outline"
              className="min-w-[120px]"
            >
              Refresh Feed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Video Container */}
      <div
        ref={containerRef}
        className={`h-full ${
          isMobile
            ? 'snap-y snap-mandatory overflow-y-auto'
            : 'overflow-hidden'
        } scrollbar-hide`}
        style={{ scrollBehavior: 'smooth' }}
      >
        {allVideos.map((video, index) => (
          <div
            key={video.id}
            data-video-index={index}
            className={`${
              isMobile
                ? 'h-full snap-start snap-always'
                : 'h-full'
            } flex items-center justify-center relative`}
            style={{
              display: isMobile ? 'flex' : (index === currentVideoIndex ? 'flex' : 'none')
            }}
          >
            {/* Optimized Video Card with lazy loading */}
            <div className="relative w-full max-w-md mx-auto h-full flex items-center">
              <OptimizedVideoCard
                event={video}
                isActive={index === currentVideoIndex}
                onNext={() => setCurrentVideoIndex(Math.min(index + 1, allVideos.length - 1))}
                onPrevious={() => setCurrentVideoIndex(Math.max(index - 1, 0))}
                lazy={Math.abs(index - currentVideoIndex) > 2} // Lazy load videos far from current
                preloadDistance={isMobile ? 100 : 200}
                enableEngagementData={index === currentVideoIndex} // Only load engagement for active video
              />

              {/* Video Action Buttons - Only for active video */}
              {index === currentVideoIndex && (
                <div className="absolute right-4 bottom-20 z-10">
                  <VideoActionButtons
                    event={video}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator for pagination */}
        {isFetchingNextPage && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading more videos...</span>
          </div>
        )}
      </div>

      {/* Navigation indicators for desktop */}
      {!isMobile && allVideos.length > 1 && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2 z-20">
          {allVideos.slice(0, 5).map((_, index) => (
            <div
              key={index}
              className={`w-1 h-8 rounded-full cursor-pointer transition-colors ${
                index === currentVideoIndex
                  ? 'bg-white'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              onClick={() => setCurrentVideoIndex(index)}
            />
          ))}
          {allVideos.length > 5 && (
            <div className="text-white/60 text-xs text-center mt-2">
              +{allVideos.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FollowingVideoFeed.displayName = 'FollowingVideoFeed';