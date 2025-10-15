import { useState, useEffect } from 'react';

interface YouTubeEmbedProps {
  embedUrl: string;
  title?: string;
  thumbnail?: string;
  isActive?: boolean;
  className?: string;
}

/**
 * YouTube embed component for displaying YouTube videos in ZapTok
 * Handles responsive sizing and lazy loading
 */
export function YouTubeEmbed({ 
  embedUrl, 
  title = 'YouTube Video', 
  thumbnail,
  isActive = false,
  className = ''
}: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);

  // Auto-play when active, reset when inactive
  useEffect(() => {
    if (isActive && !isLoaded) {
      // Video becomes active - load and play
      setIsLoaded(true);
      setShowThumbnail(false);
    } else if (!isActive && isLoaded) {
      // Video becomes inactive - reset to thumbnail state
      setIsLoaded(false);
      setShowThumbnail(true);
    }
  }, [isActive, isLoaded]);

  // Construct autoplay URL when iframe loads
  const iframeUrl = isLoaded 
    ? `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&playsinline=1&rel=0`
    : embedUrl;

  const handleThumbnailClick = () => {
    setIsLoaded(true);
    setShowThumbnail(false);
  };

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      {showThumbnail && thumbnail ? (
        // Show thumbnail with play button overlay
        <div 
          className="absolute inset-0 cursor-pointer group"
          onClick={handleThumbnailClick}
        >
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-full object-cover"
          />
          {/* YouTube-style play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center group">
            <svg 
              className="w-20 h-20 opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-lg" 
              viewBox="0 0 68 48"
              fill="none"
            >
              {/* YouTube logo background */}
              <path 
                d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" 
                fill="#FF0000"
              />
              {/* White play triangle */}
              <path 
                d="M 45,24 27,14 27,34" 
                fill="#FFFFFF"
              />
            </svg>
          </div>
        </div>
      ) : (
        // Show YouTube iframe
        <iframe
          src={iframeUrl}
          title={title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          style={{
            border: 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />
      )}
    </div>
  );
}
