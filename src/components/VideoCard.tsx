import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthor } from '@/hooks/useAuthor';
import { useVideoRegistration } from '@/hooks/useVideoRegistration';
import { useVideoUrlFallback } from '@/hooks/useVideoUrlFallback';
import { genUserName } from '@/lib/genUserName';
import { useNavigate } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoCardProps {
  event: NostrEvent & {
    videoUrl?: string;
    thumbnail?: string;
    title?: string;
    description?: string;
    hash?: string;
  };
  isActive: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onVideoUnavailable?: () => void;
  showVerificationBadge?: boolean;
}

export function VideoCard({ event, isActive, onNext: _onNext, onPrevious: _onPrevious, onVideoUnavailable, showVerificationBadge = true }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const videoRef = useVideoRegistration(); // Use the video registration hook
  const navigate = useNavigate();
  const author = useAuthor(event.pubkey);

  // Use fallback URL system to find working video URLs
  const { workingUrl, isTestingUrls } = useVideoUrlFallback({
    originalUrl: event.videoUrl,
    hash: event.hash,
    title: event.title,
  });

  // Auto-skip to next video when current video becomes unavailable
  useEffect(() => {
    // Only auto-skip if the video is currently active and has finished testing URLs
    if (isActive && !isTestingUrls && !workingUrl && onVideoUnavailable) {
    if (import.meta.env.DEV) {
      console.log('🚫 Auto-skipping unavailable video:', event.title || event.id);
    }
      // Small delay to prevent jarring immediate skip
      const timeoutId = setTimeout(() => {
        onVideoUnavailable();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isActive, isTestingUrls, workingUrl, onVideoUnavailable, event.title, event.id]);

  const authorMetadata = author.data?.metadata;
  const displayName = authorMetadata?.name || authorMetadata?.display_name || genUserName(event.pubkey);

  // Bundle video card debugging logs
  const videoDebugRef = useRef({
    lastPropsLog: 0,
    loadEvents: 0,
    lastLoadLog: 0,
  });

  // Bundled props logging - only when significant changes occur
  useEffect(() => {
    if (import.meta.env.DEV) {
      const now = Date.now();
      const significantChange = workingUrl !== event.videoUrl || isTestingUrls;

      if (significantChange && now - videoDebugRef.current.lastPropsLog > 5000) {
        console.log(`📱 VideoCard [${event.title?.slice(0, 20) || 'Untitled'}]:`, {
          status: isTestingUrls ? 'testing-urls' : 'ready',
          videoUrl: workingUrl?.split('/').pop()?.slice(0, 12) + '...',
          hasHash: !!event.hash,
          isActive,
        });
        videoDebugRef.current.lastPropsLog = now;
      }
    }
  }, [event.id, event.title, event.videoUrl, workingUrl, isTestingUrls, event.hash, isActive]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleError = (error: Event) => {
      console.error('Video error for event:', event.id, 'URL:', workingUrl, 'Error:', error);
    };

    const handleLoadedData = () => {
      videoDebugRef.current.loadEvents++;

      if (import.meta.env.DEV) {
        const now = Date.now();
        // Bundle video load success logs - less frequent
        if (now - videoDebugRef.current.lastLoadLog > 5000) {
          console.log(`🎬 Video Load Summary: ${videoDebugRef.current.loadEvents} videos loaded successfully`);
          videoDebugRef.current.lastLoadLog = now;
          videoDebugRef.current.loadEvents = 0;
        }
      }
    };

    const handleLoadStart = () => {
      // Only log load start for active videos to reduce noise
      if (import.meta.env.DEV && isActive) {
        console.log(`▶️ Loading: ${event.title?.slice(0, 30) || 'Untitled video'}...`);
      }
    };

    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('loadstart', handleLoadStart);

    if (isActive) {
      // When video becomes active, only auto-play if user hasn't manually paused
      if (!userPaused) {
        videoElement.play().catch((error) => {
          console.error('Auto-play failed:', error);
        });
        setIsPlaying(true);
      }
    } else {
      // When video becomes inactive, always pause and reset user pause state
      videoElement.pause();
      setIsPlaying(false);
      setUserPaused(false);
    }

    return () => {
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('loadstart', handleLoadStart);
    };
  }, [videoRef, isActive, userPaused, event.id, workingUrl]);

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

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video Element or Error State */}
      {workingUrl ? (
        <video
          ref={videoRef}
          src={workingUrl}
          poster={event.thumbnail}
          className="w-full h-full object-cover cursor-pointer"
          loop
          playsInline
          onClick={handlePlayPause}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
        />
      ) : isTestingUrls ? (
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-white rounded-full mx-auto mb-2"></div>
            <p className="text-sm">Finding video source...</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-sm">Video not available</p>
            <p className="text-xs mt-1">No working source found</p>
            {event.hash && (
              <p className="text-xs mt-1 font-mono text-gray-500">
                Hash: {event.hash.slice(0, 16)}...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {userPaused && !isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={handlePlayPause}
        >
          <div className="rounded-full p-6">
            <Play className="w-16 h-16 text-white drop-shadow-lg" fill="white" />
          </div>
        </div>
      )}

      {/* Video Description - Bottom Left */}
      <div className="absolute bottom-4 left-4 right-20 text-white z-10">
        <div className="space-y-1">
          {/* Username */}
          <div className="flex items-center gap-2">
            <button
              className="font-bold text-white truncate hover:text-blue-300 transition-colors cursor-pointer"
              onClick={() => navigate(`/profile/${event.pubkey}`)}
            >
              @{displayName}
            </button>
            {showVerificationBadge && authorMetadata?.nip05 && (
              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300 border-blue-400/30 flex-shrink-0">
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
