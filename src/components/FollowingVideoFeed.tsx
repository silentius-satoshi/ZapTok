import { useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { VideoCard } from '@/components/VideoCard';
import { VideoActionButtons } from '@/components/VideoActionButtons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollowing } from '@/hooks/useFollowing';
import { useProfileCache } from '@/hooks/useProfileCache';
import { useVideoPrefetch } from '@/hooks/useVideoPrefetch';
import { useVideoCache } from '@/hooks/useVideoCache';
import { useCaching } from '@/contexts/CachingContext';
import { useCurrentVideo } from '@/contexts/CurrentVideoContext';
import { useLoginAutoRefresh } from '@/hooks/useLoginAutoRefresh';
import { validateVideoEvent, hasVideoContent, normalizeVideoUrl, type VideoEvent } from '@/lib/validateVideoEvent';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { bundleLog } from '@/lib/logBundler';
export interface FollowingVideoFeedRef {
  refresh: () => void;
}

export const FollowingVideoFeed = forwardRef<FollowingVideoFeedRef>((props, ref) => {
  const { nostr } = useNostr();
  const { currentService } = useCaching();
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setCurrentVideo } = useCurrentVideo();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const queryClient = useQueryClient();
  const lastScrollTopRef = useRef(0);

  // Auto-refresh after login
  const { justLoggedIn } = useLoginAutoRefresh();
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Lock body scroll on mobile to prevent dual scrolling
  useEffect(() => {
    if (!isMobile) return;

    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = original;
    };
  }, [isMobile]);

  // Enhanced caching hooks
  const { batchLoadProfiles } = useProfileCache();
  const { preloadThumbnails } = useVideoPrefetch();
  const { cacheVideoMetadata } = useVideoCache();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['video-feed', following.data?.pubkeys, currentService?.url],
    queryFn: async ({ pageParam, signal }) => {
      // Bundle video processing logs
      const processingStats = {
        followedAuthors: following.data?.pubkeys?.length || 0,
        rawEvents: 0,
        normalVideos: 0,
        shortVideos: 0,
        validatedEvents: 0,
        failedValidation: 0,
        noVideoUrl: 0,
        finalVideos: 0,
      };

      let events: NostrEvent[] = [];

      // Try to get videos from following list first
      if (following.data?.pubkeys?.length) {
        const eventsFromFollowing = await nostr.query([
          {
            kinds: [21, 22], // NIP-71 normal videos, NIP-71 short videos
            authors: following.data.pubkeys.slice(0, 50), // Limit authors for faster queries
            limit: 15, // Reduced for faster loading
            until: pageParam,
          }
        ], { signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) });

        events = eventsFromFollowing;
        processingStats.rawEvents = events.length;
      }

      // Filter and validate video events, removing duplicates by both event ID and video URL
      const uniqueEvents = new Map<string, NostrEvent>();
      const seenVideoUrls = new Set<string>();

      events.forEach(event => {
        // Quick filter for potential video content
        if (!hasVideoContent(event)) return;

        // Count video event types
        if (event.kind === 21) {
          processingStats.normalVideos++;
        } else if (event.kind === 22) {
          processingStats.shortVideos++;
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
        if (!videoEvent) {
          processingStats.failedValidation++;
          continue;
        }

        if (!videoEvent.videoUrl) {
          processingStats.noVideoUrl++;
          continue;
        }

        processingStats.validatedEvents++;

        // Normalize URL for comparison to catch duplicates with different parameters
        const normalizedUrl = normalizeVideoUrl(videoEvent.videoUrl);

        // Skip if we've already seen this video URL
        if (seenVideoUrls.has(normalizedUrl)) continue;

        seenVideoUrls.add(normalizedUrl);
        validatedEvents.push(videoEvent);
      }

      // Sort by creation time (most recent first)
      const videoEvents = validatedEvents.sort((a, b) => b.created_at - a.created_at);
      processingStats.finalVideos = videoEvents.length;

      // Minimal background processing for faster loading
      if (videoEvents.length > 0) {
        // Only cache video metadata (lightweight)
        cacheVideoMetadata(videoEvents);
      }

      // Log concise video processing summary
      if (import.meta.env.DEV && processingStats.finalVideos > 0) {
        bundleLog('FollowingVideoFeed', `🎬 Video Feed: ${processingStats.finalVideos} videos processed (${processingStats.followedAuthors} authors)`);
      }

      return videoEvents;
    },
    getNextPageParam: (lastPage) => {
      // Continue loading older content chronologically
      if (lastPage.length === 0) return undefined;
      const oldestEvent = lastPage[lastPage.length - 1];
      return oldestEvent.created_at;
    },
    initialPageParam: undefined as number | undefined,
    enabled: !!following.data?.pubkeys?.length, // Only run when following list is available
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    staleTime: 1000 * 60 * 2, // Reduced to 2 minutes for fresher content
    gcTime: 1000 * 60 * 5, // Keep data in cache for 5 minutes
    refetchOnMount: false, // Don't refetch when component mounts if data exists
  });

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      bundleLog('followingVideoRefresh', '🔄 Manual refresh triggered for following feed');
      
      // Reset the infinite query to start fresh and show latest videos
      await queryClient.resetQueries({ 
        queryKey: ['following-video-feed', user?.pubkey, currentService?.url] 
      });
      
      // Reset video index to show newest content
      setCurrentVideoIndex(0);
      
      // Scroll back to top
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }), [queryClient, user?.pubkey, currentService?.url]);

  // Auto-refresh following feed after login
  useEffect(() => {
    if (justLoggedIn && user?.pubkey) {
      const performAutoRefresh = async () => {
        bundleLog('followingVideoRefresh', '🚀 Auto-refresh triggered after login');
        setIsAutoRefreshing(true);
        
        try {
          // Reset the infinite query to fetch latest videos
          await queryClient.resetQueries({ 
            queryKey: ['video-feed', following.data?.pubkeys, currentService?.url] 
          });
          
          // Reset video index to start from the beginning
          setCurrentVideoIndex(0);
          
          // Scroll to top if container exists
          if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
          
          // Keep loading state for a brief moment to show feedback
          setTimeout(() => {
            setIsAutoRefreshing(false);
          }, 800);
          
        } catch (error) {
          console.error('Auto-refresh failed:', error);
          setIsAutoRefreshing(false);
        }
      };

      // Small delay to ensure following data is loaded
      const timeoutId = setTimeout(performAutoRefresh, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [justLoggedIn, user?.pubkey, queryClient, following.data?.pubkeys, currentService?.url]);

  const videos = useMemo(() => data?.pages.flat() || [], [data?.pages]);

  // Background prefetching after videos are loaded
  useEffect(() => {
    if (videos.length > 0) {
      // Use setTimeout to defer heavy operations until after render
      setTimeout(() => {
        const authorPubkeys = [...new Set(videos.map(event => event.pubkey))];
        const thumbnailUrls = videos
          .map(event => event.thumbnail)
          .filter(Boolean) as string[];

        // Background prefetch (non-blocking)
        if (authorPubkeys.length > 0) {
          batchLoadProfiles(authorPubkeys.slice(0, 20)).catch(() => {}); // Limit to 20 profiles
        }

        if (thumbnailUrls.length > 0) {
          preloadThumbnails(thumbnailUrls.slice(0, 10)); // Limit to 10 thumbnails
        }
      }, 100); // Small delay to let videos render first
    }
  }, [videos, batchLoadProfiles, preloadThumbnails]);

  // Handle keyboard navigation and scroll snapping
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

  // Function to scroll to a specific video
  const scrollToVideo = (index: number) => {
    if (containerRef.current) {
      // Calculate position for full-screen videos
      const videoHeight = window.innerHeight; // Full screen height
      const targetTop = index * videoHeight;

      containerRef.current.scrollTo({
        top: targetTop,
        behavior: 'smooth'
      });
    }
  };

  // Function to skip to next available video
  const skipToNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      const newIndex = currentVideoIndex + 1;
      setCurrentVideoIndex(newIndex);
      scrollToVideo(newIndex);
    }
  };

  // Handle scroll events with improved snap behavior
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !videos?.length) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const scrollTop = container.scrollTop;
      const videoHeight = window.innerHeight; // Full screen height

      // Calculate which video is most visible
      const newIndex = Math.round(scrollTop / videoHeight);

      // Only update if we've actually moved to a different video
      if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentVideoIndex(newIndex);
      }

      lastScrollTopRef.current = scrollTop;
    };

    // Throttled scroll handler to improve performance
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

      // Only snap if we're not already close to the target position
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

    // Use a timer to detect when scrolling has stopped
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

  // Auto-load more videos when approaching the end (balanced approach)
  useEffect(() => {
    // Only auto-load if we have a reasonable amount of videos already
    if (videos.length >= 5 && currentVideoIndex >= videos.length - 3 && hasNextPage && !isFetchingNextPage) {
      if (import.meta.env.DEV) {
        bundleLog('FollowingVideoFeed', `📖 Auto-loading more videos... (current: ${currentVideoIndex}, total: ${videos.length})`);
      }
      fetchNextPage();
    }
  }, [currentVideoIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Pull-to-refresh state
  const [pullToRefreshState, setPullToRefreshState] = useState({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
  });

  // Pull-to-refresh when scrolled to top
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobile) return;

    let startY = 0;
    let currentY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop <= 5) { // Allow small scroll tolerance
        startY = e.touches[0].clientY;
        currentY = startY;
        startTime = Date.now();
        setPullToRefreshState(prev => ({ ...prev, isPulling: false, pullDistance: 0 }));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (container.scrollTop <= 5 && startY > 0 && !pullToRefreshState.isRefreshing) {
        currentY = e.touches[0].clientY;
        const pullDistance = Math.max(0, currentY - startY);
        
        if (pullDistance > 20) { // Start showing pull feedback after 20px
          e.preventDefault(); // Prevent native pull-to-refresh
          setPullToRefreshState(prev => ({
            ...prev,
            isPulling: true,
            pullDistance: Math.min(pullDistance, 150) // Cap at 150px
          }));
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullToRefreshState.isPulling && pullToRefreshState.pullDistance > 100 && !pullToRefreshState.isRefreshing) {
        setPullToRefreshState(prev => ({ ...prev, isRefreshing: true }));
        
        try {
          bundleLog('FollowingVideoFeed', '🔄 Pull-to-refresh triggered - refreshing feed data');
          
          // Reset queries to get fresh data
          await queryClient.resetQueries({ 
            queryKey: ['following-video-feed', user?.pubkey, currentService?.url] 
          });
          
          // Reset video index to show newest content
          setCurrentVideoIndex(0);
          
          // Scroll back to top smoothly
          container.scrollTo({ top: 0, behavior: 'smooth' });
          
          // Add slight delay for UX feedback
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Pull-to-refresh failed:', error);
        } finally {
          setPullToRefreshState({ isPulling: false, pullDistance: 0, isRefreshing: false });
        }
      } else {
        setPullToRefreshState({ isPulling: false, pullDistance: 0, isRefreshing: false });
      }
      
      startY = 0;
      currentY = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, queryClient, user?.pubkey, currentService?.url, pullToRefreshState.isPulling, pullToRefreshState.pullDistance, pullToRefreshState.isRefreshing]);

  // Show loading state while fetching following list or videos
  if (following.isLoading || isLoading || isAutoRefreshing) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">
            {isAutoRefreshing 
              ? "Refreshing your feed..." 
              : "Loading your personalized feed..."
            }
          </p>
        </div>
      </div>
    );
  }

  // Show empty state if user is not logged in
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Card className="border-dashed border-gray-700 bg-gray-900/50">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold text-white">Welcome to ZapTok</h2>
              <p className="text-gray-400">
                Please log in to see videos from people you follow
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show empty state if user has no following list
  if (!following.data?.pubkeys?.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Card className="border-dashed border-gray-700 bg-gray-900/50">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-2xl font-bold text-white">No Following List</h2>
              <p className="text-gray-400">
                Follow some users first to see their video content in your personalized feed
              </p>
              <p className="text-sm text-gray-500">
                You can manage your following list from your profile settings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show empty state if no video content found from following list
  if (error || videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Card className="border-dashed border-gray-700 bg-gray-900/50">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold text-white">No Videos Found</h2>
              <p className="text-gray-400">
                None of the people you follow have posted video content yet
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Check back later or follow more creators who share videos
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
      {/* Pull-to-refresh indicator for mobile */}
      {isMobile && (pullToRefreshState.isPulling || pullToRefreshState.isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-200"
          style={{
            height: `${Math.min(pullToRefreshState.pullDistance * 0.6, 90)}px`,
            transform: `translateY(${pullToRefreshState.isRefreshing ? 0 : -10}px)`,
            opacity: pullToRefreshState.isRefreshing ? 1 : Math.min(pullToRefreshState.pullDistance / 100, 1)
          }}
        >
          <div className="flex flex-col items-center space-y-2">
            {pullToRefreshState.isRefreshing ? (
              <>
                <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-300 font-medium">Refreshing...</span>
              </>
            ) : (
              <>
                <div 
                  className="w-6 h-6 text-gray-300 transition-transform duration-200"
                  style={{
                    transform: `rotate(${Math.min(pullToRefreshState.pullDistance * 1.8, 180)}deg)`
                  }}
                >
                  ↓
                </div>
                <span className="text-xs text-gray-300 font-medium">
                  {pullToRefreshState.pullDistance > 100 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Auto-refresh indicator after login */}
      {isAutoRefreshing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-black/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center space-x-2 border border-pink-500/20 shadow-lg">
          <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white text-sm font-medium">Refreshing your feed...</span>
        </div>
      )}
      
      <div
        ref={containerRef}
        className={
          isMobile
            ? "mobile-feed-scroller"
            : "h-screen overflow-y-auto scrollbar-hide bg-black snap-y snap-mandatory relative"
        }
        style={{
          scrollBehavior: 'smooth'
        }}
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
              <div className={`flex w-full items-end h-full ${isMobile ? 'flex-col relative' : 'gap-6 justify-center'}`}>
                {/* Video Container - Full height from top to bottom */}
                <div className={`overflow-hidden bg-black shadow-2xl hover:shadow-3xl transition-all duration-300 ${
                  isMobile
                    ? 'w-full h-full border-none'
                    : 'h-full rounded-3xl border-2 border-gray-800 max-w-[min(85vh,90vw)] w-auto'
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
                    onVideoUnavailable={index === currentVideoIndex ? skipToNextVideo : undefined}
                  />
                </div>

                {/* Action Buttons - Mobile: overlay on video, Desktop: outside to the right */}
                <div className={isMobile
                  ? 'absolute right-1 bottom-4 z-10'
                  : 'flex items-end pb-8 ml-4'
                }>
                  <VideoActionButtons
                    event={video}
                  />
                </div>
              </div>
            </div>
          ))}

          {isFetchingNextPage && (
            <div className={isMobile ? "mobile-video-item flex items-center justify-center" : "h-screen flex items-center justify-center"}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading more videos...</p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
});

FollowingVideoFeed.displayName = 'FollowingVideoFeed';
