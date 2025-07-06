import { useRef, useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { VideoCard } from '@/components/VideoCard';
import { Skeleton } from '@/components/ui/skeleton';
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

  const videos = data?.pages.flat() || [];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && currentVideoIndex > 0) {
        setCurrentVideoIndex(prev => prev - 1);
      } else if (e.key === 'ArrowDown' && currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVideoIndex, videos.length]);

  // Auto-load more videos when approaching the end
  useEffect(() => {
    if (currentVideoIndex >= videos.length - 3 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentVideoIndex, videos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800">
            <CardContent className="p-0">
              <Skeleton className="w-full h-96 bg-gray-800" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-gray-700" />
                <Skeleton className="h-3 w-1/2 bg-gray-700" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-8">
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
      className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide"
    >
      {videos.map((video, index) => (
        <div
          key={video.id}
          className="h-screen snap-start flex items-center justify-center relative"
        >
          <VideoCard
            event={video}
            isActive={index === currentVideoIndex}
            onNext={() => setCurrentVideoIndex(index + 1)}
            onPrevious={() => setCurrentVideoIndex(index - 1)}
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
