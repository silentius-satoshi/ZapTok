import { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { VideoCard } from '@/components/VideoCard';
import { VideoActionButtons } from '@/components/VideoActionButtons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProfileCache } from '@/hooks/useProfileCache';
import { useVideoPrefetch } from '@/hooks/useVideoPrefetch';
import { useCurrentVideo } from '@/contexts/CurrentVideoContext';
import { useOptimizedGlobalVideoFeed } from '@/hooks/useOptimizedGlobalVideoFeed';
import { useInitializeAnalyticsServices } from '@/hooks/useInitializeAnalyticsServices';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { devLog } from '@/lib/devConsole';
import { bundleLog } from '@/lib/logBundler';
import { ZapTokLogo } from '@/components/ZapTokLogo';
import { filterValidVideos } from '@/lib/videoValidation';
import { brokenVideoTracker } from '@/services/brokenVideoTracker';

export interface GlobalVideoFeedRef {
  refresh: () => void;
}

export const GlobalVideoFeed = forwardRef<GlobalVideoFeedRef>((props, ref) => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setCurrentVideo } = useCurrentVideo();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  
  // Track failed video IDs to filter them out from rendering
  const [failedVideoIds, setFailedVideoIds] = useState<Set<string>>(new Set());

  // Initialize analytics services for feed-level prefetching
  // This enables comments, reposts, and reactions to batch together
  useInitializeAnalyticsServices();

  // Lock body scroll on mobile to prevent dual scrolling
  useEffect(() => {
    if (!isMobile) return;

    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = original;
    };
  }, [isMobile]);

  // Pull-to-refresh state
  const [pullToRefreshState, setPullToRefreshState] = useState({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
  });

  // Enhanced caching hooks
  const { batchLoadProfiles } = useProfileCache();
  const { preloadThumbnails } = useVideoPrefetch();

  // Use optimized global video feed with rate limiting and real-time updates
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
    newVideosCount,
    mergeNewVideos,
  } = useOptimizedGlobalVideoFeed();

  // Flatten pages into a single array of videos and filter out invalid sources
  const videos = useMemo(() => {
    const allVideos = data?.pages.flatMap(page => page) || [];
    // Filter out videos with no working sources AND videos that have failed to load
    // Use brokenVideoTracker for persistent filtering across sessions
    return brokenVideoTracker.filterBrokenVideos(
      filterValidVideos(allVideos).filter(video => !failedVideoIds.has(video.id))
    );
  }, [data, failedVideoIds]);

  // Manual load more function to match timeline API
  const loadMore = async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  };
  const refreshFeed = () => refetch();

  // Handle merging new videos and scroll to top
  const handleMergeNewVideos = () => {
    bundleLog('globalVideoMerge', '🌍🔼 Merging new videos and scrolling to top');
    
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

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      bundleLog('globalVideoRefresh', '🔄 Manual refresh triggered for global feed');
      
      // Set refreshing state
      setPullToRefreshState(prev => ({ ...prev, isRefreshing: true }));
      
      // Reset video index to start
      setCurrentVideoIndex(0);
      
      // Use timeline service refresh
      refreshFeed();
      
      // Brief delay to show refresh feedback
      setTimeout(() => {
        setPullToRefreshState(prev => ({ 
          ...prev, 
          isRefreshing: false, 
          isPulling: false, 
          pullDistance: 0 
        }));
      }, 500);
    }
  }), [refreshFeed, setCurrentVideoIndex]);

  // Background prefetching
  useEffect(() => {
    if (videos.length > 0) {
      setTimeout(() => {
        const authorPubkeys = [...new Set(videos.map(event => event.pubkey))];
        const thumbnailUrls = videos
          .map(event => event.thumbnail)
          .filter(Boolean) as string[];

        if (authorPubkeys.length > 0) {
          batchLoadProfiles(authorPubkeys.slice(0, 20)).catch(() => {});
        }

        if (thumbnailUrls.length > 0) {
          preloadThumbnails(thumbnailUrls.slice(0, 10));
        }
      }, 100);
    }
  }, [videos, batchLoadProfiles, preloadThumbnails]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && currentVideoIndex > 0) {
        const newIndex = currentVideoIndex - 1;
        setCurrentVideoIndex(newIndex);
        scrollToVideo(newIndex);
      } else if (e.key === 'ArrowDown' && currentVideoIndex < videos.length - 1) {
        const newIndex = currentVideoIndex + 1;
        setCurrentVideoIndex(newIndex);
        scrollToVideo(newIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVideoIndex, videos.length]);

  // Update current video context when index changes
  useEffect(() => {
    if (videos.length > 0 && currentVideoIndex >= 0 && currentVideoIndex < videos.length) {
      setCurrentVideo(videos[currentVideoIndex]);
    } else {
      setCurrentVideo(null);
    }
  }, [currentVideoIndex, videos, setCurrentVideo]);

  // Intersection observer for video autoplay on mobile
  useEffect(() => {
    if (!isMobile || !containerRef.current || !videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const videoElement = entry.target.querySelector('video');
          if (!videoElement) return;

          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Video is more than 50% visible - play it
            videoElement.play().catch(() => {
              // Autoplay failed, user interaction required
            });

            // Update current video context
            const videoIndex = parseInt(entry.target.getAttribute('data-video-index') || '0');
            if (videos[videoIndex]) {
              setCurrentVideo(videos[videoIndex]);
              setCurrentVideoIndex(videoIndex);
            }
          } else {
            // Video is not prominently visible - pause it
            videoElement.pause();
          }
        });
      },
      {
        root: containerRef.current,
        threshold: [0, 0.5, 1],
        rootMargin: '-10% 0px -10% 0px'
      }
    );

    // Observe all video items
    const videoItems = containerRef.current.querySelectorAll('.mobile-video-item');
    videoItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [isMobile, videos, setCurrentVideo, setCurrentVideoIndex]);

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

  // Scroll handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !videos?.length) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollTop = container.scrollTop;
      const videoHeight = window.innerHeight;
      const newIndex = Math.round(scrollTop / videoHeight);

      if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentVideoIndex(newIndex);
      }

      lastScrollTopRef.current = scrollTop;
    };

    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleScrollEnd = () => {
      if (isScrollingRef.current) return;

      const scrollTop = container.scrollTop;
      const videoHeight = window.innerHeight;
      const targetIndex = Math.round(scrollTop / videoHeight);
      const targetScrollTop = targetIndex * videoHeight;

      if (Math.abs(scrollTop - targetScrollTop) > 10) {
        isScrollingRef.current = true;
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });

        setTimeout(() => {
          isScrollingRef.current = false;
        }, 300);
      }
    };

    let scrollTimer: NodeJS.Timeout;
    const handleScrollWithTimer = () => {
      throttledHandleScroll();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(handleScrollEnd, 150);
    };

    container.addEventListener('scroll', handleScrollWithTimer, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScrollWithTimer);
      clearTimeout(scrollTimer);
    };
  }, [videos, currentVideoIndex]);

  // Pull-to-refresh touch handlers
  useEffect(() => {
    if (!isMobile) return;

    const container = document.querySelector('.video-container') as HTMLElement;
    if (!container) return;

    let startY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        isDragging = true;
        setPullToRefreshState(prev => ({ ...prev, isPulling: true }));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || container.scrollTop > 0) return;

      const currentY = e.touches[0].clientY;
      const pullDistance = Math.max(0, currentY - startY);

      if (pullDistance > 0) {
        // Prevent native browser pull-to-refresh
        e.preventDefault();
        
        // Update pull distance with some resistance
        const adjustedDistance = Math.min(pullDistance * 0.4, 100);
        setPullToRefreshState(prev => ({ 
          ...prev, 
          pullDistance: adjustedDistance 
        }));
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging) return;
      
      isDragging = false;
      
      if (pullToRefreshState.pullDistance > 50) {
        // Trigger refresh
        setPullToRefreshState(prev => ({ ...prev, isRefreshing: true }));
        
        // Reset video index to start
        setCurrentVideoIndex(0);
        
        // Use timeline service refresh
        refreshFeed();
        
        // Brief delay to show refresh feedback
        setTimeout(() => {
          setPullToRefreshState({ 
            isPulling: false, 
            pullDistance: 0, 
            isRefreshing: false 
          });
        }, 500);
      } else {
        // Reset state
        setPullToRefreshState({ 
          isPulling: false, 
          pullDistance: 0, 
          isRefreshing: false 
        });
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, pullToRefreshState.pullDistance, refreshFeed, setCurrentVideoIndex]);

  // Auto-load more videos
  useEffect(() => {
    if (videos.length >= 5 && currentVideoIndex >= videos.length - 3 && hasNextPage && !isLoading) {
      devLog(`📖 Auto-loading more global videos... (current: ${currentVideoIndex}, total: ${videos.length})`);
      loadMore();
    }
  }, [currentVideoIndex, videos.length, hasNextPage, isLoading, loadMore]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-pulse">
            <ZapTokLogo size={80} className="opacity-80" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium text-white">Loading global feed...</h3>
            <p className="text-gray-400 text-sm">
              Discovering the latest videos from across the network...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (error || videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Card className="border-dashed border-gray-700 bg-gray-900/50">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-6xl mb-4">🌍</div>
              <h2 className="text-2xl font-bold text-white">No Global Videos Found</h2>
              <p className="text-gray-400">
                No NIP-71 video content available from current relays
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Try switching to a different relay or check back later
              </p>
              <Button
                onClick={() => navigate('/settings?section=network')}
                variant="outline"
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Relays
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={
        isMobile
          ? "mobile-feed-container"
          : "relative w-full h-full"
      }
    >
      {/* Pull-to-refresh indicator */}
      {isMobile && (pullToRefreshState.isPulling || pullToRefreshState.isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pb-2"
          style={{
            transform: `translateY(${pullToRefreshState.pullDistance - 60}px)`,
            opacity: pullToRefreshState.pullDistance / 50,
          }}
        >
          <div className="bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <div 
              className={`w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full ${
                pullToRefreshState.isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: pullToRefreshState.isRefreshing 
                  ? 'rotate(0deg)' 
                  : `rotate(${pullToRefreshState.pullDistance * 3.6}deg)`
              }}
            />
            <span className="text-white text-sm font-medium">
              {pullToRefreshState.isRefreshing 
                ? 'Refreshing...' 
                : pullToRefreshState.pullDistance > 50 
                ? 'Release to refresh' 
                : 'Pull to refresh'
              }
            </span>
          </div>
        </div>
      )}

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
                    onVideoUnavailable={() => {
                      // Mark video as failed to prevent re-rendering
                      setFailedVideoIds(prev => new Set(prev).add(video.id));
                      
                      // The video will be automatically filtered out by the useMemo above
                      // causing the feed to re-render without this video, and the current index
                      // will now point to the next video in the list
                      if (import.meta.env.DEV) {
                        bundleLog('GlobalVideoFeed', `🚫 Video ${video.id.slice(0, 8)} marked as failed and filtered out`);
                      }
                    }}
                  />
                </div>

                <div className={isMobile
                  ? 'absolute right-1 bottom-4 z-10'
                  : 'flex items-end pb-8'
                }>
                  <VideoActionButtons event={video} />
                </div>
              </div>
            </div>
          ))}

          {/* Timeline service loads more in background - no loading indicator needed */}
      </div>
    </div>
  );
});

GlobalVideoFeed.displayName = 'GlobalVideoFeed';
