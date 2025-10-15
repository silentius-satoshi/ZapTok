import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthGate } from '@/components/AuthGate';
import { LogoHeader } from '@/components/LogoHeader';
import { Card, CardContent } from '@/components/ui/card';
import { VideoGrid } from '@/components/VideoGrid';
import { VideoCard } from '@/components/VideoCard';
import { Hash, X } from 'lucide-react';
import { useHashtagVideos } from '@/hooks/useHashtagVideos';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { VideoEvent } from '@/lib/validateVideoEvent';

const Hashtag = () => {
  const { tag } = useParams<{ tag: string }>();
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoViewerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Fetch videos with this hashtag
  const { data: videos, isLoading, error } = useHashtagVideos(tag || '');

  useSeoMeta({
    title: `#${tag} - ZapTok`,
    description: `Discover videos tagged with #${tag} on ZapTok`,
  });

  // Video viewer handlers
  const handleVideoClick = (index: number) => {
    setCurrentVideoIndex(index);
    setShowVideoViewer(true);
  };

  const handleCloseVideoViewer = () => {
    setShowVideoViewer(false);
  };

  const handleNextVideo = () => {
    if (videos && currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  // Scroll tracking effect
  useEffect(() => {
    if (!showVideoViewer || !videoViewerRef.current || !videos) return;

    const container = videoViewerRef.current;
    
    const handleScroll = () => {
      const scrollPosition = container.scrollTop;
      const videoHeight = container.clientHeight;
      const newIndex = Math.round(scrollPosition / videoHeight);
      
      if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentVideoIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [showVideoViewer, currentVideoIndex, videos]);

  // Initial scroll position effect
  useEffect(() => {
    if (showVideoViewer && videoViewerRef.current && videos) {
      const container = videoViewerRef.current;
      const videoHeight = container.clientHeight;
      const scrollPosition = currentVideoIndex * videoHeight;
      
      container.scrollTo({ 
        top: scrollPosition, 
        behavior: 'instant' as ScrollBehavior 
      });
    }
  }, [showVideoViewer, currentVideoIndex, videos]);

  return (
    <AuthGate>
      <div className={`min-h-screen bg-black text-white ${isMobile ? 'overflow-x-hidden' : ''}`}>
        <main className="h-screen">
          <div className="flex h-full">
            {/* Left Sidebar - Logo and Navigation - Hidden on Mobile */}
            {!isMobile && (
              <div className="flex flex-col bg-black">
                <LogoHeader />
                <div className="flex-1">
                  <Navigation />
                </div>
              </div>
            )}

            {/* Main Content - Full Width on Mobile */}
            <div className={`flex-1 overflow-y-auto scrollbar-hide ${isMobile ? 'min-w-0 overflow-x-hidden' : ''}`}>
              <div className={`max-w-4xl mx-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                {/* Header */}
                <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
                  <div className="flex items-center space-x-3 mb-4">
                    <Hash className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-orange-500`} />
                    <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>#{tag}</h1>
                  </div>
                  <p className={`text-gray-400 ${isMobile ? 'text-sm' : ''}`}>
                    Videos tagged with #{tag}
                  </p>
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div className="text-center py-12">
                    <p className="text-gray-400">Loading videos...</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <Card className="border-dashed">
                    <CardContent className="py-12 px-8 text-center">
                      <p className="text-red-400">
                        {error instanceof Error ? error.message : 'Failed to load videos'}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                {!isLoading && !error && videos && videos.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-12 px-8 text-center">
                      <div className="max-w-sm mx-auto space-y-4">
                        <Hash className="w-16 h-16 mx-auto text-gray-600" />
                        <p className="text-muted-foreground">
                          No videos found with #{tag}
                        </p>
                        <p className="text-sm text-gray-500">
                          Try a different hashtag or check back later
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Video Grid */}
                {!isLoading && !error && videos && videos.length > 0 && (
                  <VideoGrid
                    videos={videos}
                    showVerificationBadge={false}
                    onVideoClick={handleVideoClick}
                  />
                )}
              </div>
            </div>

            {/* Right Sidebar - Compact Login Area */}
            <div className="hidden lg:block w-96 p-3 overflow-visible relative">
              <div className="sticky top-4 overflow-visible">
                <LoginArea className="justify-end max-w-full" />
              </div>
            </div>
          </div>
        </main>

        {/* Feed-Style Video Viewer */}
        {showVideoViewer && videos && videos.length > 0 && (
          <div 
            ref={videoViewerRef}
            className="fixed inset-0 z-50 bg-black overflow-y-auto snap-y snap-mandatory"
          >
            {/* Close Button */}
            <button
              onClick={handleCloseVideoViewer}
              className="fixed top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              aria-label="Close video viewer"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Render all videos for scrolling */}
            {videos.map((video, index) => {
              // Determine if this video should be preloaded for smooth scrolling
              // Preload current, next, and previous videos
              const shouldPreload = Math.abs(index - currentVideoIndex) <= 1;
              
              return (
                <div key={video.id} className="h-screen flex items-center justify-center snap-start">
                  <div className="flex w-full items-end h-full gap-6 max-w-2xl">
                    <div className="flex-1 h-full rounded-3xl border-2 border-gray-800 overflow-hidden bg-black shadow-2xl relative">
                      <VideoCard 
                        event={video}
                        isActive={index === currentVideoIndex}
                        onNext={handleNextVideo}
                        onPrevious={handlePreviousVideo}
                        shouldPreload={shouldPreload}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthGate>
  );
};

export default Hashtag;
