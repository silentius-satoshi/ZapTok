import { useState } from 'react';
import { MessageCircle, Bookmark, Plus, Repeat2, ArrowUpRight, Check, QrCode } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { useVideoReactions } from '@/hooks/useVideoReactions';
import { useVideoComments } from '@/hooks/useVideoComments';
import { useVideoReposts } from '@/hooks/useVideoReposts';
import { useRepost } from '@/hooks/useRepost';
import { useAuthor } from '@/hooks/useAuthor';
import { useFollowing } from '@/hooks/useFollowing';
import { useFollowUser } from '@/hooks/useFollowUser';
import { useBookmarkVideo } from '@/hooks/useBookmarks';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { ZapButton } from '@/components/ZapButton';
import { NutzapButton } from '@/components/users/NutzapButton';
import { CommentsModal } from '@/components/CommentsModal';
import { QRModal } from '@/components/QRModal';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useNostrLogin } from '@nostrify/react/login';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@/hooks/useNostr';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice, satsToUSD } from '@/hooks/useBitcoinPrice';
import { useAppContext } from '@/hooks/useAppContext';
import { relayRateLimiter } from '@/lib/relayRateLimiter';

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
  const { user, canSign, isReadOnly } = useCurrentUser();
  const { withLoginCheck } = useLoginPrompt();
  const { config } = useAppContext();
  const { logins } = useNostrLogin();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showQRModal, setShowQRModal] = useState(false);
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

  // Nutzap data for displaying total
  const { nostr } = useNostr();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Query to get nutzap total for this post
  const { data: nutzapData } = useQuery({
    queryKey: ["nutzap-total", event.id],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await relayRateLimiter.queueQuery(
        'nutzap-queries',
        () => nostr.query([{
          kinds: [CASHU_EVENT_KINDS.ZAP],
          "#e": [event.id],
          limit: 50,
        }], { signal }),
        'low' // Low priority for nutzap queries
      );

      const totalAmount = events.reduce((sum, zapEvent) => {
        try {
          const amountTag = zapEvent.tags.find(tag => tag[0] === 'amount');
          if (amountTag && amountTag[1]) {
            const amount = parseInt(amountTag[1], 10);
            return sum + (isNaN(amount) ? 0 : amount);
          }
        } catch (error) {
          console.error("Error parsing nutzap amount:", error);
        }
        return sum;
      }, 0);

      return { totalAmount, count: events.length };
    },
  });

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
      });
    }, {
      loginMessage: 'Login required to bookmark videos'
    });
  });

  const handleRepost = () => {
    withLoginCheck(() => {
      createRepost({
        event: event,
      });
    }, {
      loginMessage: 'Login required to repost videos'
    });
  };

  const handleFollow = onFollow || (() => {
    withLoginCheck(() => {
      followUser({
        pubkeyToFollow: event.pubkey,
        isCurrentlyFollowing: isCurrentlyFollowing,
      });
    }, {
      loginMessage: 'Login required to follow users'
    });
  });

  const handleShare = onShare || (async () => {
    try {
      const nevent = nip19.neventEncode({
        id: event.id,
        author: event.pubkey,
        kind: event.kind,
      });

      const url = `${window.location.origin}/${nevent}`;

      if (navigator.share) {
        // Use native device share API when available
        await navigator.share({
          title: "ZapTok Video Post",
          url: url,
        });
      } else {
        // Fallback to copying URL to clipboard
        await navigator.clipboard.writeText(url);
        toast({
          title: "Copied!",
          description: "Post URL copied to clipboard",
        });
      }
    } catch (error) {
      // Handle errors gracefully
      if ((error as Error).name !== 'AbortError') {
        // AbortError occurs when user cancels the share dialog, which is normal
        toast({
          title: "Error",
          description: "Failed to share post",
          variant: "destructive",
        });
      }
    }
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

          {/* Follow Button */}
          {user && user.pubkey !== event.pubkey && (
            <Button
              variant="ghost"
              size="sm"
              className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 rounded-full p-0 flex items-center justify-center ${
                isMobile ? 'h-5 w-5' : 'h-6 w-6'
              } ${
                isCurrentlyFollowing
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-red-500 hover:bg-red-600'
              } text-white border border-white/20 shadow-md disabled:opacity-50`}
              onClick={handleFollow}
              disabled={isFollowPending}
            >
              {isCurrentlyFollowing ? (
                <Check className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
              ) : (
                <Plus className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
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
            {reactions.data ? formatCount(reactions.data.zaps) : '0'}
          </span>
        </div>

        {/* 3. Nutzap Button - Now available for all signer types */}
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

        {/* 8. QR Code Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={`group rounded-full bg-transparent hover:bg-white/10 text-white transition-all duration-200 ${
              isMobile ? 'h-12 w-12' : 'h-12 w-12'
            }`}
            onClick={() => setShowQRModal(true)}
          >
            <QrCode
              className="text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] group-hover:text-green-300 group-hover:scale-110 transition-all duration-200"
              style={{
                width: '28px',
                height: '28px'
              }}
            />
          </Button>
          <span className={`text-white font-bold ${isMobile ? 'text-xs' : 'text-xs'} drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]`}>
            QR
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
        displayName={displayName || genUserName(event.pubkey)}
        relays={config.relayUrls}
        event={event}
      />
    </>
  );
}
