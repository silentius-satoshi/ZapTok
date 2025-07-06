import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, Play, Pause } from 'lucide-react';
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
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const author = useAuthor(event.pubkey);

  const authorName = author.data?.metadata?.name || genUserName(event.pubkey);
  const authorAvatar = author.data?.metadata?.picture;

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
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
    <div className="relative w-full h-full bg-black group">
      {/* Video */}
      <video
        ref={videoRef}
        src={event.videoUrl}
        poster={event.thumbnail}
        className="w-full h-full object-cover"
        loop
        muted
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={handlePlayPause}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      />

      {/* Play/Pause Overlay */}
      {showControls && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Button
            variant="ghost"
            size="lg"
            className="w-16 h-16 rounded-full bg-black/50 hover:bg-black/70 text-white"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </Button>
        </div>
      )}

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-20 flex flex-col space-y-4">
        <div className="flex flex-col items-center space-y-2">
          <Avatar className="w-12 h-12 border-2 border-white">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-white hover:bg-white/20 ${
            isLiked ? 'text-pink-500' : ''
          }`}
          onClick={handleLike}
        >
          <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="text-xs mt-1">123</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-white hover:bg-white/20"
        >
          <MessageCircle size={24} />
          <span className="text-xs mt-1">45</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-white hover:bg-white/20"
          onClick={handleShare}
        >
          <Share size={24} />
          <span className="text-xs mt-1">Share</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/20"
        >
          <MoreHorizontal size={24} />
        </Button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-4 left-4 right-20 text-white">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">@{authorName}</span>
          </div>
          <p className="text-sm">
            {event.title || event.description || event.content}
          </p>
          <div className="flex flex-wrap gap-1">
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
        </div>
      </div>

      {/* Navigation hints */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 text-white/50 text-xs">
        <div className="flex flex-col space-y-1">
          <div>↑ Previous</div>
          <div>↓ Next</div>
        </div>
      </div>
    </div>
  );
}
