import { useState, useRef, useEffect } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { VideoActionButtons } from '@/components/VideoActionButtons';
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
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const author = useAuthor(event.pubkey);

  const authorMetadata = author.data?.metadata;
  const displayName = authorMetadata?.name || authorMetadata?.display_name || genUserName(event.pubkey);
  const profilePicture = authorMetadata?.picture;

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

  const handleZap = () => {
    if (!user) return;
    // TODO: Implement zap functionality with Lightning
    console.log('Zap functionality to be implemented');
  };

  const handleComment = () => {
    if (!user) return;
    // TODO: Open comment modal or navigate to comment view
    console.log('Comment functionality to be implemented');
  };

  const handleBookmark = () => {
    if (!user) return;
    
    setIsBookmarked(!isBookmarked);
    
    if (!isBookmarked) {
      // Create a bookmark event (kind 10003 - bookmarks and curation sets)
      createEvent({
        kind: 10003,
        content: '',
        tags: [
          ['e', event.id],
          ['p', event.pubkey],
          ['d', 'bookmarks'],
        ],
      });
    } else {
      // Create a removal event to unbookmark
      createEvent({
        kind: 10003,
        content: 'remove',
        tags: [
          ['e', event.id],
          ['p', event.pubkey],
          ['d', 'bookmarks'],
        ],
      });
    }
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

  const handleFollow = () => {
    if (!user) return;
    
    setIsFollowing(!isFollowing);
    
    // TODO: Update contact list (kind 3) to add/remove this user
    console.log('Follow functionality to be implemented');
  };

  const handleProfileClick = () => {
    // TODO: Navigate to user profile
    console.log('Navigate to profile:', event.pubkey);
  };

  return (
    <div className="flex h-full w-full max-w-lg mx-auto bg-black">
      {/* Mobile-First Video Container */}
      <div className="relative flex-1 bg-black">
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
        <div className="absolute bottom-4 left-4 right-4 text-white z-10">
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

      {/* Action Buttons - Outside Video Container at Bottom Right */}
      <VideoActionButtons
        event={event}
        displayName={displayName}
        profilePicture={profilePicture}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
        isFollowing={isFollowing}
        onLike={handleLike}
        onZap={handleZap}
        onComment={handleComment}
        onBookmark={handleBookmark}
        onShare={handleShare}
        onFollow={handleFollow}
        onProfileClick={handleProfileClick}
      />
    </div>
  );
}
