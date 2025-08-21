import { useEffect, useState } from 'react';
import { X, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthor } from '@/hooks/useAuthor';
import { useVideoRegistration } from '@/hooks/useVideoRegistration';
import { useVideoUrlFallback } from '@/hooks/useVideoUrlFallback';
import { genUserName } from '@/lib/genUserName';
import type { VideoEvent } from '@/lib/validateVideoEvent';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: VideoEvent[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  showVerificationBadge?: boolean;
}

export function VideoModal({
  isOpen,
  onClose,
  videos,
  currentIndex,
  onIndexChange,
  showVerificationBadge = true
}: VideoModalProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const videoRef = useVideoRegistration();

  const currentVideo = videos[currentIndex];
  const author = useAuthor(currentVideo?.pubkey);

  const { workingUrl, isTestingUrls } = useVideoUrlFallback({
    originalUrl: currentVideo?.videoUrl,
    hash: currentVideo?.hash,
    title: currentVideo?.title,
  });

  const authorMetadata = author.data?.metadata;
  const displayName = authorMetadata?.name || authorMetadata?.display_name || genUserName(currentVideo?.pubkey || '');

  // Auto-play when video changes or modal opens
  useEffect(() => {
    if (isOpen && videoRef.current && workingUrl) {
      videoRef.current.play().catch(() => {
        // Ignore play failures
      });
    }
  }, [isOpen, workingUrl, currentIndex, videoRef]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            onIndexChange(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < videos.length - 1) {
            onIndexChange(currentIndex + 1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case ' ':
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, videos.length, onClose, onIndexChange]);

  if (!currentVideo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-black border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 z-50 rounded-full bg-black/40 hover:bg-black/60 text-white h-10 w-10 backdrop-blur-sm"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Navigation Buttons */}
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-black/40 hover:bg-black/60 text-white h-12 w-12 backdrop-blur-sm"
              onClick={() => onIndexChange(currentIndex - 1)}
            >
              <SkipBack className="w-6 h-6" />
            </Button>
          )}

          {currentIndex < videos.length - 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-black/40 hover:bg-black/60 text-white h-12 w-12 backdrop-blur-sm"
              onClick={() => onIndexChange(currentIndex + 1)}
            >
              <SkipForward className="w-6 h-6" />
            </Button>
          )}

          {/* Video */}
          <div className="w-full h-full max-w-4xl max-h-full flex items-center justify-center">
            {workingUrl ? (
              <video
                ref={videoRef}
                src={workingUrl}
                poster={currentVideo.thumbnail}
                className="w-full h-full object-contain"
                controls
                loop
                muted
                playsInline
                autoPlay
              />
            ) : isTestingUrls ? (
              <div className="text-center text-gray-400">
                <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-white rounded-full mx-auto mb-2"></div>
                <p className="text-sm">Finding video source...</p>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p className="text-sm">Video not available</p>
                <p className="text-xs mt-1">No working source found</p>
              </div>
            )}
          </div>

          {/* Volume Control */}
          <div className="absolute top-4 right-20 z-50">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full bg-black/40 hover:bg-black/60 text-white h-10 w-10 backdrop-blur-sm"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                  setIsMuted(videoRef.current.muted);
                }
              }}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>

          {/* Video Info Overlay */}
          <div className="absolute bottom-4 left-4 right-4 text-white z-50">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 max-w-md">
              {/* Username */}
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-white">@{displayName}</span>
                {showVerificationBadge && authorMetadata?.nip05 && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300 border-blue-400/30">
                    ✓ {authorMetadata.nip05}
                  </Badge>
                )}
              </div>

              {/* Description */}
              <div className="text-sm">
                {isDescriptionExpanded ? (
                  <div className="space-y-2">
                    <p className="text-white leading-relaxed">
                      {currentVideo.title || currentVideo.description || currentVideo.content}
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-wrap gap-1 flex-1">
                        {currentVideo.tags
                          ?.filter(([name]) => name === 't')
                          .map(([, tag], index) => (
                            <span
                              key={index}
                              className="text-xs bg-white/10 text-white px-2 py-1 rounded-full backdrop-blur-sm"
                            >
                              #{tag}
                            </span>
                          ))}
                      </div>
                      <button
                        onClick={() => setIsDescriptionExpanded(false)}
                        className="text-xs text-gray-300 hover:text-white transition-colors whitespace-nowrap font-medium"
                      >
                        ...less
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <p className="truncate flex-1 text-white leading-relaxed">
                      {currentVideo.title || currentVideo.description || currentVideo.content}
                    </p>
                    <button
                      onClick={() => setIsDescriptionExpanded(true)}
                      className="text-xs text-gray-300 hover:text-white transition-colors whitespace-nowrap font-medium"
                    >
                      ...more
                    </button>
                  </div>
                )}
              </div>

              {/* Video counter */}
              <div className="mt-2 text-xs text-gray-400">
                {currentIndex + 1} of {videos.length}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute top-4 left-4 z-50 text-white text-xs opacity-75">
            <p>Use ← → to navigate • Space to play/pause • M to mute • Esc to close</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
