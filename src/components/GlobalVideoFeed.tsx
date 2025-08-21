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
import { useCurrentVideo } from '@/contexts/CurrentVideoContext';
import { validateVideoEvent, hasVideoContent, normalizeVideoUrl, type VideoEvent } from '@/lib/validateVideoEvent';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';

export function GlobalVideoFeed() {
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
  const lastScrollTopRef = useRef(0);

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
    queryKey: ['global-video-feed', currentService?.url],
    queryFn: async ({ pageParam, signal }) => {
      console.log(`🌍 Fetching global video content`);
      
      // Get global video content from all users
      const events = await nostr.query([
        {
          kinds: [21, 22], // NIP-71 normal videos, NIP-71 short videos
          limit: 20,
          until: pageParam,
        }
      ], { signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) });

      console.log(`🌍 Found ${events.length} global video events`);

      // Filter out videos from users we're already following to avoid duplicates
      const followedPubkeys = new Set(following.data?.pubkeys || []);
      const unfollowedEvents = events.filter(event => !followedPubkeys.has(event.pubkey));

      console.log(`🌍 Filtered to ${unfollowedEvents.length} videos from unfollowed users`);

      // Filter and validate video events
      const uniqueEvents = new Map<string, NostrEvent>();
      const seenVideoUrls = new Set<string>();
      
      unfollowedEvents.forEach(event => {
        if (!hasVideoContent(event)) return;
        
        // Log what types of video events we're finding
        if (event.kind === 21) {
          console.log('🌍📹 Found NIP-71 normal video event:', event.content.substring(0, 50));
        } else if (event.kind === 22) {
          console.log('🌍📱 Found NIP-71 short video event:', event.content.substring(0, 50));
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
        
        console.log(`🌍✅ Valid global video event [kind ${event.kind}]:`, videoEvent.title || 'No title');
        
        // Normalize URL for comparison
        const normalizedUrl = normalizeVideoUrl(videoEvent.videoUrl);
        if (seenVideoUrls.has(normalizedUrl)) continue;
        
        seenVideoUrls.add(normalizedUrl);
        validatedEvents.push(videoEvent);
      }

      // Sort by creation time (most recent first)
      const videoEvents = validatedEvents.sort((a, b) => b.created_at - a.created_at);

      if (videoEvents.length > 0) {
        cacheVideoMetadata(videoEvents);
      }

      console.log(`⚡ Processed ${videoEvents.length} global videos in current batch`);
      return videoEvents;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      const oldestEvent = lastPage[lastPage.length - 1];
      return oldestEvent.created_at;
    },
    initialPageParam: undefined as number | undefined,
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: false,
  });

  const videos = useMemo(() => data?.pages.flat() || [], [data?.pages]);

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

  // Auto-load more videos
  useEffect(() => {
    if (videos.length >= 5 && currentVideoIndex >= videos.length - 3 && hasNextPage && !isFetchingNextPage) {
      console.log(`📖 Auto-loading more global videos... (current: ${currentVideoIndex}, total: ${videos.length})`);
      fetchNextPage();
    }
  }, [currentVideoIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading global video feed...</p>
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
      <div 
        ref={containerRef}
        className={
          isMobile
            ? "mobile-feed-scroller"
            : "h-screen overflow-y-auto scrollbar-hide bg-black snap-y snap-mandatory relative"
        }
        style={{ scrollBehavior: 'smooth' }}
      >
        {videos.map((video, index) => (
          <div
            key={`${video.id}-${index}`}
            className={
              isMobile
                ? "mobile-video-item"
                : "h-screen flex items-center justify-center snap-start"
            }
            >
              <div className={`flex w-full items-end h-full py-4 ${isMobile ? 'flex-col relative px-4' : 'gap-6 max-w-2xl'}`}>
                <div className={`overflow-hidden bg-black shadow-2xl hover:shadow-3xl transition-all duration-300 ${
                  isMobile 
                    ? 'w-full h-full rounded-2xl border border-gray-800' 
                    : 'flex-1 h-full rounded-3xl border-2 border-gray-800'
                }`}>
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
                
                <div className={isMobile 
                  ? 'absolute right-4 bottom-20 z-10' 
                  : 'flex items-end pb-8'
                }>
                  <VideoActionButtons event={video} />
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
}
