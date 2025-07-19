import { useState, useEffect } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthor } from '@/hooks/useAuthor';
import { useVideoRegistration } from '@/hooks/useVideoRegistration';
import { genUserName } from '@/lib/genUserName';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoCardProps {
  event: NostrEvent & {
    videoUrl?: string;
    thumbnail?: string;
    title?: string;
    description?: string;
  };
  isActive: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

export function VideoCard({ event, isActive, onNext: _onNext, onPrevious: _onPrevious }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const videoRef = useVideoRegistration(); // Use the video registration hook
  const author = useAuthor(event.pubkey);

  const authorMetadata = author.data?.metadata;
  const displayName = authorMetadata?.name || authorMetadata?.display_name || genUserName(event.pubkey);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      // When video becomes active, only auto-play if user hasn't manually paused
      if (!userPaused) {
        videoElement.play().catch(() => {
          // Ignore play failures
        });
        setIsPlaying(true);
      }
    } else {
      // When video becomes inactive, always pause and reset user pause state
      videoElement.pause();
      setIsPlaying(false);
      setUserPaused(false);
    }
  }, [isActive, userPaused]);

  const handlePlayPause = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (videoElement.paused) {
      videoElement.play().catch(() => {
        // Ignore play failures
      });
      setIsPlaying(true);
      setUserPaused(false);
    } else {
      videoElement.pause();
      setIsPlaying(false);
      setUserPaused(true);
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={event.videoUrl}
        poster={event.thumbnail}
        className="w-full h-full object-cover cursor-pointer"
        loop
        muted
        playsInline
        onClick={handlePlayPause}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
      />

      {/* Pause Overlay */}
      {userPaused && !isPlaying && (
        <div 
          className="absolute inset-0 bg-black/20 flex items-center justify-center cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="bg-black/40 rounded-full p-6">
            <Play className="w-16 h-16 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Volume Control - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-black/40 hover:bg-black/60 text-white h-10 w-10 backdrop-blur-sm"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
      </div>

      {/* Video Description - Bottom Left */}
      <div className="absolute bottom-4 left-4 right-20 text-white z-10">
        <div className="space-y-3">
          {/* Username */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">@{displayName}</span>
            {authorMetadata?.nip05 && (
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
                  {event.title || event.description || event.content}
                </p>
                <div className="flex items-center space-x-2">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {event.tags
                      .filter(([name]) => name === 't')
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
                  {event.title || event.description || event.content}
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
        </div>
      </div>
    </div>
  );
}
