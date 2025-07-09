import { useRef, useEffect, useState, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { VideoCard } from '@/components/VideoCard';
import { Card, CardContent } from '@/components/ui/card';
import { RelaySelector } from '@/components/RelaySelector';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoEvent extends NostrEvent {
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
}

function validateVideoEvent(event: NostrEvent): VideoEvent | null {
  // Check for video content in imeta tags or content
  const imetaTags = event.tags.filter(([name]) => name === 'imeta');
  const videoUrl = imetaTags.find(([, , mime]) => mime?.startsWith('video/'))?.[1];
  
  if (!videoUrl && !event.content.includes('mp4') && !event.content.includes('webm')) {
    return null;
  }

  const titleTag = event.tags.find(([name]) => name === 'title')?.[1];
  const summaryTag = event.tags.find(([name]) => name === 'summary')?.[1];
  const thumbnailTag = event.tags.find(([name]) => name === 'image')?.[1];

  return {
    ...event,
    videoUrl: videoUrl || extractVideoUrl(event.content),
    thumbnail: thumbnailTag,
    title: titleTag || extractTitle(event.content),
    description: summaryTag || event.content.substring(0, 200),
  };
}

function extractVideoUrl(content: string): string | undefined {
  const urlRegex = /(https?:\/\/[^\s]+\.(mp4|webm|mov))/i;
  const match = content.match(urlRegex);
  return match?.[0];
}

function extractTitle(content: string): string {
  const lines = content.split('\n');
  return lines[0].substring(0, 50) + (lines[0].length > 50 ? '...' : '');
}

export function VideoFeed() {
  const { nostr } = useNostr();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['video-feed'],
    queryFn: async ({ pageParam, signal }) => {
      const events = await nostr.query([
        {
          kinds: [1, 1063], // Text notes and file metadata
          '#t': ['video', 'content', 'entertainment'],
          limit: 10,
          until: pageParam,
        }
      ], { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) });

      // Filter and validate video events
      const videoEvents = events
        .map(validateVideoEvent)
        .filter((event): event is VideoEvent => event !== null)
        .sort((a, b) => b.created_at - a.created_at);

      return videoEvents;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
    initialPageParam: undefined as number | undefined,
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
      containerRef.current.scrollTo({
        top: index * window.innerHeight,
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
      const windowHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / windowHeight);
      
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
      const windowHeight = container.clientHeight;
      const targetIndex = Math.round(scrollTop / windowHeight);
      const targetScrollTop = targetIndex * windowHeight;
      
      // Only snap if we're not already perfectly aligned
      if (Math.abs(scrollTop - targetScrollTop) > 5) {
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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Card className="border-dashed border-gray-700 bg-gray-900/50">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-gray-400 text-lg">
                No videos found. Try a different relay?
              </p>
              <RelaySelector className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-y-auto scrollbar-hide"
      style={{
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth'
      }}
    >
      {videos.map((video, index) => (
        <div
          key={video.id}
          className="h-screen snap-start"
          style={{ scrollSnapAlign: 'start' }}
        >
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
      ))}
      
      {isFetchingNextPage && (
        <div className="h-screen snap-start flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading more videos...</p>
          </div>
        </div>
      )}
    </div>
  );
}
