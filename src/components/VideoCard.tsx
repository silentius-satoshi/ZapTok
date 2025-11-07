import { useState, useEffect, useRef } from 'react';
import { Play, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthor } from '@/hooks/useAuthor';
import { useVideoRegistration } from '@/hooks/useVideoRegistration';
import { useVideoUrlFallback } from '@/hooks/useVideoUrlFallback';
import { useThumbnailCache } from '@/hooks/useThumbnailCache';
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
import { VideoProgressBar } from '@/components/VideoProgressBar';
import { mediaManager } from '@/services/mediaManager';
import { useContentPolicy } from '@/providers/ContentPolicyProvider';
import { brokenVideoTracker } from '@/services/brokenVideoTracker';

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
  // Check user's volume preference from localStorage
  const volumePreference = localStorage.getItem('video-volume-preference');
  const userPrefersSound = volumePreference === 'unmuted';
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(!userPrefersSound); // Use user's preference
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubbingTime, setScrubbingTime] = useState(0);
  const [manuallyLoaded, setManuallyLoaded] = useState(false); // Track manual load override
  const [showPlayOverlay, setShowPlayOverlay] = useState(!userPrefersSound); // Show play button if user hasn't enabled sound yet
  const videoRef = useVideoRegistration(); // Use the video registration hook
  const containerRef = useRef<HTMLDivElement>(null); // Container ref for IntersectionObserver
  const navigate = useNavigate();
  const author = useAuthor(event.pubkey);
  const isMobile = useIsMobile();
  const { isStandalone, isInstalled } = usePWA();
  const { autoLoadMedia, connectionType } = useContentPolicy();
  
  // Track if this video has been activated before to avoid resetting position on pause/unpause
  const hasBeenActivatedRef = useRef(false);

  // Determine if this video should load based on policy
  const shouldLoadVideo = autoLoadMedia || manuallyLoaded;

  // Phase 6.4: Cache thumbnails for grid mode
  const { cachedUrl: cachedThumbnail } = useThumbnailCache(event.thumbnail, gridMode);

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

  // Format time as MM:SS for video duration
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Update scrubbing time in real-time during scrubbing
  useEffect(() => {
    if (!isScrubbing || !videoRef.current) return;

    const updateScrubbingTime = () => {
      if (videoRef.current) {
        setScrubbingTime(videoRef.current.currentTime);
      }
    };

    // Update immediately
    updateScrubbingTime();

    // Update during timeupdate events while scrubbing
    const videoElement = videoRef.current;
    videoElement.addEventListener('timeupdate', updateScrubbingTime);

    return () => {
      videoElement.removeEventListener('timeupdate', updateScrubbingTime);
    };
  }, [isScrubbing, videoRef]);

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
      const target = error.target as HTMLVideoElement;
      const mediaError = target.error;
      
      let errorDetails = 'Unknown error';
      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorDetails = 'MEDIA_ERR_ABORTED: Video loading aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorDetails = 'MEDIA_ERR_NETWORK: Network error while loading video';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorDetails = 'MEDIA_ERR_DECODE: Video decoding failed (corrupted or unsupported format)';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorDetails = 'MEDIA_ERR_SRC_NOT_SUPPORTED: Video format not supported or file not found';
            break;
        }
        errorDetails += ` (code: ${mediaError.code})`;
        if (mediaError.message) {
          errorDetails += ` - ${mediaError.message}`;
        }
      }
      
      devError('Video error - Auto-skipping', { 
        eventId: event.id, 
        url: workingUrl, 
        errorCode: mediaError?.code,
        errorDetails,
        title: event.title 
      });

      // Mark video as broken in the tracker for immediate filtering
      brokenVideoTracker.markAsBroken(event.id);

      // Auto-skip videos that fail to load (following Jumble's approach)
      // Critical errors that mean the video will never play
      if (mediaError && (
        mediaError.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
        mediaError.code === MediaError.MEDIA_ERR_DECODE
      )) {
        if (onVideoUnavailable && isActive) {
          // Small delay to prevent jarring immediate skip
          setTimeout(() => {
            onVideoUnavailable();
          }, 500);
        }
      }
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
      // Always reset to beginning when becoming active to prevent pre-buffered playback
      // This ensures videos start from the beginning even if they pre-loaded
      if (!hasBeenActivatedRef.current || videoElement.currentTime > 0.5) {
        videoElement.currentTime = 0;
        hasBeenActivatedRef.current = true;
      }

      if (!userPaused) {
        // Check user's volume preference
        const volumePref = localStorage.getItem('video-volume-preference');
        const userPrefersSound = volumePref === 'unmuted';
        
        // If user hasn't enabled sound yet, show play overlay instead of autoplay
        if (!userPrefersSound) {
          bundleLog('videoAutoPlay', '🔇 User has not enabled sound - showing play overlay');
          setShowPlayOverlay(true);
          setIsPlaying(false);
          videoElement.pause();
          return;
        }
        
        // User has enabled sound preference - autoplay with sound
        const playPromise = videoElement.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              bundleLog('videoAutoPlay', '✅ Autoplay successful');
              setIsPlaying(true);
              setShowPlayOverlay(false);

              // Restore audio based on user preference
              // Use requestAnimationFrame for smoother unmute without delay
              requestAnimationFrame(() => {
                if (!userPaused && isActive && videoElement) {
                  videoElement.volume = 1.0;
                  videoElement.muted = false;
                  setIsMuted(false);
                  bundleLog('videoAutoPlay', '🔊 Audio restored based on user preference');
                }
              });
            })
            .catch((error) => {
              bundleLog('videoAutoPlayErrors', `❌ Autoplay failed: ${error.message}`);
              // Show play button overlay when autoplay is blocked
              setShowPlayOverlay(true);
              setIsPlaying(false);
            });
        } else {
          setIsPlaying(true);
          setShowPlayOverlay(false);
          // Restore audio for browsers that don't return a promise
          videoElement.volume = 1.0;
          videoElement.muted = false;
          setIsMuted(false);
        }
      }
    } else {
      // When video becomes inactive, aggressively silence it to prevent audio bleeding
      videoElement.pause();
      videoElement.muted = true; // Mute inactive videos
      videoElement.volume = 0; // Set volume to 0 for extra safety
      setIsMuted(true); // Sync state
      setIsPlaying(false);
      setUserPaused(false);
      hasBeenActivatedRef.current = false; // Reset so video starts from beginning next time it's viewed
      bundleLog('audioControl', '🔇 Video deactivated: muted and volume set to 0');
    }

    return () => {
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('loadstart', handleLoadStart);
    };
  }, [videoRef, isActive, userPaused, event.id, workingUrl]);

  // Battery Optimization: IntersectionObserver for viewport-based video control
  // Automatically pauses videos when scrolled out of view to save battery
  useEffect(() => {
    const videoElement = videoRef.current;
    const container = containerRef.current;

    // Skip if YouTube (handled separately) or if no refs
    if (isYouTube || !videoElement || !container || !workingUrl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Video entered viewport - use mediaManager for auto-play
          if (isActive && !userPaused) {
            // Add 200ms debounce to prevent rapid play/pause during scrolling
            setTimeout(() => {
              if (container && entry.isIntersecting) {
                mediaManager.autoPlay(videoElement);
                bundleLog('battery', `🔋 Video entered viewport - auto-playing: ${event.title?.slice(0, 30) || event.id.slice(0, 8)}`);
              }
            }, 200);
          }
        } else {
          // CRITICAL: Video left viewport - pause immediately to save battery
          if (!userPaused) {
            mediaManager.pause(videoElement);
            bundleLog('battery', `🔋 Video left viewport - pausing to save battery: ${event.title?.slice(0, 30) || event.id.slice(0, 8)}`);
          }
        }
      },
      {
        threshold: 0.5, // Trigger when 50% of video is visible
        rootMargin: '50px', // Start slightly before entering viewport for smoother experience
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      // Clean up: ensure video is paused when component unmounts
      if (!userPaused) {
        mediaManager.pause(videoElement);
      }
    };
  }, [videoRef, containerRef, isActive, userPaused, workingUrl, isYouTube, event.title, event.id]);

  const handlePlayPause = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (videoElement.paused) {
      // When manually playing via the play overlay, unmute the video and save preference
      if (showPlayOverlay) {
        videoElement.muted = false;
        setIsMuted(false);
        setShowPlayOverlay(false);
        
        // Save user's sound preference
        localStorage.setItem('video-volume-preference', 'unmuted');
        bundleLog('autoplay', '▶️ User enabled sound via play overlay - preference saved');
      }

      // Use mediaManager to ensure single-video-at-a-time enforcement
      mediaManager.play(videoElement);
      setIsPlaying(true);
      setUserPaused(false);
    } else {
      // Use mediaManager for consistent pause behavior
      mediaManager.pause(videoElement);
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

  // Use object-cover to fill the screen completely like desktop
  // This maximizes video size and eliminates black bars on mobile
  const objectFitClass = 'object-cover';

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
      {/* Click to Load Overlay - Shows when media auto-load is disabled */}
      {!shouldLoadVideo && workingUrl && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-gradient-to-b from-gray-900/90 via-gray-900/95 to-black/95 z-30 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setManuallyLoaded(true);
            bundleLog('battery', `🔋 User manually loaded video on ${connectionType} connection`);
          }}
        >
          <div className="text-center space-y-4 px-6">
            {/* Connection Icon */}
            <div className="flex justify-center">
              {connectionType === 'cellular' ? (
                <WifiOff className="w-16 h-16 text-orange-400 drop-shadow-lg" />
              ) : (
                <Wifi className="w-16 h-16 text-blue-400 drop-shadow-lg" />
              )}
            </div>
            
            {/* Message */}
            <div className="space-y-2">
              <p className="text-white text-lg font-semibold drop-shadow-lg">
                {connectionType === 'cellular' ? 'Cellular Connection Detected' : 'Click to Load Video'}
              </p>
              <p className="text-gray-300 text-sm drop-shadow-md">
                {connectionType === 'cellular' 
                  ? 'Tap to load video and use mobile data'
                  : 'Tap to load and play video'}
              </p>
            </div>

            {/* Play Button */}
            <div className="rounded-full p-4 bg-white/10 backdrop-blur-sm border border-white/20">
              <Play className="w-12 h-12 text-white drop-shadow-lg" fill="white" />
            </div>

            {/* Video Info */}
            {event.title && (
              <p className="text-gray-400 text-xs max-w-xs truncate">
                {event.title}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Video Element, YouTube Embed, or Error State */}
      {workingUrl && shouldLoadVideo ? (
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
            poster={cachedThumbnail || event.thumbnail}
            className={`w-full h-full ${objectFitClass} cursor-pointer`}
            loop
            playsInline
            muted={isMuted} // Use state for mute control
            preload={isActive ? "auto" : "metadata"} // Only preload active video fully, metadata for others
            webkit-playsinline="true" // iOS Safari compatibility
            x5-video-player-type="h5" // WeChat browser optimization
            x5-video-player-fullscreen="true" // WeChat fullscreen optimization
            onClick={handlePlayPause}
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
          />
        )
      ) : workingUrl && !shouldLoadVideo ? (
        // Placeholder when video exists but auto-load is disabled (handled by overlay above)
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          {event.thumbnail ? (
            <img 
              src={cachedThumbnail || event.thumbnail} 
              alt={event.title || 'Video thumbnail'} 
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="text-gray-600">
              <Play className="w-20 h-20 mx-auto mb-2 opacity-30" />
            </div>
          )}
        </div>
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

      {/* Pause Overlay OR Autoplay Failed Overlay */}
      {shouldLoadVideo && (userPaused || showPlayOverlay) && !isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
          onClick={handlePlayPause}
        >
          <div className="rounded-full bg-black/50 p-6 backdrop-blur-sm hover:bg-black/70 transition-all">
            <Play className="w-16 h-16 text-white drop-shadow-lg" fill="white" />
          </div>
          {showPlayOverlay && (
            <div className="absolute bottom-32 text-center">
              <p className="text-white text-sm font-medium drop-shadow-lg">
                Tap to play with sound
              </p>
            </div>
          )}
        </div>
      )}

      {/* Large Timestamp Overlay - Shows during scrubbing, positioned bottom center above description */}
      {isScrubbing && videoRef.current && (
        <div className={`absolute left-0 right-0 flex justify-center pointer-events-none ${isYouTube ? 'bottom-24' : 'bottom-24'}`}>
          <div className="text-white text-5xl font-bold tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {formatTime(scrubbingTime)} / {formatTime(videoRef.current.duration)}
          </div>
        </div>
      )}

      {/* Video Description - Bottom Left (Higher for YouTube to avoid player controls) */}
      {/* Hidden during scrubbing, or in grid mode show zap analytics instead */}
      {gridMode ? (
        <div className={`absolute bottom-4 left-4 text-white z-10 transition-opacity duration-200 ${isScrubbing ? 'opacity-0' : 'opacity-100'}`}>
          <VideoZapAnalytics videoId={event.id} />
        </div>
      ) : (
        <div className={`absolute left-4 right-20 text-white z-10 transition-opacity duration-200 ${isYouTube ? 'bottom-20' : 'bottom-4'} ${isScrubbing ? 'opacity-0' : 'opacity-100'}`}>
          <div className="space-y-1">
            {/* Username - Always visible (except during scrubbing) */}
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
                  {/* Title */}
                  {event.title && (
                    <p className="text-white font-semibold leading-relaxed">
                      {event.title}
                    </p>
                  )}
                  {/* Description */}
                  {event.description && (
                    <p className="text-white leading-relaxed">
                      {event.description}
                    </p>
                  )}
                  {/* Fallback to content if no title or description */}
                  {!event.title && !event.description && event.content && (
                    <p className="text-white leading-relaxed">
                      {event.content}
                    </p>
                  )}
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

      {/* Video Progress Bar - Compact positioning between description and bottom nav */}
      {shouldLoadVideo && !isYouTube && workingUrl && !gridMode && (
        <VideoProgressBar
          videoRef={videoRef}
          isPaused={userPaused || !isPlaying}
          onScrubbingChange={setIsScrubbing}
          isMobile={isMobile}
          className={`absolute left-0 right-0 z-20 ${isMobile ? 'bottom-1' : 'bottom-2'}`}
        />
      )}
    </div>
  );
}
