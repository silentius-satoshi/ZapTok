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
import { validateVideoEvent, hasVideoContent, normalizeVideoUrl, type VideoEvent } from '@/lib/validateVideoEvent';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNavigate } from 'react-router-dom';
export function VideoFeed() {
  const { nostr } = useNostr();
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
    queryKey: ['video-feed', following.data?.pubkeys],
    queryFn: async ({ pageParam, signal }) => {
      // Only fetch videos if user has following list
      if (!following.data?.pubkeys?.length) {
        return [];
      }

      const events = await nostr.query([
        {
          kinds: [1, 1063], // Text notes and file metadata
          authors: following.data.pubkeys, // Only from followed users
          '#t': ['video', 'content', 'entertainment'],
          limit: 10,
          until: pageParam,
        }
      ], { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) });

      // Filter and validate video events, removing duplicates by both event ID and video URL
      const uniqueEvents = new Map<string, NostrEvent>();
      const seenVideoUrls = new Set<string>();
      
      events.forEach(event => {
        // Quick filter for potential video content
        if (!hasVideoContent(event)) return;
        
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

      // Enhanced caching and prefetching
      if (videoEvents.length > 0) {
        // Cache video metadata for offline access
        cacheVideoMetadata(videoEvents);
        
        // Extract author pubkeys for profile prefetching
        const authorPubkeys = [...new Set(videoEvents.map(event => event.pubkey))];
        
        // Batch load profiles in background (non-blocking)
        batchLoadProfiles(authorPubkeys).catch(error => {
          console.warn('Profile prefetch failed:', error);
        });
        
        // Preload thumbnails for smooth scrolling
        const thumbnailUrls = videoEvents
          .map(event => event.thumbnail)
          .filter(Boolean) as string[];
        
        if (thumbnailUrls.length > 0) {
          preloadThumbnails(thumbnailUrls);
        }
      }

      return videoEvents;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
    initialPageParam: undefined as number | undefined,
    enabled: !!following.data?.pubkeys?.length, // Only run when following list is available
  });

  const videos = useMemo(() => data?.pages.flat() || [], [data?.pages]);

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

  // Auto-load more videos when approaching the end
  useEffect(() => {
    if (currentVideoIndex >= videos.length - 3 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentVideoIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Show loading state while fetching following list or videos
  if (following.isLoading || (following.data?.pubkeys?.length && isLoading)) {
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
      className="h-screen overflow-y-auto scrollbar-hide bg-black snap-y snap-mandatory"
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
