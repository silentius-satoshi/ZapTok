import { Heart, MessageCircle, Send, Bookmark, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVideoReactions } from '@/hooks/useVideoReactions';
import { useAuthor } from '@/hooks/useAuthor';
import { useFollowing } from '@/hooks/useFollowing';
import { useFollowUser } from '@/hooks/useFollowUser';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useBookmarkVideo } from '@/hooks/useBookmarks';
import { genUserName } from '@/lib/genUserName';
import { ZapButton } from '@/components/ZapButton';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNavigate } from 'react-router-dom';

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
  onLike,
  onZap: _onZap,
  onComment,
  onBookmark,
  onShare,
  onFollow,
  onProfileClick,
}: VideoActionButtonsProps) {
  const { user } = useCurrentUser();
  const reactions = useVideoReactions(event.id);
  const author = useAuthor(event.pubkey);
  const following = useFollowing(user?.pubkey || '');
  const bookmarks = useBookmarks(user?.pubkey);
  const { mutate: followUser, isPending: isFollowPending } = useFollowUser();
  const { mutate: bookmarkVideo, isPending: isBookmarkPending } = useBookmarkVideo();
  const navigate = useNavigate();

  // Use author data if available, otherwise fall back to props
  const authorProfile = author.data?.metadata;
  const authorDisplayName = displayName || authorProfile?.display_name || authorProfile?.name || genUserName(event.pubkey);
  const authorProfilePicture = profilePicture || authorProfile?.picture;
  
  // Check if currently following this user
  const followingList = following.data?.pubkeys || [];
  const isCurrentlyFollowing = followingList.includes(event.pubkey);
  
  // Check if currently bookmarked
  const bookmarkList = bookmarks.data?.bookmarks || [];
  const isCurrentlyBookmarked = bookmarkList.includes(event.id);
  
  // Check if current user has liked this video
  const currentUserReaction = user?.pubkey ? reactions.data?.userReactions.get(user.pubkey) : null;
  const isLiked = currentUserReaction && 
    ['+', '❤️', '👍', '🤙'].includes(currentUserReaction.content.trim());

  // Default handlers
  const handleLike = onLike || (() => {
    // TODO: Implement like functionality
    console.log('Like clicked');
  });

  const handleComment = onComment || (() => {
    // TODO: Implement comment functionality
    console.log('Comment clicked');
  });

  const handleBookmark = onBookmark || (() => {
    if (!user) return;
    
    bookmarkVideo({
      eventId: event.id,
      isCurrentlyBookmarked: isCurrentlyBookmarked,
    });
  });

  const handleShare = onShare || (() => {
    // TODO: Implement share functionality
    console.log('Share clicked');
  });

  const handleFollow = onFollow || (() => {
    if (!user) return;
    
    followUser({
      pubkeyToFollow: event.pubkey,
      isCurrentlyFollowing: isCurrentlyFollowing,
    });
  });

  const handleProfileClick = onProfileClick || (() => {
    navigate(`/profile/${event.pubkey}`);
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
    <>
      <div className="flex flex-col items-center gap-4 w-16">
        {/* 1. Profile Picture with Follow Button (no click functionality on profile picture) */}
        <div className="relative">
          <div className="rounded-full p-0 h-12 w-12 overflow-hidden border-2 border-gray-700 bg-gray-900/80 shadow-lg backdrop-blur-sm">
            <Avatar className="h-12 w-12">
              <AvatarImage src={authorProfilePicture} alt={authorDisplayName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                {authorDisplayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Follow Button */}
          {user && user.pubkey !== event.pubkey && (
            <Button
              variant="ghost"
              size="sm"
              className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 rounded-full h-5 w-5 ${
                isCurrentlyFollowing 
                  ? 'bg-gray-600 hover:bg-gray-700' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white border border-white/20 shadow-md disabled:opacity-50`}
              onClick={handleFollow}
              disabled={isFollowPending}
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
            className="group rounded-full bg-gray-900/80 hover:bg-red-500/10 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg transition-all duration-200"
            onClick={handleLike}
          >
            <Heart className={`w-6 h-6 transition-all duration-200 ${
              isLiked 
                ? 'fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' 
                : 'text-red-400 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)] group-hover:text-red-300 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] group-hover:scale-110'
            }`} />
          </Button>
          <span className="text-white text-xs font-bold">
            {reactions.data ? formatCount(reactions.data.likes) : '0'}
          </span>
        </div>

        {/* 3. Zap Button */}
        <div className="flex flex-col items-center gap-1">
          <ZapButton
            recipientPubkey={event.pubkey}
            eventId={event.id}
            amount={21}
            className="rounded-full bg-gray-900/80 hover:bg-gray-800/80 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg p-0"
          />
          <span className="text-white text-xs font-bold">
            {reactions.data ? formatCount(reactions.data.zaps) : '0'}
          </span>
        </div>

        {/* 4. Comment Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="group rounded-full bg-gray-900/80 hover:bg-blue-500/10 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg transition-all duration-200"
            onClick={handleComment}
          >
            <MessageCircle className="w-6 h-6 text-blue-400 drop-shadow-[0_0_4px_rgba(59,130,246,0.6)] group-hover:text-blue-300 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] group-hover:scale-110 transition-all duration-200" />
          </Button>
          <span className="text-white text-xs font-bold">
            0
          </span>
        </div>

        {/* 5. Bookmark Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="group rounded-full bg-gray-900/80 hover:bg-purple-500/10 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg disabled:opacity-50 transition-all duration-200"
            onClick={handleBookmark}
            disabled={isBookmarkPending}
          >
            <Bookmark className={`w-6 h-6 transition-all duration-200 ${
              isCurrentlyBookmarked 
                ? 'fill-purple-500 text-purple-500 drop-shadow-[0_0_8px_rgba(147,51,234,0.8)]' 
                : 'text-purple-400 drop-shadow-[0_0_4px_rgba(147,51,234,0.6)] group-hover:text-purple-300 group-hover:drop-shadow-[0_0_8px_rgba(147,51,234,0.8)] group-hover:scale-110'
            }`} />
          </Button>
          <span className="text-white text-xs font-bold">
            {isCurrentlyBookmarked ? 'Saved' : 'Save'}
          </span>
        </div>

        {/* 6. Share Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="group rounded-full bg-gray-900/80 hover:bg-gray-600/20 text-white h-12 w-12 backdrop-blur-sm border border-gray-700 shadow-lg transition-all duration-200"
            onClick={handleShare}
          >
            <Send className="w-6 h-6 text-gray-300 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)] group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] group-hover:scale-110 transition-all duration-200" />
          </Button>
          <span className="text-white text-xs font-bold">
            Share
          </span>
        </div>

        {/* 7. Profile Picture Button (clickable for profile page) */}
        <div className="flex flex-col items-center gap-1">
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
          <span className="text-white text-xs font-bold">
            Profile
          </span>
        </div>
      </div>
    </>
  );
}
