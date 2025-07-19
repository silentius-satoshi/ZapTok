import { useRef, useEffect, useState, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
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
import { validateVideoEvent, hasVideoContent, normalizeVideoUrl, type VideoEvent } from '@/lib/validateVideoEvent';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNavigate } from 'react-router-dom';
export function VideoFeed() {
  const { nostr } = useNostr();
  const { currentService } = useCaching();
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
  const navigate = useNavigate();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);

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
      console.log(`🔍 Fetching videos from configured relays`);
      
      let events: NostrEvent[] = [];
      
      // Try to get videos from following list first
      if (following.data?.pubkeys?.length) {
        console.log(`� Querying ${following.data.pubkeys.length} followed authors`);
        
        const eventsFromFollowing = await nostr.query([
          {
            kinds: [21, 22], // NIP-71 normal videos, NIP-71 short videos
            authors: following.data.pubkeys.slice(0, 50), // Limit authors for faster queries
            limit: 15, // Reduced for faster loading
            until: pageParam,
          }
        ], { signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) });
        
        events = eventsFromFollowing;
        console.log(`📋 Found ${events.length} events from following list`);
      }

      // Filter and validate video events, removing duplicates by both event ID and video URL
      const uniqueEvents = new Map<string, NostrEvent>();
      const seenVideoUrls = new Set<string>();
      
      events.forEach(event => {
        // Quick filter for potential video content
        if (!hasVideoContent(event)) return;
        
        // Log what types of video events we're finding
        if (event.kind === 21) {
          console.log('📹 Found NIP-71 normal video event:', event.content.substring(0, 50));
        } else if (event.kind === 22) {
          console.log('📱 Found NIP-71 short video event:', event.content.substring(0, 50));
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
        if (!videoEvent || !videoEvent.videoUrl) continue;
        
        // Normalize URL for comparison to catch duplicates with different parameters
        const normalizedUrl = normalizeVideoUrl(videoEvent.videoUrl);
        
        // Skip if we've already seen this video URL
        if (seenVideoUrls.has(normalizedUrl)) continue;
        
        seenVideoUrls.add(normalizedUrl);
        validatedEvents.push(videoEvent);
      }

      // Sort by creation time (most recent first)
      const videoEvents = validatedEvents.sort((a, b) => b.created_at - a.created_at);

      // Minimal background processing for faster loading
      if (videoEvents.length > 0) {
        // Only cache video metadata (lightweight)
        cacheVideoMetadata(videoEvents);
        
        // Skip heavy prefetching operations for faster initial load
        // These can be done after the videos are displayed
      }

      console.log(`⚡ Processed ${videoEvents.length} videos in current batch`);
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
  }, [videos.length, batchLoadProfiles, preloadThumbnails]);

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
      console.log(`📖 Auto-loading more videos... (current: ${currentVideoIndex}, total: ${videos.length})`);
      fetchNextPage();
    }
  }, [currentVideoIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Pull-to-refresh when scrolled to top
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isRefreshing = false;
    let startY = 0;
    let pullDistance = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (container.scrollTop === 0 && startY > 0) {
        pullDistance = e.touches[0].clientY - startY;
        if (pullDistance > 100 && !isRefreshing) {
          isRefreshing = true;
          console.log('🔄 Pull-to-refresh triggered');
          // Refetch first page to get newer content
          setTimeout(() => {
            window.location.reload(); // Simple refresh for now
          }, 300);
        }
      }
    };

    const handleTouchEnd = () => {
      startY = 0;
      pullDistance = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Show loading state while fetching following list or videos
  if (following.isLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your personalized feed...</p>
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
      ref={containerRef}
      className="h-screen overflow-y-auto scrollbar-hide bg-black snap-y snap-mandatory relative"
      style={{
        scrollBehavior: 'smooth'
      }}
    >
      {videos.map((video, index) => (
        <div
          key={`${video.id}-${index}`}
          className="h-screen flex items-center justify-center snap-start px-6"
        >
          <div className="flex gap-6 w-full max-w-2xl items-end h-full py-4">
            {/* Video Container - Full height from top to bottom */}
            <div className="flex-1 h-full overflow-hidden rounded-3xl border-2 border-gray-800 bg-black shadow-2xl hover:shadow-3xl transition-all duration-300">
              <VideoCard
                event={video}
                isActive={index === currentVideoIndex}
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
            
            {/* Action Buttons - Outside and to the right of video */}
            <div className="flex items-end pb-8">
              <VideoActionButtons
                event={video}
              />
            </div>
          </div>
        </div>
      ))}
      
      {isFetchingNextPage && (
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading more videos...</p>
          </div>
        </div>
      )}
    </div>
  );
}
