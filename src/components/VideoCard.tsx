import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
  const [isLiked, setIsLiked] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const author = useAuthor(event.pubkey);

  const authorName = author.data?.metadata?.name || genUserName(event.pubkey);
  const authorAvatar = author.data?.metadata?.picture;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isActive) {
      // When video becomes active, only auto-play if user hasn't manually paused
      if (!userPaused) {
        videoElement.play();
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
      videoElement.play();
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

  const handleLike = () => {
    if (!user) return;
    
    setIsLiked(!isLiked);
    
    // Create a reaction event
    createEvent({
      kind: 7,
      content: isLiked ? '' : '🤙',
      tags: [
        ['e', event.id],
        ['p', event.pubkey],
        ['k', event.kind.toString()],
      ],
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: event.title || 'Check out this video on ZapTok',
        text: event.description || 'Amazing video on ZapTok',
        url: window.location.href,
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="flex h-full w-full max-w-6xl mx-auto">
      {/* Video Container */}
      <div className="relative flex-1 bg-black group">
        {/* Video */}
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
        
        {/* Pause Overlay - Shows when video is paused and user manually paused it */}
        {userPaused && !isPlaying && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm">
              <Play className="w-12 h-12 text-white" />
            </div>
          </div>
        )}

      {/* Bottom Info */}
      <div className="absolute bottom-4 left-4 right-4 text-white">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">@{authorName}</span>
          </div>
          
          {/* Expandable Description */}
          <div className="text-sm">
            {isDescriptionExpanded ? (
              <div className="space-y-2">
                <p>{event.title || event.description || event.content}</p>
                <div className="flex items-end space-x-2">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {event.tags
                      .filter(([name]) => name === 't')
                      .map(([, tag], index) => (
                        <span
                          key={index}
                          className="text-xs bg-gradient-to-r from-orange-400/20 via-pink-500/20 to-purple-600/20 border border-orange-400/30 px-2 py-1 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                  <button
                    onClick={() => setIsDescriptionExpanded(false)}
                    className="text-xs text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                  >
                    ...less
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <p className="truncate flex-1">
                  {event.title || event.description || event.content}
                </p>
                <button
                  onClick={() => setIsDescriptionExpanded(true)}
                  className="text-xs text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                >
                  ...more
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Right Side Actions - Now outside video */}
    <div className="flex flex-col justify-end items-center space-y-6 px-6 bg-black pb-20">
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="w-14 h-14 border-2 border-white">
          <AvatarImage src={authorAvatar} alt={authorName} />
          <AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <Button
          variant="ghost"
          size="sm"
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-white hover:bg-white/20 ${
            isLiked ? 'text-pink-500' : ''
          }`}
          onClick={handleLike}
        >
          <Heart size={28} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="text-xs mt-1">123</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-14 h-14 rounded-full flex flex-col items-center justify-center text-white hover:bg-white/20"
        >
          <MessageCircle size={28} />
          <span className="text-xs mt-1">45</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-14 h-14 rounded-full flex flex-col items-center justify-center text-white hover:bg-white/20"
          onClick={handleShare}
        >
          <Share size={28} />
          <span className="text-xs mt-1">Share</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-14 h-14 rounded-full flex items-center justify-center text-white hover:bg-white/20"
        >
          <MoreHorizontal size={28} />
        </Button>
      </div>
    </div>
  </div>
  );
}
