import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthor } from '@/hooks/useAuthor';
import { useVideoRegistration } from '@/hooks/useVideoRegistration';
import { useVideoUrlFallback } from '@/hooks/useVideoUrlFallback';
import { useUserInteraction } from '@/contexts/UserInteractionContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePWA } from '@/hooks/usePWA';
import { genUserName } from '@/lib/genUserName';
import { useNavigate } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';
import { bundleLog } from '@/lib/logBundler';
import { devError, devLog } from '@/lib/devConsole';
import { isYouTubeUrl } from '@/lib/youtubeEmbed';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { VideoZapAnalytics } from '@/components/VideoZapAnalytics';

interface VideoCardProps {
  event: NostrEvent & {
    videoUrl?: string;
    thumbnail?: string;
    title?: string;
    description?: string;
    hash?: string;
    width?: number;
    height?: number;
  };
  isActive: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onVideoUnavailable?: () => void;
  showVerificationBadge?: boolean;
  shouldPreload?: boolean; // Whether to preload this video for smooth scrolling
  gridMode?: boolean; // If true, show zap analytics instead of username/description/date
}

export function VideoCard({ event, isActive, onNext: _onNext, onPrevious: _onPrevious, onVideoUnavailable, showVerificationBadge = true, shouldPreload = false, gridMode = false }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const videoRef = useVideoRegistration(); // Use the video registration hook
  const navigate = useNavigate();
  const author = useAuthor(event.pubkey);
  const isMobile = useIsMobile();
  const { isStandalone, isInstalled } = usePWA();

  // Use fallback URL system to find working video URLs
  const { workingUrl, isTestingUrls } = useVideoUrlFallback({
    originalUrl: event.videoUrl,
    hash: event.hash,
    title: event.title,
  });

  // Check if this is a YouTube embed
  const isYouTube = workingUrl ? isYouTubeUrl(workingUrl) : false;

  // Auto-skip to next video when current video becomes unavailable
  useEffect(() => {
    // Only auto-skip if the video is currently active and has finished testing URLs
    if (isActive && !isTestingUrls && !workingUrl && onVideoUnavailable) {
      if (import.meta.env.DEV) {
        bundleLog('VideoCard', `🚫 Auto-skipping unavailable video: ${event.title || event.id}`);
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

  // Format timestamp relative to now
  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    
    // For anything older than 24 hours, show M-D format
    const date = new Date(timestamp * 1000);
    const month = date.getMonth() + 1; // getMonth() is 0-indexed
    const day = date.getDate();
    return `${month}-${day}`;
  };

  const timeAgo = formatTimeAgo(event.created_at);

  // PWA visibility change handling for mobile apps
  useEffect(() => {
    const isPWAMobile = isMobile && (isStandalone || isInstalled);

    if (!isPWAMobile) return;

    const handleVisibilityChange = () => {
      const videoElement = videoRef.current;
      if (!videoElement || !isActive) return;

      if (document.hidden) {
        // App went to background - pause video to save battery
        if (!videoElement.paused) {
          videoElement.pause();
          bundleLog('mobilePWAInteraction', '📱 PWA went to background - paused video');
        }
      } else {
        // App came to foreground - resume if not user paused
        if (!userPaused && videoElement.paused) {
          videoElement.play().catch(() => {
            // Silently handle play failures
          });
          bundleLog('mobilePWAInteraction', '📱 PWA returned to foreground - resumed video');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isMobile, isStandalone, isInstalled, isActive, userPaused, videoRef]);

  // Bundle video card debugging logs
  const videoDebugRef = useRef({
    lastPropsLog: 0,
    loadEvents: 0,
    lastLoadLog: 0,
    hasLoggedStart: false,
  });

  // Bundled props logging - only when significant changes occur
  useEffect(() => {
    if (import.meta.env.DEV) {
      const now = Date.now();
      const significantChange = workingUrl !== event.videoUrl || isTestingUrls;

      if (significantChange && now - videoDebugRef.current.lastPropsLog > 5000) {
        bundleLog('VideoCard', `📱 VideoCard [${event.title?.slice(0, 20) || 'Untitled'}]: ${JSON.stringify({
          status: isTestingUrls ? 'testing-urls' : 'ready',
          videoUrl: workingUrl?.split('/').pop()?.slice(0, 12) + '...',
          hasHash: !!event.hash,
          isActive,
        })}`);
        videoDebugRef.current.lastPropsLog = now;
      }
    }
  }, [event.id, event.title, event.videoUrl, workingUrl, isTestingUrls, event.hash, isActive]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleError = (error: Event) => {
      devError('Video error', { eventId: event.id, url: workingUrl, error });
    };

    const handleLoadedData = () => {
      videoDebugRef.current.loadEvents++;

      if (import.meta.env.DEV) {
        const now = Date.now();
        // Bundle video load success logs - less frequent
        if (now - videoDebugRef.current.lastLoadLog > 5000) {
          bundleLog('VideoCard', `🎬 Video Load Summary: ${videoDebugRef.current.loadEvents} videos loaded successfully`);
          videoDebugRef.current.lastLoadLog = now;
          videoDebugRef.current.loadEvents = 0;
        }
      }
    };

    const handleLoadStart = () => {
      // Reduce load start logging noise
      if (import.meta.env.DEV && isActive && !videoDebugRef.current.hasLoggedStart) {
        videoDebugRef.current.hasLoggedStart = true;
        bundleLog('VideoCard', `▶️ Loading: ${event.title?.slice(0, 30) || 'Untitled video'}...`);
      }
    };

    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('loadstart', handleLoadStart);

    if (isActive) {
      // When video becomes active, reset to beginning and auto-play if user hasn't manually paused
      videoElement.currentTime = 0; // Reset video to beginning
      videoElement.muted = false; // Unmute the active video for audio playback

      if (!userPaused) {
        // Enhanced PWA mobile autoplay strategy
        const isPWAMobile = isMobile && (isStandalone || isInstalled);
        const playPromise = videoElement.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Autoplay with audio succeeded
              bundleLog('videoAutoPlay', `✅ Video autoplay with audio successful${isPWAMobile ? ' (PWA Mobile)' : ''}`);
              setIsPlaying(true);
            })
            .catch((error) => {
              // If autoplay with audio fails, try muted autoplay as fallback
              bundleLog('videoAutoPlayErrors', `Audio autoplay failed, trying muted fallback: ${error.message}${isPWAMobile ? ' (PWA Mobile)' : ''}`);
              videoElement.muted = true;

              const mutedPlayPromise = videoElement.play();
              if (mutedPlayPromise !== undefined) {
                mutedPlayPromise
                  .then(() => {
                    bundleLog('videoAutoPlay', `✅ Muted autoplay successful${isPWAMobile ? ' (PWA Mobile)' : ''}`);
                    setIsPlaying(true);

                    // For PWA mobile, try to unmute after a short delay if user interacted
                    if (isPWAMobile) {
                      setTimeout(() => {
                        if (!userPaused && isActive && videoElement) {
                          videoElement.muted = false;
                          bundleLog('videoAutoPlay', '🔊 PWA Mobile: Attempting to unmute after muted autoplay');
                        }
                      }, 1000);
                    }
                  })
                  .catch((mutedError) => {
                    bundleLog('videoAutoPlayErrors', `❌ Even muted autoplay failed: ${mutedError.message}${isPWAMobile ? ' (PWA Mobile)' : ''}`);
                  });
              }
            });
        } else {
          setIsPlaying(true);
        }
      }
    } else {
      // When video becomes inactive, always pause, mute, and reset user pause state
      videoElement.pause();
      videoElement.muted = true; // Mute inactive videos
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

    const isPWAMobile = isMobile && (isStandalone || isInstalled);

    if (videoElement.paused) {
      // When manually playing, ensure audio is enabled for active video
      if (isActive) {
        videoElement.muted = false;

        // For PWA mobile, additional interaction tracking
        if (isPWAMobile) {
          bundleLog('mobilePWAInteraction', '👆 User manually played video in PWA');
        }
      }

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

  // Detect video orientation to choose appropriate object-fit
  // Landscape videos (width > height) use object-contain to show full video
  // Portrait/square videos use object-cover to fill the container
  const isLandscape = event.width && event.height && event.width > event.height;
  const objectFitClass = isLandscape ? 'object-contain' : 'object-cover';

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video Element, YouTube Embed, or Error State */}
      {workingUrl ? (
        isYouTube ? (
          // YouTube Embed
          <YouTubeEmbed
            embedUrl={workingUrl}
            title={event.title || 'YouTube Video'}
            thumbnail={event.thumbnail}
            isActive={isActive}
            className="w-full h-full"
          />
        ) : (
          // Standard HTML5 Video
          <video
            ref={videoRef}
            src={workingUrl}
            poster={event.thumbnail}
            className={`w-full h-full ${objectFitClass} cursor-pointer`}
            loop
            playsInline
            muted={!isActive} // Mute inactive videos, unmute active video
            preload={isActive || shouldPreload ? "auto" : "metadata"} // Preload active video and adjacent videos for smooth scrolling
            webkit-playsinline="true" // iOS Safari compatibility
            x5-video-player-type="h5" // WeChat browser optimization
            x5-video-player-fullscreen="true" // WeChat fullscreen optimization
            onClick={handlePlayPause}
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onTouchStart={(e) => {
              // PWA mobile touch optimization
              const isPWAMobile = isMobile && (isStandalone || isInstalled);
              if (isPWAMobile) {
                // Prevent default to avoid mobile browser interference
                e.preventDefault();
                bundleLog('mobilePWAInteraction', '👆 Touch interaction on video in PWA');
              }
            }}
          />
        )
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

      {/* Video Description - Bottom Left (Higher for YouTube to avoid player controls) */}
      {/* In grid mode, show zap analytics instead of username/description/date */}
      {gridMode ? (
        <div className="absolute bottom-4 left-4 text-white z-10">
          <VideoZapAnalytics videoId={event.id} />
        </div>
      ) : (
        <div className={`absolute left-4 right-20 text-white z-10 ${isYouTube ? 'bottom-20' : 'bottom-4'}`}>
          <div className="space-y-1">
            {/* Username - Always visible */}
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
              <span className="text-xs text-gray-400 flex-shrink-0">
                {timeAgo}
              </span>
            </div>

            {/* Description - Hidden for YouTube videos to avoid interfering with player controls */}
            {!isYouTube && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
