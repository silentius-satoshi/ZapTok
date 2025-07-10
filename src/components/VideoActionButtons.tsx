import { Heart, MessageCircle, Send, Zap, Bookmark, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVideoReactions } from '@/hooks/useVideoReactions';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoActionButtonsProps {
  event: NostrEvent;
  displayName: string;
  profilePicture?: string;
  isLiked: boolean;
  isBookmarked: boolean;
  isFollowing: boolean;
  onLike: () => void;
  onZap: () => void;
  onComment: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onFollow: () => void;
  onProfileClick: () => void;
}

export function VideoActionButtons({
  event,
  displayName,
  profilePicture,
  isLiked,
  isBookmarked,
  isFollowing,
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
    <div className="flex flex-col justify-end items-center gap-4 p-4 w-16 bg-black">
      {/* 1. Profile Picture with Follow Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full p-0 h-12 w-12 overflow-hidden border-2 border-white/20"
          onClick={onProfileClick}
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={profilePicture} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
              {displayName.slice(0, 2).toUpperCase()}
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
            } text-white border border-white/20`}
            onClick={onFollow}
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
          className="rounded-full bg-gray-800/80 hover:bg-gray-700/80 text-white h-12 w-12 backdrop-blur-sm"
          onClick={onLike}
        >
          <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
        <span className="text-white text-xs font-medium">
          {reactions.data ? formatCount(reactions.data.likes) : '0'}
        </span>
      </div>

      {/* 3. Zap Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-gray-800/80 hover:bg-gray-700/80 text-white h-12 w-12 backdrop-blur-sm"
          onClick={onZap}
        >
          <Zap className="w-6 h-6 text-yellow-500" />
        </Button>
        <span className="text-white text-xs font-medium">
          {reactions.data ? formatCount(reactions.data.zaps) : '0'}
        </span>
      </div>

      {/* 4. Comment Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-gray-800/80 hover:bg-gray-700/80 text-white h-12 w-12 backdrop-blur-sm"
          onClick={onComment}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
        <span className="text-white text-xs font-medium">
          {/* TODO: Implement comment count when comments are added */}
          0
        </span>
      </div>

      {/* 5. Bookmark Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-gray-800/80 hover:bg-gray-700/80 text-white h-12 w-12 backdrop-blur-sm"
          onClick={onBookmark}
        >
          <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
        </Button>
        <span className="text-white text-xs font-medium">
          {/* TODO: Implement bookmark count when bookmarks are added */}
          0
        </span>
      </div>

      {/* 6. Share Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full bg-gray-800/80 hover:bg-gray-700/80 text-white h-12 w-12 backdrop-blur-sm"
          onClick={onShare}
        >
          <Send className="w-6 h-6" />
        </Button>
      </div>

      {/* 7. Profile Picture (Second Instance) */}
      <Button
        variant="ghost"
        size="sm"
        className="rounded-full p-0 h-12 w-12 overflow-hidden border-2 border-white/20"
        onClick={onProfileClick}
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={profilePicture} alt={displayName} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Button>
    </div>
  );
}
