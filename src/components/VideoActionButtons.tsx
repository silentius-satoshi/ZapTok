import { useState } from 'react';
import { MessageCircle, Bookmark, Plus, Repeat2, ArrowUpRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { useVideoReactions } from '@/hooks/useVideoReactions';
import { useVideoComments } from '@/hooks/useVideoComments';
import { useVideoReposts } from '@/hooks/useVideoReposts';
import { useVideoNutzaps } from '@/hooks/useVideoNutzaps';
import { useRepost } from '@/hooks/useRepost';
import { useAuthor } from '@/hooks/useAuthor';
import { useFollowing } from '@/hooks/useFollowing';
import { useFollowUser } from '@/hooks/useFollowUser';
import { useBookmarkVideo } from '@/hooks/useBookmarks';
import { genUserName } from '@/lib/genUserName';
import { ZapButton } from '@/components/ZapButton';
import { NutzapButton } from '@/components/users/NutzapButton';
import { CommentsModal } from '@/components/CommentsModal';
import { QRModal } from '@/components/QRModal';
import { ShareModal } from '@/components/ShareModal';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useNostrLogin } from '@nostrify/react/login';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice, satsToUSD } from '@/hooks/useBitcoinPrice';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useCashuPreferences } from '@/hooks/useCashuPreferences';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VideoActionButtonsProps {
  event: NostrEvent;
  displayName?: string;
  profilePicture?: string;
  isBookmarked?: boolean;
  isFollowing?: boolean;
  onComment?: () => void;
  onBookmark?: () => void;
  onFollow?: () => void;
  onProfileClick?: () => void;
  onShare?: () => void;
}

