import { Heart, MessageCircle, Send, Zap, Bookmark, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVideoReactions } from '@/hooks/useVideoReactions';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoActionButtonsProps {
  event: NostrEvent;
  displayName?: string;
  profilePicture?: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
  onLike?: () => void;
  onZap?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  onProfileClick?: () => void;
}

export function VideoActionButtons({
  event,
  displayName,
  profilePicture,
  isLiked = false,
  isBookmarked = false,
  isFollowing = false,
  onLike,
  onZap,
  onComment,
  onBookmark,
  onShare,
  onFollow,
  onProfileClick,
}: VideoActionButtonsProps) {
  const { user } = useCurrentUser();
  const reactions = useVideoReactions(event.id);
  const author = useAuthor(event.pubkey);

  // Use author data if available, otherwise fall back to props
  const authorProfile = author.data?.metadata;
  const authorDisplayName = displayName || authorProfile?.display_name || authorProfile?.name || genUserName(event.pubkey);
  const authorProfilePicture = profilePicture || authorProfile?.picture;

  // Default handlers
  const handleLike = onLike || (() => {
    // TODO: Implement like functionality
    console.log('Like clicked');
  });

  const handleZap = onZap || (() => {
    // TODO: Implement zap functionality
    console.log('Zap clicked');
  });

  const handleComment = onComment || (() => {
    // TODO: Implement comment functionality
    console.log('Comment clicked');
  });

  const handleBookmark = onBookmark || (() => {
    // TODO: Implement bookmark functionality
    console.log('Bookmark clicked');
  });

  const handleShare = onShare || (() => {
    // TODO: Implement share functionality
    console.log('Share clicked');
  });

  const handleFollow = onFollow || (() => {
    // TODO: Implement follow functionality
    console.log('Follow clicked');
  });

  const handleProfileClick = onProfileClick || (() => {
    // TODO: Implement profile click functionality
    console.log('Profile clicked');
  });

  // Format large numbers (e.g., 1234 -> 1.2K)
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  return (
    <div className="flex flex-col items-center gap-4 w-16">
      {/* 1. Profile Picture with Follow Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full p-0 h-12 w-12 overflow-hidden border-2 border-gray-700 bg-gray-900/80 hover:bg-gray-800/80 shadow-lg backdrop-blur-sm"
          onClick={handleProfileClick}
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={authorProfilePicture} alt={authorDisplayName} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
              {authorDisplayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
        
        {/* Follow Button */}
        {user && user.pubkey !== event.pubkey && (
          <Button
            variant="ghost"
            size="sm"
            className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 rounded-full h-5 w-5 ${
              isFollowing 
                ? 'bg-gray-600 hover:bg-gray-700' 
                : 'bg-red-500 hover:bg-red-600'
            } text-white border border-white/20 shadow-md`}
            onClick={handleFollow}
          >
            <Plus className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* 2. Like Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-gray-900/80 hover:bg-gray-800/80 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg"
          onClick={handleLike}
        >
          <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
        <span className="text-white text-xs font-bold">
          {reactions.data ? formatCount(reactions.data.likes) : '0'}
        </span>
      </div>

      {/* 3. Comment Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-gray-900/80 hover:bg-gray-800/80 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg"
          onClick={handleComment}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
        <span className="text-white text-xs font-bold">
          0
        </span>
      </div>

      {/* 4. Bookmark Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-gray-900/80 hover:bg-gray-800/80 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg"
          onClick={handleBookmark}
        >
          <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
        </Button>
        <span className="text-white text-xs font-bold">
          0
        </span>
      </div>

      {/* 5. Share Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-gray-900/80 hover:bg-gray-800/80 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg"
          onClick={handleShare}
        >
          <Send className="w-6 h-6" />
        </Button>
        <span className="text-white text-xs font-bold">
          Share
        </span>
      </div>

      {/* 6. Zap Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-gray-900/80 hover:bg-gray-800/80 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg"
          onClick={handleZap}
        >
          <Zap className="w-6 h-6 text-yellow-500" />
        </Button>
        <span className="text-white text-xs font-bold">
          {reactions.data ? formatCount(reactions.data.zaps) : '0'}
        </span>
      </div>
    </div>
  );
}
