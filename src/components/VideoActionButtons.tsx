import { useState } from 'react';
import { MessageCircle, Bookmark, Plus, Repeat2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVideoReactions } from '@/hooks/useVideoReactions';
import { useVideoComments } from '@/hooks/useVideoComments';
import { useVideoReposts } from '@/hooks/useVideoReposts';
import { useRepost } from '@/hooks/useRepost';
import { useAuthor } from '@/hooks/useAuthor';
import { useFollowing } from '@/hooks/useFollowing';
import { useFollowUser } from '@/hooks/useFollowUser';
import { useBookmarkVideo } from '@/hooks/useBookmarks';
import { genUserName } from '@/lib/genUserName';
import { ZapButton } from '@/components/ZapButton';
import { NutzapButton } from '@/components/NutzapButton';
import { CommentsModal } from '@/components/CommentsModal';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';

interface VideoActionButtonsProps {
  event: NostrEvent;
  displayName?: string;
  profilePicture?: string;
  isBookmarked?: boolean;
  isFollowing?: boolean;
  onZap?: () => void;
  onComment?: () => void;
  onBookmark?: () => void;
  onFollow?: () => void;
  onProfileClick?: () => void;
}

export function VideoActionButtons({
  event,
  displayName,
  profilePicture,
  onZap: _onZap,
  onComment,
  onBookmark,
  onFollow,
  onProfileClick,
}: VideoActionButtonsProps) {
  const { user } = useCurrentUser();
  const isMobile = useIsMobile();
  const reactions = useVideoReactions(event.id);
  const { data: commentsData } = useVideoComments(event.id);
  const { data: repostsData } = useVideoReposts(event.id);
  const { mutate: createRepost, isPending: isRepostPending } = useRepost();
  const author = useAuthor(event.pubkey);
  const following = useFollowing(user?.pubkey || '');
  // Bookmarks disabled in video feeds to prevent console spam
  const { mutate: followUser, isPending: isFollowPending } = useFollowUser();
  const { mutate: bookmarkVideo, isPending: isBookmarkPending } = useBookmarkVideo();
  const navigate = useNavigate();

  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);

  // Use author data if available, otherwise fall back to props
  const authorProfile = author.data?.metadata;
  const authorDisplayName = displayName || authorProfile?.display_name || authorProfile?.name || genUserName(event.pubkey);
  const authorProfilePicture = profilePicture || authorProfile?.picture;

  // Check if currently following this user
  const followingList = following.data?.pubkeys || [];
  const isCurrentlyFollowing = followingList.includes(event.pubkey);

  // Since bookmarks are disabled in feeds, always show as unbookmarked
  // This allows users to add bookmarks but doesn't fetch existing bookmark state
  const isCurrentlyBookmarked = false;

  // Default handlers
  const handleComment = onComment || (() => {
    setIsCommentsModalOpen(true);
  });

  const handleBookmark = onBookmark || (() => {
    if (!user) return;

    bookmarkVideo({
      eventId: event.id,
      isCurrentlyBookmarked: isCurrentlyBookmarked,
    });
  });

  const handleRepost = () => {
    if (!user) return;

    createRepost({
      event: event,
    });
  };

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
      <div className={`flex items-center ${isMobile ? 'flex-col gap-3 w-12' : 'flex-col gap-4 w-16'}`}>
        {/* 1. Profile Picture with Follow Button (no click functionality on profile picture) */}
        <div className="relative">
          <div className={`rounded-full p-0 overflow-hidden border-2 border-gray-700 bg-gray-900/80 shadow-lg backdrop-blur-sm ${
            isMobile ? 'h-10 w-10' : 'h-12 w-12'
          }`}>
            <Avatar className={isMobile ? 'h-10 w-10' : 'h-12 w-12'}>
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
              className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 rounded-full ${
                isMobile ? 'h-4 w-4' : 'h-5 w-5'
              } ${
                isCurrentlyFollowing
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-red-500 hover:bg-red-600'
              } text-white border border-white/20 shadow-md disabled:opacity-50`}
              onClick={handleFollow}
              disabled={isFollowPending}
            >
              <Plus className={isMobile ? 'w-2 h-2' : 'w-3 h-3'} />
            </Button>
          )}
        </div>

        {/* 2. Zap Button - Display Only on Mobile, Interactive on Desktop */}
        <div className="flex flex-col items-center gap-1">
          {isMobile ? (
            // Mobile: Display-only zap button (no click action)
            <div className={`rounded-full bg-gray-900/80 text-white backdrop-blur-sm border border-gray-700 shadow-lg flex items-center justify-center ${
              isMobile ? 'h-10 w-10' : 'h-12 w-12'
            }`}>
              <Zap className={`text-yellow-400 ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} fill="currentColor" />
            </div>
          ) : (
            // Desktop: Interactive zap button
            <ZapButton
              recipientPubkey={event.pubkey}
              eventId={event.id}
              className={`rounded-full bg-gray-900/80 hover:bg-gray-800/80 text-white backdrop-blur-sm border border-gray-700 shadow-lg p-0 ${
                isMobile ? 'h-10 w-10' : 'h-12 w-12'
              }`}
            />
          )}
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'}`}>
            {reactions.data ? formatCount(reactions.data.zaps) : '0'}
          </span>
        </div>

        {/* 3. Nutzap Button */}
        <div className="flex flex-col items-center gap-1">
          <NutzapButton
            userPubkey={event.pubkey}
            eventId={event.id}
            className={`rounded-full bg-gray-900/80 hover:bg-orange-500/10 text-white backdrop-blur-sm border border-gray-700 shadow-lg p-0 ${
              isMobile ? 'h-10 w-10' : 'h-12 w-12'
            }`}
          />
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'}`}>
            {isMobile ? 'nut' : 'nutzap!'}
          </span>
        </div>

        {/* 4. Comment Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`group rounded-full bg-gray-900/80 hover:bg-blue-500/10 text-white backdrop-blur-sm border border-gray-700 shadow-lg transition-all duration-200 ${
              isMobile ? 'h-10 w-10' : 'h-12 w-12'
            }`}
            onClick={handleComment}
          >
            <MessageCircle className={`text-blue-400 drop-shadow-[0_0_4px_rgba(59,130,246,0.6)] group-hover:text-blue-300 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] group-hover:scale-110 transition-all duration-200 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
          </Button>
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'}`}>
            {commentsData ? formatCount(commentsData.commentCount) : '0'}
          </span>
        </div>

        {/* 5. Repost Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`group rounded-full bg-gray-900/80 hover:bg-green-500/10 text-white backdrop-blur-sm border border-gray-700 shadow-lg disabled:opacity-50 transition-all duration-200 ${
              isMobile ? 'h-10 w-10' : 'h-12 w-12'
            }`}
            onClick={handleRepost}
            disabled={isRepostPending || !user}
          >
            <Repeat2 className={`text-green-400 drop-shadow-[0_0_4px_rgba(34,197,94,0.6)] group-hover:text-green-300 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] group-hover:scale-110 transition-all duration-200 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            }`} />
          </Button>
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'}`}>
            {repostsData ? formatCount(repostsData.count) : '0'}
          </span>
        </div>

        {/* 6. Bookmark Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`group rounded-full bg-gray-900/80 hover:bg-purple-500/10 text-white backdrop-blur-sm border border-gray-700 shadow-lg disabled:opacity-50 transition-all duration-200 ${
              isMobile ? 'h-10 w-10' : 'h-12 w-12'
            }`}
            onClick={handleBookmark}
            disabled={isBookmarkPending}
          >
            <Bookmark className={`transition-all duration-200 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            } ${
              isCurrentlyBookmarked
                ? 'fill-purple-500 text-purple-500 drop-shadow-[0_0_8px_rgba(147,51,234,0.8)]'
                : 'text-purple-400 drop-shadow-[0_0_4px_rgba(147,51,234,0.6)] group-hover:text-purple-300 group-hover:drop-shadow-[0_0_8px_rgba(147,51,234,0.8)] group-hover:scale-110'
            }`} />
          </Button>
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'}`}>
            0
          </span>
        </div>

        {/* 7. Profile Picture Button (clickable for profile page) */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-full p-0 overflow-hidden border-2 border-gray-700 bg-gray-900/80 hover:bg-gray-800/80 shadow-lg backdrop-blur-sm ${
              isMobile ? 'h-10 w-10' : 'h-12 w-12'
            }`}
            onClick={handleProfileClick}
          >
            <Avatar className={isMobile ? 'h-10 w-10' : 'h-12 w-12'}>
              <AvatarImage src={authorProfilePicture} alt={authorDisplayName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                {authorDisplayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'}`}>
            {isMobile ? '' : 'Profile'}
          </span>
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        videoEvent={event}
      />
    </>
  );
}