export function VideoActionButtons({
  event,
  displayName,
  profilePicture,
  onComment,
  onBookmark,
  onFollow,
  onProfileClick,
  onShare,
}: VideoActionButtonsProps) {
  const { user } = useCurrentUser();
  const { withLoginCheck } = useLoginPrompt();
  const { config } = useAppContext();
  const { logins } = useNostrLogin();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { cashuEnabled } = useCashuPreferences();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRepostDialog, setShowRepostDialog] = useState(false);
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false);
  const [followAnimationState, setFollowAnimationState] = useState<'idle' | 'transitioning' | 'hiding' | 'complete'>('idle');
  const [localFollowingState, setLocalFollowingState] = useState<boolean | null>(null);
  const reactions = useVideoReactions(event.id);
  const commentsData = useVideoComments(event.id);
  const repostsData = useVideoReposts(event.id);
  const nutzapData = useVideoNutzaps(event.id);
  const { mutate: createRepost, isPending: isRepostPending } = useRepost();
  const author = useAuthor(event.pubkey);
  const following = useFollowing(user?.pubkey || '');
  // Bookmarks disabled in video feeds to prevent console spam
  const { mutate: followUser, isPending: isFollowPending } = useFollowUser();
  const { mutate: bookmarkVideo, isPending: isBookmarkPending } = useBookmarkVideo();
  const navigate = useNavigate();

  // Currency display settings
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Format nutzap amount
  const formatNutzapAmount = (amount: number): string => {
    if (showSats) {
      return amount >= 1000 ? `${(amount / 1000).toFixed(1)}K` : amount.toString();
    } else {
      if (btcPrice?.USD) {
        const usdAmount = satsToUSD(amount, btcPrice.USD);
        return usdAmount >= 1000 ? `${(usdAmount / 1000).toFixed(1)}K` : usdAmount.toFixed(2);
      }
      return amount >= 1000 ? `${(amount / 1000).toFixed(1)}K` : amount.toString();
    }
  };

  // Detect signer type to hide Cashu features for bunker signers
  const currentUserLogin = logins.find(login => login.pubkey === user?.pubkey);
  const loginType = currentUserLogin?.type;
  const isBunkerSigner = loginType === 'bunker' ||
                        loginType === 'x-bunker-nostr-tools' ||
                        user?.signer?.constructor?.name?.includes('bunker');

  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);

  // Use author data if available, otherwise fall back to props
  const authorProfile = author.data?.metadata;
  const authorDisplayName = displayName || authorProfile?.display_name || authorProfile?.name || genUserName(event.pubkey);
  const authorProfilePicture = profilePicture || authorProfile?.picture;

  // Check if currently following this user
  const followingList = following.data?.pubkeys || [];
  const isCurrentlyFollowing = followingList.includes(event.pubkey);
  
  // Use local state during animation, fall back to actual state
  const effectiveFollowingState = localFollowingState !== null ? localFollowingState : isCurrentlyFollowing;

  // Since bookmarks are disabled in feeds, always show as unbookmarked
  // This allows users to add bookmarks but doesn't fetch existing bookmark state
  const isCurrentlyBookmarked = false;

  // Default handlers
  const handleComment = onComment || (() => {
    setIsCommentsModalOpen(true);
  });

  const handleBookmark = onBookmark || (() => {
    withLoginCheck(() => {
      bookmarkVideo({
        eventId: event.id,
        isCurrentlyBookmarked: isCurrentlyBookmarked,
      }, {
        onSuccess: () => {
          toast({
            title: isCurrentlyBookmarked ? 'Bookmark Removed' : 'Video Bookmarked',
            description: isCurrentlyBookmarked 
              ? 'The video has been removed from your bookmarks.' 
              : 'The video has been saved to your bookmarks.',
          });
        },
        onError: (error) => {
          toast({
            title: 'Bookmark Failed',
            description: error instanceof Error ? error.message : 'Failed to update bookmark.',
            variant: 'destructive',
          });
        },
      });
    }, {
      loginMessage: 'Login required to bookmark videos'
    });
  });

  const handleRepost = () => {
    withLoginCheck(() => {
      // Show confirmation dialog instead of immediately reposting
      setShowRepostDialog(true);
    }, {
      loginMessage: 'Login required to repost videos'
    });
  };

  const confirmRepost = () => {
    createRepost(
      { event },
      {
        onSuccess: () => {
          toast({
            title: 'Video Reposted',
            description: 'The video has been reposted to your profile.',
          });
          setShowRepostDialog(false);
        },
        onError: (error) => {
          toast({
            title: 'Repost Failed',
            description: error instanceof Error ? error.message : 'Failed to repost the video.',
            variant: 'destructive',
          });
          setShowRepostDialog(false);
        },
      }
    );
  };

  const handleFollow = onFollow || (() => {
    withLoginCheck(() => {
      // If currently following, show confirmation dialog
      if (isCurrentlyFollowing) {
        setShowUnfollowDialog(true);
      } else {
        // Follow immediately without dialog
        confirmFollow();
      }
    }, {
      loginMessage: 'Login required to follow users'
    });
  });

  const confirmFollow = () => {
    followUser({
      pubkeyToFollow: event.pubkey,
      isCurrentlyFollowing: isCurrentlyFollowing,
    }, {
      onSuccess: () => {
        // Start animation sequence only when following (not unfollowing)
        if (!isCurrentlyFollowing) {
          // Lock the local state to NOT following during animation
          setLocalFollowingState(false);
          
          // Step 1: Transition from + to checkmark (500ms)
          setFollowAnimationState('transitioning');
          
          setTimeout(() => {
            // Step 2: Start fading out (after showing checkmark for 300ms)
            setFollowAnimationState('hiding');
            
            setTimeout(() => {
              // Step 3: Animation complete - unlock local state and hide button
              setFollowAnimationState('complete');
              setLocalFollowingState(null); // Allow actual following state to take over
            }, 400); // Fade out duration
          }, 500); // Show checkmark duration
        } else {
          // Reset animation state when unfollowing
          setFollowAnimationState('idle');
          setLocalFollowingState(null);
        }
        
        toast({
          title: isCurrentlyFollowing ? 'Unfollowed' : 'Following',
          description: isCurrentlyFollowing 
            ? `You have unfollowed ${authorDisplayName}.`
            : `You are now following ${authorDisplayName}.`,
        });
        setShowUnfollowDialog(false);
      },
      onError: (error) => {
        console.error('[Follow Error]', error);
        
        // Check for bunker permission errors
        const errorMsg = error instanceof Error ? error.message : 'Failed to update following status.';
        const isBunkerError = errorMsg.toLowerCase().includes('user rejected') || 
                              errorMsg.toLowerCase().includes('permission') ||
                              errorMsg.toLowerCase().includes('bunker');
        
        toast({
          title: 'Action Failed',
          description: isBunkerError 
            ? 'Permission denied. Please approve the follow request in your bunker app.'
            : errorMsg,
          variant: 'destructive',
        });
        setShowUnfollowDialog(false);
      },
    });
  };

  const handleShare = onShare || (() => {
    setShowShareModal(true);
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
      <div className={`flex items-center ${isMobile ? 'flex-col gap-3 w-16' : 'flex-col gap-3 w-16'}`}>
        {/* 1. Profile Picture with Follow Button (no click functionality on profile picture) */}
        <div className={`relative ${isMobile ? 'mb-2' : ''}`}>
          <div className={`rounded-full p-0 overflow-hidden bg-transparent ${
            isMobile ? 'h-12 w-12' : 'h-12 w-12'
          }`}>
            <Avatar className={isMobile ? 'h-12 w-12' : 'h-12 w-12'}>
              <AvatarImage src={authorProfilePicture} alt={authorDisplayName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                {authorDisplayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Follow Button - Hidden when already following (after animation) */}
          {user && user.pubkey !== event.pubkey && !isCurrentlyFollowing && (
            <Button
              variant="ghost"
              size="sm"
              className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 rounded-full p-0 flex items-center justify-center ${
                isMobile ? 'h-5 w-5' : 'h-6 w-6'
              } ${
                effectiveFollowingState
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-red-500 hover:bg-red-600'
              } text-white border border-white/20 shadow-md disabled:opacity-50 transition-all duration-300 ${
                followAnimationState === 'transitioning' ? 'scale-110 bg-green-500' : ''
              } ${
                followAnimationState === 'hiding' || followAnimationState === 'complete' ? 'opacity-0 scale-75' : 'opacity-100'
              }`}
              onClick={handleFollow}
              disabled={isFollowPending}
            >
              {followAnimationState === 'transitioning' ? (
                <Check className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} transition-transform duration-300`} />
              ) : (
                <Plus className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} transition-transform duration-300`} />
              )}
            </Button>
          )}
        </div>

        {/* 2. Zap Button - Interactive on both Mobile and Desktop */}
        <div className="flex flex-col items-center gap-1">
          <ZapButton
            recipientPubkey={event.pubkey}
            eventId={event.id}
            iconStyle={{
              width: '28px',
              height: '28px'
            }}
            className={isMobile ? 'h-12 w-12' : 'h-12 w-12'}
          />
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'} drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]`}>
            {reactions.totalSats > 0 ? formatCount(reactions.totalSats) : '0'}
          </span>
        </div>

        {/* 3. Nutzap Button - Only shown if Cashu features are enabled */}
        {cashuEnabled && (
          <div className="flex flex-col items-center gap-1">
            <NutzapButton
              postId={event.id}
              authorPubkey={event.pubkey}
              showText={false}
            />
            <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'} drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]`}>
              {nutzapData?.totalAmount ? formatNutzapAmount(nutzapData.totalAmount) : '0'}
            </span>
          </div>
        )}

        {/* 4. Comment Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`group rounded-full bg-transparent hover:bg-white/10 text-white transition-all duration-200 ${
              isMobile ? 'h-12 w-12' : 'h-12 w-12'
            }`}
            onClick={handleComment}
          >
            <MessageCircle
              className={`text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] group-hover:text-blue-300 group-hover:scale-110 transition-all duration-200`}
              style={{
                width: '28px',
                height: '28px'
              }}
            />
          </Button>
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'} drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]`}>
            {commentsData ? formatCount(commentsData.commentCount) : '0'}
          </span>
        </div>

        {/* 5. Repost Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`group rounded-full bg-transparent hover:bg-white/10 text-white disabled:opacity-50 transition-all duration-200 ${
              isMobile ? 'h-12 w-12' : 'h-12 w-12'
            }`}
            onClick={handleRepost}
            disabled={isRepostPending || !user}
          >
            <Repeat2
              className={`text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] group-hover:text-green-300 group-hover:scale-110 transition-all duration-200`}
              style={{
                width: '28px',
                height: '28px'
              }}
            />
          </Button>
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'} drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]`}>
            {repostsData ? formatCount(repostsData.count) : '0'}
          </span>
        </div>

        {/* 6. Bookmark Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`group rounded-full bg-transparent hover:bg-white/10 text-white disabled:opacity-50 transition-all duration-200 ${
              isMobile ? 'h-12 w-12' : 'h-12 w-12'
            }`}
            onClick={handleBookmark}
            disabled={isBookmarkPending}
          >
            <Bookmark
              className={`transition-all duration-200 ${
                isCurrentlyBookmarked
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]'
                  : 'text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] group-hover:text-yellow-300 group-hover:scale-110'
              }`}
              style={{
                width: '28px',
                height: '28px'
              }}
            />
          </Button>
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'} drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]`}>
            0
          </span>
        </div>

        {/* 7. Share Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`group rounded-full bg-transparent hover:bg-white/10 text-white transition-all duration-200 ${
              isMobile ? 'h-12 w-12' : 'h-12 w-12'
            }`}
            onClick={handleShare}
          >
            <ArrowUpRight
              className="text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] group-hover:text-blue-300 group-hover:scale-110 transition-all duration-200"
              style={{
                width: '28px',
                height: '28px'
              }}
            />
          </Button>
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'} drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]`}>
            Share
          </span>
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        videoEvent={event}
      />

      {/* QR Modal for Video Sharing */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        pubkey={event.pubkey}
        metadata={author.data?.metadata}
        displayName={authorDisplayName}
        relays={config.relayUrls}
        event={event}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        event={event}
        onQRCodeClick={() => setShowQRModal(true)}
      />

      {/* Repost Confirmation Dialog */}
      <AlertDialog open={showRepostDialog} onOpenChange={setShowRepostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Repost Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will share {authorDisplayName}'s video to your profile. Your followers will see this video in their feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRepost} disabled={isRepostPending}>
              {isRepostPending ? 'Reposting...' : 'Repost'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unfollow Confirmation Dialog */}
      <AlertDialog open={showUnfollowDialog} onOpenChange={setShowUnfollowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfollow {authorDisplayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their videos will no longer appear in your Following feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFollow} disabled={isFollowPending}>
              {isFollowPending ? 'Unfollowing...' : 'Unfollow'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
