import { useState, useEffect, useRef, useCallback } from 'react';
import { Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthor } from '@/hooks/useAuthor';
import { useVideoRegistration } from '@/hooks/useVideoRegistration';
import { useVideoUrlFallback } from '@/hooks/useVideoUrlFallback';
import { useVideoEngagementLazy, useVideoIntersection } from '@/hooks/useOptimizedVideoFeed';
import { useUserInteraction } from '@/contexts/UserInteractionContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePWA } from '@/hooks/usePWA';
import { genUserName } from '@/lib/genUserName';
import { useNavigate } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';
import { bundleLog } from '@/lib/logBundler';
import { devError } from '@/lib/devConsole';
import { useVideoCache, videoCache } from '@/lib/unifiedVideoCache';

interface OptimizedVideoCardProps {
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
  // New optimization props
  lazy?: boolean; // Enable lazy loading
  preloadDistance?: number; // Distance in pixels to start preloading
  enableEngagementData?: boolean; // Load reactions/comments
}

export function OptimizedVideoCard({ 
  event, 
  isActive, 
  onNext: _onNext, 
  onPrevious: _onPrevious, 
  onVideoUnavailable, 
  showVerificationBadge = true,
  lazy = true,
  preloadDistance = 200,
  enableEngagementData = false,
}: OptimizedVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy); // If not lazy, assume visible
  const [shouldLoadEngagement, setShouldLoadEngagement] = useState(false);
  
  const videoRef = useVideoRegistration();
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isStandalone, isInstalled } = usePWA();

  // Initialize cache integration
  const cache = useVideoCache();
  
  // Check cache for engagement data first
  const cachedEngagement = cache.getEngagement(event.id);
  
  // Lazy load author data only when visible
  const author = useAuthor(isVisible ? event.pubkey : undefined);

  // Lazy load engagement data only when requested and visible
  // Skip if we have fresh cached data
  const engagement = useVideoEngagementLazy(event.id, {
    enabled: enableEngagementData && shouldLoadEngagement && !cachedEngagement,
    priority: isActive ? 'medium' : 'low',
  });

  // Extract engagement counts from batched data
  const engagementData = cachedEngagement || (() => {
    if (!engagement.data?.reactions) return null;
    
    const videoReactions = engagement.data.reactions.get(event.id) || [];
    const likes = videoReactions.filter(r => r.kind === 7).length;
    const zaps = videoReactions.filter(r => r.kind === 9735).length;
    const comments = videoReactions.filter(r => r.kind === 1).length;
    
    return { likes, zaps, comments };
  })();

  // Cache engagement data when query succeeds
  useEffect(() => {
    if (engagement.data?.reactions && !cachedEngagement) {
      const videoReactions = engagement.data.reactions.get(event.id) || [];
      const likes = videoReactions.filter(r => r.kind === 7).length;
      const zaps = videoReactions.filter(r => r.kind === 9735).length;
      const comments = videoReactions.filter(r => r.kind === 1).length;
      
      cache.cacheEngagement(event.id, { likes, zaps, comments });
      bundleLog('videoCaching', `Engagement data cached for video ${event.id.slice(0, 8)}: ${likes}♥ ${zaps}⚡ ${comments}💬`);
    }
  }, [engagement.data, cachedEngagement, cache, event.id]);

  // Use fallback URL system with lazy loading
  const { workingUrl, isTestingUrls } = useVideoUrlFallback({
    originalUrl: isVisible ? event.videoUrl : undefined,
    hash: event.hash,
    title: event.title,
  });

  // Intersection Observer for lazy loading
  const intersectionCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        
        // Load engagement data when user shows interest (longer view time)
        if (!shouldLoadEngagement && enableEngagementData) {
          const timer = setTimeout(() => {
            setShouldLoadEngagement(true);
            bundleLog('videoLazyLoading', `📊 Loading engagement data for: ${event.title?.slice(0, 20) || event.id.slice(0, 8)}`);
          }, 1000); // Load after 1 second of visibility
          
          return () => clearTimeout(timer);
        }
      }
    });
  }, [shouldLoadEngagement, enableEngagementData, event.title, event.id]);

  const { observe, unobserve } = useVideoIntersection(intersectionCallback, {
    threshold: 0.1,
    rootMargin: `${preloadDistance}px`,
  });

  // Set up intersection observer
  useEffect(() => {
    if (lazy && cardRef.current) {
      observe(cardRef.current);
      return () => {
        if (cardRef.current) {
          unobserve(cardRef.current);
        }
      };
    }
  }, [lazy, observe, unobserve]);

  // Auto-skip unavailable videos (only when visible)
  useEffect(() => {
    if (isActive && isVisible && !isTestingUrls && !workingUrl && onVideoUnavailable) {
      bundleLog('VideoCard', `🚫 Auto-skipping unavailable video: ${event.title || event.id}`);
      const timeoutId = setTimeout(() => {
        onVideoUnavailable();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isActive, isVisible, isTestingUrls, workingUrl, onVideoUnavailable, event.title, event.id]);

  const authorMetadata = author.data?.metadata;
  const displayName = authorMetadata?.name || authorMetadata?.display_name || genUserName(event.pubkey);

  // Enhanced PWA visibility handling
  useEffect(() => {
    const isPWAMobile = isMobile && (isStandalone || isInstalled);
    if (!isPWAMobile || !isVisible) return;

    const handleVisibilityChange = () => {
      const videoElement = videoRef.current;
      if (!videoElement || !isActive) return;

      if (document.hidden) {
        if (!videoElement.paused) {
          videoElement.pause();
          bundleLog('mobilePWAInteraction', '📱 PWA backgrounded - paused video');
        }
      } else {
        if (!userPaused && videoElement.paused) {
          videoElement.play().catch(() => {});
          bundleLog('mobilePWAInteraction', '📱 PWA foregrounded - resumed video');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isMobile, isStandalone, isInstalled, isActive, isVisible, userPaused, videoRef]);

  // Video event handlers (only when visible)
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !isVisible) return;

    const handleError = (error: Event) => {
      devError('Video error', { eventId: event.id, url: workingUrl, error });
    };

    const handleLoadedData = () => {
      bundleLog('VideoCard', `✅ Video loaded: ${event.title?.slice(0, 20) || 'Untitled'}`);
    };

    const handleLoadStart = () => {
      if (isActive) {
        bundleLog('VideoCard', `▶️ Loading: ${event.title?.slice(0, 30) || 'Untitled video'}...`);
      }
    };

    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('loadstart', handleLoadStart);

    // Auto-play logic (only for visible, active videos)
    if (isActive && !userPaused) {
      videoElement.currentTime = 0;
      videoElement.muted = false;

      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            bundleLog('videoAutoPlay', '✅ Autoplay successful');
            setIsPlaying(true);
          })
          .catch(() => {
            bundleLog('videoAutoPlayErrors', 'Audio autoplay failed, trying muted');
            videoElement.muted = true;
            videoElement.play().then(() => {
              bundleLog('videoAutoPlay', '✅ Muted autoplay successful');
              setIsPlaying(true);
            }).catch(() => {
              bundleLog('videoAutoPlayErrors', '❌ All autoplay attempts failed');
            });
          });
      }
    }

    return () => {
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('loadstart', handleLoadStart);
    };
  }, [isVisible, isActive, userPaused, workingUrl, event.id, event.title, videoRef]);

  // Handle video play/pause
  const handlePlayPause = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (videoElement.paused) {
      setUserPaused(false);
      videoElement.play();
      setIsPlaying(true);
    } else {
      setUserPaused(true);
      videoElement.pause();
      setIsPlaying(false);
    }
  };

  const handleVideoClick = () => {
    handlePlayPause();
  };

  const handleDescriptionToggle = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${event.pubkey}`);
  };

  // Render loading skeleton for lazy-loaded content
  if (lazy && !isVisible) {
    return (
      <div
        ref={cardRef}
        className="relative aspect-[9/16] bg-muted animate-pulse rounded-lg overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <div className="h-4 bg-white/20 rounded w-3/4" />
          <div className="h-3 bg-white/20 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // Show loading state for URL testing
  if (isTestingUrls) {
    return (
      <div
        ref={cardRef}
        className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center"
      >
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
          <p className="text-sm">Loading video...</p>
        </div>
      </div>
    );
  }

  // Show error state if no working URL found
  if (isVisible && !workingUrl) {
    return (
      <div
        ref={cardRef}
        className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden flex items-center justify-center"
      >
        <div className="text-muted-foreground text-center p-4">
          <p className="text-sm">Video unavailable</p>
          {event.title && (
            <p className="text-xs mt-1 opacity-75">{event.title}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden cursor-pointer group"
      onClick={handleVideoClick}
    >
      {/* Video Element */}
      {workingUrl && (
        <video
          ref={videoRef}
          src={workingUrl}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          loop
          preload={isActive ? "auto" : "metadata"} // Smart preloading
        />
      )}

      {/* Video Controls Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
            <Play size={20} className="text-black ml-1" />
          </div>
        </div>
      )}

      {/* Content Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      
      {/* Video Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        {/* Author Info */}
        <div 
          className="flex items-center space-x-2 mb-2 cursor-pointer hover:opacity-80"
          onClick={handleProfileClick}
        >
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium">{displayName}</p>
            {showVerificationBadge && authorMetadata?.nip05 && (
              <Badge variant="secondary" className="text-xs">
                ✓ Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Video Title/Description */}
        {event.title && (
          <div className="space-y-1">
            <h3 className="text-sm font-medium line-clamp-2">
              {event.title}
            </h3>
            
            {event.description && (
              <div>
                <p 
                  className={`text-xs text-white/80 ${
                    isDescriptionExpanded ? '' : 'line-clamp-1'
                  }`}
                >
                  {event.description}
                </p>
                {event.description.length > 50 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDescriptionToggle();
                    }}
                    className="text-xs text-white/60 hover:text-white mt-1"
                  >
                    {isDescriptionExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Engagement Data (cached or loaded) */}
        {shouldLoadEngagement && engagementData && (
          <div className="flex items-center space-x-4 mt-2 text-xs text-white/80">
            <span>❤️ {engagementData.likes || 0}</span>
            <span>⚡ {engagementData.zaps || 0}</span>
            <span>💬 {engagementData.comments || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
}