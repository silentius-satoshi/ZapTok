import { useState } from 'react';
import { VideoCard } from '@/components/VideoCard';
import { VideoModal } from '@/components/VideoModal';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useBookmarkVideo } from '@/hooks/useBookmarks';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { VideoEvent } from '@/lib/validateVideoEvent';

interface VideoGridProps {
  videos: VideoEvent[];
  isLoading?: boolean;
  emptyMessage?: string;
  allowRemove?: boolean; // New prop to enable bookmark removal
  showVerificationBadge?: boolean; // New prop to control NIP-05 badge display
  onVideoClick?: (index: number) => void; // Optional custom click handler
}

export function VideoGrid({ videos, isLoading, emptyMessage, allowRemove = false, showVerificationBadge = true, onVideoClick }: VideoGridProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate: bookmarkVideo, isPending: isRemovingBookmark } = useBookmarkVideo();
  const isMobile = useIsMobile();

  const handleRemoveBookmark = (video: VideoEvent, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent video card click
    bookmarkVideo({
      eventId: video.id,
      isCurrentlyBookmarked: true, // We're removing a bookmark
    });
  };

  const handleVideoClick = (index: number) => {
    if (onVideoClick) {
      // Use custom click handler if provided
      onVideoClick(index);
    } else {
      // Otherwise use internal modal
      setCurrentVideoIndex(index);
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  if (isLoading) {
    // Enhanced mobile PWA loading grid - better mobile layout
    const gridCols = isMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
    const skeletonCount = isMobile ? 4 : 6;

    return (
      <div className={`grid ${gridCols} gap-3`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Card key={i} className="w-full aspect-[9/16] overflow-hidden">
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
    <>
      {/* Enhanced mobile PWA grid layout - optimized for profile viewing */}
      <div className={`grid gap-3 ${
        isMobile
          ? 'grid-cols-1 max-h-[70vh]' // Mobile PWA: Single column for full-width thumbnails
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-h-[600px]' // Desktop: responsive columns
      } overflow-y-auto scrollbar-hide`}>
        {videos.map((video, index) => (
          <div
            key={video.id}
            className={`relative w-full aspect-[9/16] cursor-pointer rounded-lg overflow-hidden transition-all duration-200 group flex-shrink-0 ${
              isMobile
                ? 'hover:scale-102 active:scale-95' // Mobile: subtle touch feedback
                : 'hover:scale-105' // Desktop: standard hover effect
            }`}
            onClick={() => handleVideoClick(index)}
          >
            <div className="absolute inset-0">
              <VideoCard
                event={video}
                isActive={false} // Grid videos should never auto-play, only in modal/viewer
                onNext={() => setCurrentVideoIndex(Math.min(index + 1, videos.length - 1))}
                onPrevious={() => setCurrentVideoIndex(Math.max(index - 1, 0))}
                showVerificationBadge={showVerificationBadge}
                gridMode={true} // Show zap analytics instead of username/description/date
              />
            </div>

            {/* Enhanced remove bookmark button for mobile */}
            {allowRemove && (
              <Button
                variant="destructive"
                size="sm"
                className={`absolute top-2 right-2 h-6 w-6 p-0 rounded-full transition-opacity duration-200 z-10 ${
                  isMobile
                    ? 'opacity-80 hover:opacity-100' // Mobile: always visible but subtle
                    : 'opacity-0 group-hover:opacity-100' // Desktop: show on hover
                }`}
                onClick={(e) => handleRemoveBookmark(video, e)}
                disabled={isRemovingBookmark}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Enhanced VideoModal for mobile PWA fullscreen experience */}
      <VideoModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        videos={videos}
        currentIndex={currentVideoIndex}
        onIndexChange={setCurrentVideoIndex}
        showVerificationBadge={showVerificationBadge}
      />
    </>
  );
}
