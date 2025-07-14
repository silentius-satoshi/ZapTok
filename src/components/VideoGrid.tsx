import { useState } from 'react';
import { VideoCard } from '@/components/VideoCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useBookmarkVideo } from '@/hooks/useBookmarks';
import type { VideoEvent } from '@/lib/validateVideoEvent';

interface VideoGridProps {
  videos: VideoEvent[];
  isLoading?: boolean;
  emptyMessage?: string;
  allowRemove?: boolean; // New prop to enable bookmark removal
}

export function VideoGrid({ videos, isLoading, emptyMessage, allowRemove = false }: VideoGridProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const { mutate: bookmarkVideo, isPending: isRemovingBookmark } = useBookmarkVideo();

  const handleRemoveBookmark = (video: VideoEvent, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent video card click
    bookmarkVideo({
      eventId: video.id,
      isCurrentlyBookmarked: true, // We're removing a bookmark
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="aspect-[9/16] overflow-hidden">
            <CardContent className="p-0 h-full">
              <Skeleton className="w-full h-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="col-span-full">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <p className="text-muted-foreground">
                {emptyMessage || 'No videos found'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto scrollbar-hide">
      {videos.map((video, index) => (
        <div
          key={video.id}
          className="relative aspect-[9/16] cursor-pointer rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200 group"
          onClick={() => setCurrentVideoIndex(index)}
        >
          <VideoCard 
            event={video}
            isActive={index === currentVideoIndex}
            onNext={() => setCurrentVideoIndex(Math.min(index + 1, videos.length - 1))}
            onPrevious={() => setCurrentVideoIndex(Math.max(index - 1, 0))}
          />
          
          {/* Remove bookmark button */}
          {allowRemove && (
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
              onClick={(e) => handleRemoveBookmark(video, e)}
              disabled={isRemovingBookmark}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
