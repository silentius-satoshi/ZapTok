import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthGate } from '@/components/AuthGate';
import { LogoHeader } from '@/components/LogoHeader';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useFollowing } from '@/hooks/useFollowing';
import { useFollowUser } from '@/hooks/useFollowUser';
import { useBookmarkedVideos } from '@/hooks/useBookmarkedVideos';
import { useUserVideos } from '@/hooks/useUserVideos';
import { useRepostedVideos } from '@/hooks/useRepostedVideos';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { useUserReceivedZapsTotal } from '@/hooks/useUserReceivedZaps';
import { useInitializeAnalyticsServices } from '@/hooks/useInitializeAnalyticsServices';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { VideoGrid } from '@/components/VideoGrid';
import { VideoCard } from '@/components/VideoCard';
import { VideoActionButtons } from '@/components/VideoActionButtons';
import { Users, Edit, ArrowLeft, QrCode, MessageCircle, UserPlus, UserMinus, Send, Bell, X } from 'lucide-react';
import { FollowingListModal } from '@/components/FollowingListModal';
import { FollowersListModal } from '@/components/FollowersListModal';
import { EditProfileForm } from '@/components/EditProfileForm';
import { QRModal } from '@/components/QRModal';
import { ZapButton } from '@/components/ZapButton';
import { NutzapButton } from '@/components/users/NutzapButton';
import { UserNutzapDialog } from '@/components/users/UserNutzapDialog';
import { NotificationSettings } from '@/components/NotificationSettings';
import { useToast } from '@/hooks/useToast';
import { useAppContext } from '@/hooks/useAppContext';
import { useNostrLogin } from '@nostrify/react/login';
import { nip19 } from 'nostr-tools';
import { usePrimalFollowerCount } from '@/hooks/usePrimalFollowerCount';
import { getLightningAddress } from '@/lib/lightning';
import { isYouTubeUrl } from '@/lib/youtubeEmbed';
import nostrJson from '@/.well-known/nostr.json';
import { useNip05Verification } from '@/hooks/useNip05Verification';

// Helper function to check if pubkey is in nostr.json
const isZapTokVerified = (pubkey: string): boolean => {
  return Object.values(nostrJson.names).includes(pubkey);
};

const Profile = () => {
  const { pubkey: paramPubkey } = useParams();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { logins } = useNostrLogin();
  const { toast } = useToast();
  const { withLoginCheck } = useLoginPrompt();
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'bookmarks'>('posts');
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isNutzapDialogOpen, setIsNutzapDialogOpen] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoViewerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Detect signer type to hide Cashu features for bunker signers
  const currentUserLogin = logins.find(login => login.pubkey === user?.pubkey);
  const loginType = currentUserLogin?.type;
  const isBunkerSigner = loginType === 'bunker' ||
                        loginType === 'x-bunker-nostr-tools' ||
                        user?.signer?.constructor?.name?.includes('bunker');

  // Prevent body scrolling when edit form is shown
  useEffect(() => {
    if (showEditForm) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [showEditForm]);

  // Reset video viewer when profile changes
  useEffect(() => {
    setShowVideoViewer(false);
    setCurrentVideoIndex(0);
  }, [paramPubkey]);

  // Handle both hex pubkeys and npub identifiers
  const targetPubkey = (() => {
    if (!paramPubkey) return user?.pubkey || '';

    // If it looks like an npub, decode it
    if (paramPubkey.startsWith('npub1')) {
      try {
        const decoded = nip19.decode(paramPubkey);
        if (decoded.type === 'npub') {
          return decoded.data;
        }
      } catch (error) {
        console.error('Failed to decode npub:', error);
      }
    }

    // Otherwise assume it's a hex pubkey
    return paramPubkey;
  })();

  const isOwnProfile = !paramPubkey || targetPubkey === user?.pubkey;

  // Initialize analytics services for video reactions/comments/reposts
  useInitializeAnalyticsServices();

  const author = useAuthor(targetPubkey);
  const following = useFollowing(targetPubkey);
  const currentUserFollowing = useFollowing(user?.pubkey || '');
  const followUser = useFollowUser();
  const bookmarkedVideos = useBookmarkedVideos(isOwnProfile ? user?.pubkey : undefined);
  const userVideos = useUserVideos(targetPubkey);
  const repostedVideos = useRepostedVideos(targetPubkey);
  const metadata = author.data?.metadata;
  
  // Fetch accurate follower and following counts from Primal
  const { followerCount, followingCount, isLoading: followerCountLoading } = usePrimalFollowerCount(targetPubkey);

  // Fetch zap statistics for the user
  const { total: receivedSats, isLoading: receivedZapsLoading } = useUserReceivedZapsTotal(targetPubkey);

  // Check if current user is following the target user
  const isFollowingTarget = Boolean(
    user?.pubkey &&
    currentUserFollowing?.data?.pubkeys &&
    (currentUserFollowing.data.pubkeys as string[]).includes(targetPubkey)
  );

  const displayName = metadata?.display_name || metadata?.name || genUserName(targetPubkey);
  const userName = metadata?.name || genUserName(targetPubkey);
  const bio = metadata?.about;
  const profileImage = metadata?.picture;
  const website = metadata?.website;
  const nip05 = metadata?.nip05;
  const lightningAddress = getLightningAddress(metadata);

  // Verify NIP-05 identifier
  const { isValid: isNip05Verified } = useNip05Verification(nip05, targetPubkey);

  // Generate NIP-19 identifiers for meta tags
  const npub = targetPubkey ? nip19.npubEncode(targetPubkey) : '';
  const nprofile = targetPubkey ? nip19.nprofileEncode({ pubkey: targetPubkey }) : '';

  useSeoMeta({
    title: isOwnProfile ? 'My Profile - ZapTok' : `${displayName} - ZapTok`,
    description: bio || `View ${displayName}'s profile on ZapTok`,
    // NIP-21 meta tags for profile attribution
    ...(targetPubkey && {
      'link:me': `nostr:${npub}`,
      'link:author': `nostr:${nprofile}`,
    }),
  });

  const handleFollowingClick = () => {
    setShowFollowingModal(true);
  };

  const handleFollowToggle = async () => {
    await withLoginCheck(async () => {
      if (!user) return;

      try {
        const result = await followUser.mutateAsync({
          pubkeyToFollow: targetPubkey,
          isCurrentlyFollowing: isFollowingTarget
        });
        toast({
          title: "Success",
          description: result.isNowFollowing ? "User followed" : "User unfollowed",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update follow status",
          variant: "destructive",
        });
      }
    }, {
      loginMessage: 'Login required to follow users',
    });
  };

  const handleDirectMessage = () => {
    withLoginCheck(() => {
      // TODO: Implement direct message functionality
      toast({
        title: "Coming Soon",
        description: "Direct messaging feature is coming soon!",
      });
    }, {
      loginMessage: 'Login required to send direct messages',
    });
  };

  const handleVideoClick = (index: number) => {
    setCurrentVideoIndex(index);
    setShowVideoViewer(true);
  };

  const handleCloseVideoViewer = () => {
    setShowVideoViewer(false);
  };

  const handleNextVideo = () => {
    const videos = getCurrentVideos();
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  // Track scroll position to update current video index
  useEffect(() => {
    if (!showVideoViewer || !videoViewerRef.current) return;

    const handleScroll = () => {
      const container = videoViewerRef.current;
      if (!container) return;

      const scrollPosition = container.scrollTop;
      const videoHeight = container.clientHeight;
      const newIndex = Math.round(scrollPosition / videoHeight);
      
      if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < getCurrentVideos().length) {
        setCurrentVideoIndex(newIndex);
      }
    };

    const container = videoViewerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [showVideoViewer, currentVideoIndex]);

  // Scroll to the clicked video when viewer opens
  useEffect(() => {
    if (showVideoViewer && videoViewerRef.current) {
      const container = videoViewerRef.current;
      const videoHeight = container.clientHeight;
      const scrollPosition = currentVideoIndex * videoHeight;
      
      container.scrollTo({
        top: scrollPosition,
        behavior: 'instant'
      });
    }
  }, [showVideoViewer]);

  // Get the current video list based on active tab
  const getCurrentVideos = () => {
    if (activeTab === 'posts') return userVideos.data || [];
    if (activeTab === 'reposts') return repostedVideos.data || [];
    if (activeTab === 'bookmarks' && isOwnProfile) return bookmarkedVideos.data || [];
    return [];
  };

  const currentVideos = getCurrentVideos();

  if (showEditForm && isOwnProfile) {
    return (
      <AuthGate>
        <div className="h-screen bg-black text-white overflow-hidden">
          <main className="h-full flex">
            <div className="flex w-full">
              {/* Left Sidebar - Logo and Navigation - Hidden on Mobile */}
              {!isMobile && (
                <div className="flex flex-col bg-black">
                  <LogoHeader />
                  <div className="flex-1">
                    <Navigation />
                  </div>
                </div>
              )}

              {/* Edit Profile Content - Full Width on Mobile */}
              <div className="flex-1 h-full overflow-y-auto overflow-x-hidden scrollbar-hide">
                <div className={`max-w-2xl mx-auto ${isMobile ? 'p-4' : 'p-6'} min-h-full`}>
                  <div className="mb-6">
                    <Button
                      variant="ghost"
                      className="mb-4"
                      onClick={() => setShowEditForm(false)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Profile
                    </Button>
                    <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold flex items-center space-x-2`}>
                      <Edit className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
                      <span>Edit Profile</span>
                    </h1>
                  </div>
                  <EditProfileForm />
                </div>
              </div>

              {/* Right Sidebar - Compact Login Area - Hidden on Mobile */}
              {!isMobile && (
                <div className="hidden lg:block w-96 p-3 overflow-visible relative">
                  <div className="sticky top-4 overflow-visible">
                    <LoginArea className="justify-end max-w-full" />
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </AuthGate>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-black text-white overflow-x-hidden">
        <main className="h-screen">
          <div className="flex h-full">
            {/* Left Sidebar - Logo and Navigation - Hidden on Mobile */}
            {!isMobile && (
              <div className="flex flex-col bg-black">
                <LogoHeader />
                <div className="flex-1">
                  <Navigation />
                </div>
              </div>
            )}

            {/* Profile Content - Full Width on Mobile */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                <div className={`max-w-4xl mx-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                  {/* Back Button - Show for own profile on mobile */}
                  {isMobile && isOwnProfile && (
                    <Link to="/">
                      <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                      </Button>
                    </Link>
                  )}

                  {/* Profile Header */}
                  <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
                    <div className="flex flex-col items-center space-y-6">
                      <div className="relative">
                        {/* Voltage effect for ZapTok verified users */}
                        {isZapTokVerified(targetPubkey) && (
                          <div className="voltage-wrapper">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 234.6 234.6" preserveAspectRatio="none">
                              <defs>
                                <filter id="glow">
                                  <feGaussianBlur className="blur" result="coloredBlur" stdDeviation="4"></feGaussianBlur>
                                  <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="1" seed="0" result="turbulence">
                                    <animate attributeName="seed" from="0" to="100" dur="8s" repeatCount="indefinite"></animate>
                                  </feTurbulence>
                                  <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="96" xChannelSelector="R" yChannelSelector="R" result="displace"></feDisplacementMap>
                                  <feMerge>
                                    <feMergeNode in="coloredBlur"></feMergeNode>
                                    <feMergeNode in="displace"></feMergeNode>
                                  </feMerge>
                                </filter>
                                {/* Radial gradients for burst effects */}
                                <radialGradient id="burst-gradient-orange">
                                  <stop offset="0%" style={{ stopColor: '#fb923c', stopOpacity: 1 }} />
                                  <stop offset="100%" style={{ stopColor: '#fb923c', stopOpacity: 0 }} />
                                </radialGradient>
                                <radialGradient id="burst-gradient-pink">
                                  <stop offset="0%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
                                  <stop offset="100%" style={{ stopColor: '#7c3aed', stopOpacity: 0 }} />
                                </radialGradient>
                                <radialGradient id="burst-gradient-purple">
                                  <stop offset="0%" style={{ stopColor: '#6b21a8', stopOpacity: 1 }} />
                                  <stop offset="100%" style={{ stopColor: '#6b21a8', stopOpacity: 0 }} />
                                </radialGradient>
                              </defs>
                              <circle className="voltage-line-1" cx="117.3" cy="117.3" r="110" fill="none" strokeWidth="3" filter="url(#glow)"/>
                              <circle className="voltage-line-2" cx="117.3" cy="117.3" r="110" fill="none" strokeWidth="3" filter="url(#glow)"/>
                              <circle className="voltage-line-3" cx="117.3" cy="117.3" r="110" fill="none" strokeWidth="3" filter="url(#glow)"/>
                              {/* Inner offset rings for depth */}
                              <circle className="voltage-line-inner-1" cx="117.3" cy="117.3" r="105" fill="none" strokeWidth="2" filter="url(#glow)"/>
                              <circle className="voltage-line-inner-2" cx="117.3" cy="117.3" r="115" fill="none" strokeWidth="2" filter="url(#glow)"/>
                              {/* Lightning burst elements */}
                              <circle className="lightning-burst burst-1" cx="117.3" cy="7.3" r="8" fill="url(#burst-gradient-orange)" filter="url(#glow)"/>
                              <circle className="lightning-burst burst-2" cx="207.3" cy="67.3" r="6" fill="url(#burst-gradient-pink)" filter="url(#glow)"/>
                              <circle className="lightning-burst burst-3" cx="207.3" cy="167.3" r="7" fill="url(#burst-gradient-purple)" filter="url(#glow)"/>
                              <circle className="lightning-burst burst-4" cx="117.3" cy="227.3" r="5" fill="url(#burst-gradient-orange)" filter="url(#glow)"/>
                              <circle className="lightning-burst burst-5" cx="27.3" cy="167.3" r="6" fill="url(#burst-gradient-pink)" filter="url(#glow)"/>
                              <circle className="lightning-burst burst-6" cx="27.3" cy="67.3" r="7" fill="url(#burst-gradient-purple)" filter="url(#glow)"/>
                            </svg>
                            <div className="dots">
                              <div className="dot dot-1"></div>
                              <div className="dot dot-2"></div>
                              <div className="dot dot-3"></div>
                              <div className="dot dot-4"></div>
                              <div className="dot dot-5"></div>
                            </div>
                          </div>
                        )}
                        
                        <Avatar className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} relative z-0`}>
                          <AvatarImage src={profileImage} alt={displayName} />
                          <AvatarFallback className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>
                            {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Notification Settings Button - Only for own profile */}
                        {isOwnProfile && (
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-gray-800 hover:bg-gray-700 border-2 border-black shadow-lg z-20"
                            onClick={() => setShowNotificationSettings(true)}
                          >
                            <Bell className="w-5 h-5" />
                          </Button>
                        )}

                        {/* QR Code Button - Only for other users' profiles */}
                        {!isOwnProfile && (
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-gray-800 hover:bg-gray-700 border-2 border-black shadow-lg z-20"
                            onClick={() => setShowQRModal(true)}
                          >
                            <QrCode className="w-5 h-5" />
                          </Button>
                        )}
                      </div>

                      <div className="text-center space-y-3">
                        <div className="flex items-center justify-center gap-2">
                          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>{displayName}</h1>
                          {/* Only show verified badge if nip05 is actually verified */}
                          {nip05 && isNip05Verified === true && (
                            <div className="relative w-6 h-6 flex items-center justify-center">
                              <svg
                                viewBox="0 0 24 24"
                                className="w-full h-full"
                                style={{
                                  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
                                }}
                              >
                                <defs>
                                  <linearGradient id={isZapTokVerified(targetPubkey) ? 'zaptokGradient' : 'standardGradient'} x1="0%" y1="0%" x2="100%" y2="0%">
                                    {isZapTokVerified(targetPubkey) ? (
                                      <>
                                        {/* ZapTok gradient colors */}
                                        <stop offset="0%" style={{ stopColor: '#fb923c', stopOpacity: 1 }} />
                                        <stop offset="35%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#9333ea', stopOpacity: 1 }} />
                                      </>
                                    ) : (
                                      <>
                                        {/* Plain gray for non-ZapTok verified */}
                                        <stop offset="0%" style={{ stopColor: '#6b7280', stopOpacity: 1 }} />
                                        <stop offset="100%" style={{ stopColor: '#6b7280', stopOpacity: 1 }} />
                                      </>
                                    )}
                                  </linearGradient>
                                </defs>
                                {/* Badge with decorative ridged edges */}
                                <path
                                  d="M12 2L13.5 3.5L15.5 3L16.5 4.5L18.5 4.5L19 6.5L21 7.5L21 9.5L22 12L21 14.5L21 16.5L19 17.5L18.5 19.5L16.5 19.5L15.5 21L13.5 20.5L12 22L10.5 20.5L8.5 21L7.5 19.5L5.5 19.5L5 17.5L3 16.5L3 14.5L2 12L3 9.5L3 7.5L5 6.5L5.5 4.5L7.5 4.5L8.5 3L10.5 3.5L12 2Z"
                                  fill={isZapTokVerified(targetPubkey) ? 'url(#zaptokGradient)' : 'url(#standardGradient)'}
                                />
                                {/* White checkmark */}
                                <path
                                  d="M9 12l2 2 4-4"
                                  stroke="white"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  fill="none"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {nip05 && (
                            <Badge 
                              variant="secondary" 
                              className="text-sm bg-transparent hover:bg-gray-800 cursor-pointer transition-colors"
                              onClick={() => {
                                navigator.clipboard.writeText(nip05);
                                toast({
                                  title: "Copied!",
                                  description: "NIP-05 identifier copied to clipboard",
                                });
                              }}
                            >
                              {nip05}
                            </Badge>
                          )}
                          
                          {nip05 && lightningAddress && (
                            <Separator orientation="vertical" className="h-4" />
                          )}
                          
                          {lightningAddress && (
                            <Badge
                              variant="secondary"
                              className="text-sm bg-transparent hover:bg-gray-800 cursor-pointer transition-colors inline-flex items-center gap-1.5"
                              onClick={() => {
                                navigator.clipboard.writeText(lightningAddress);
                                toast({
                                  title: "Copied!",
                                  description: "Lightning address copied to clipboard",
                                });
                              }}
                            >
                              <span className="text-yellow-500">⚡</span>
                              <span>{lightningAddress}</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Profile Stats - Followers, Following, Zap Stats with Four-way Divider */}
                      <div className={`flex ${isMobile ? 'flex-wrap justify-center gap-1' : 'items-center'}`}>
                        {/* 1. Followers */}
                        <div
                          onClick={() => setShowFollowersModal(true)}
                          className="flex items-center space-x-2 cursor-pointer hover:opacity-70 transition-opacity"
                        >
                          <Users className="w-4 h-4" />
                          <span>
                            {followerCount !== null && followerCount !== undefined 
                              ? `${followerCount.toLocaleString()} Followers`
                              : 'Followers'
                            }
                          </span>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-2" />

                        {/* 2. Following */}
                        <div
                          onClick={handleFollowingClick}
                          className={`flex items-center space-x-2 ${
                            followerCountLoading || !following.data?.count
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:opacity-70 transition-opacity'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                          <span>
                            {followerCountLoading 
                              ? 'Loading...' 
                              : followingCount !== null && followingCount !== undefined
                                ? `${followingCount.toLocaleString()} Following`
                                : `${following.data?.count || 0} Following`
                            }
                          </span>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-2" />

                        {/* 3. Sats Received */}
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-500">⚡</span>
                          <span>
                            {receivedZapsLoading ? (
                              'Loading...'
                            ) : (
                              `${receivedSats.toLocaleString()} Received`
                            )}
                          </span>
                        </div>

                      </div>

                      {/* Edit Profile Button - Only for own profile */}
                      {isOwnProfile && (
                        <Button
                          variant="outline"
                          onClick={() => withLoginCheck(() => setShowEditForm(true), {
                            loginMessage: 'Login required to edit profile',
                          })}
                          className="flex items-center space-x-2"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit Profile</span>
                        </Button>
                      )}

                      {/* Bio - No border */}
                      {bio && (
                        <div className="w-full max-w-2xl">
                          <p className="text-center text-gray-300 whitespace-pre-wrap">{bio}</p>
                        </div>
                      )}

                      {/* Action Buttons Below Bio - Only for other profiles */}
                      {!isOwnProfile && (
                        <div className={`flex ${isMobile ? 'flex-wrap justify-center gap-2' : 'space-x-3'}`}>
                          {/* 1. Follow/Unfollow Button */}
                          <Button
                            variant={isFollowingTarget ? "secondary" : "default"}
                            onClick={handleFollowToggle}
                            disabled={followUser.isPending || !user}
                            className="flex items-center space-x-2"
                          >
                            {isFollowingTarget ? (
                              <UserMinus className="w-4 h-4" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                            <span>
                              {followUser.isPending
                                ? 'Loading...'
                                : isFollowingTarget
                                  ? 'Unfollow'
                                  : 'Follow'
                              }
                            </span>
                          </Button>

                          {/* 2. Zap Button */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-10 h-10 profile-zap-button"
                            asChild
                          >
                            <div className="relative">
                              <ZapButton
                                recipientPubkey={targetPubkey}
                                variant="outline"
                                size="icon"
                                className="w-10 h-10 !bg-transparent hover:!bg-accent hover:!text-accent-foreground"
                              />
                              <style>{`
                                .profile-zap-button svg {
                                  fill: url(#zapGradient) !important;
                                  stroke: url(#zapGradient) !important;
                                }
                              `}</style>
                              <svg width="0" height="0" className="absolute">
                                <defs>
                                  <linearGradient id="zapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: 'rgb(251, 146, 60)' }} />
                                    <stop offset="50%" style={{ stopColor: 'rgb(236, 72, 153)' }} />
                                    <stop offset="100%" style={{ stopColor: 'rgb(147, 51, 234)' }} />
                                  </linearGradient>
                                </defs>
                              </svg>
                            </div>
                          </Button>

                          {/* 3. Nutzap Button */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-10 h-10"
                            onClick={() => setIsNutzapDialogOpen(true)}
                          >
                            <img src={`${import.meta.env.BASE_URL}images/cashu-icon.png`} alt="Cashu" className="h-4 w-4" />
                          </Button>

                          {/* 4. Direct Message Button */}
                          <Button
                            variant="outline"
                            onClick={handleDirectMessage}
                            className="flex items-center space-x-2 px-4"
                          >
                            <Send className="w-4 h-4" />
                            <span>Private DM</span>
                          </Button>
                        </div>
                      )}

                      {/* Website */}
                      {website && (
                        <div className="text-center">
                          <a
                            href={website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            {website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator className="mb-8" />

                  {/* Profile Tabs */}
                  <div className="mb-6">
                    <div className="flex space-x-1 p-1 bg-gray-900 rounded-lg">
                      {(['posts', 'reposts', 'bookmarks'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            activeTab === tab
                              ? 'bg-white text-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {tab === 'posts' && 'Posts'}
                          {tab === 'reposts' && 'Reposts'}
                          {tab === 'bookmarks' && 'Bookmarks'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content Grid */}
                  <div className="mt-6">
                    {activeTab === 'posts' ? (
                      <VideoGrid
                        key={`posts-${showVideoViewer ? 'viewer' : 'grid'}`}
                        videos={userVideos.data || []}
                        isLoading={userVideos.isLoading}
                        emptyMessage="No videos published yet. Start creating and sharing videos!"
                        allowRemove={false}
                        showVerificationBadge={false}
                        onVideoClick={handleVideoClick}
                      />
                    ) : activeTab === 'reposts' ? (
                      <VideoGrid
                        key={`reposts-${showVideoViewer ? 'viewer' : 'grid'}`}
                        videos={repostedVideos.data || []}
                        isLoading={repostedVideos.isLoading}
                        emptyMessage="No reposts yet. Repost some videos to see them here!"
                        allowRemove={false}
                        showVerificationBadge={false}
                        onVideoClick={handleVideoClick}
                      />
                    ) : activeTab === 'bookmarks' && isOwnProfile ? (
                      <VideoGrid
                        key={`bookmarks-${showVideoViewer ? 'viewer' : 'grid'}`}
                        videos={bookmarkedVideos.data || []}
                        isLoading={bookmarkedVideos.isLoading}
                        emptyMessage="No bookmarks yet. Start bookmarking videos you want to save!"
                        allowRemove={true}
                        showVerificationBadge={false}
                        onVideoClick={handleVideoClick}
                      />
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-3 text-center py-12">
                          <p className="text-gray-400">
                            {activeTab === 'bookmarks' && (isOwnProfile ? 'No bookmarks yet' : 'Bookmarks are private')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Sidebar - Compact Login Area */}
              <div className="hidden lg:block w-96 p-3 overflow-visible relative">
                <div className="sticky top-4 overflow-visible">
                  <LoginArea className="justify-end max-w-full" />
                </div>
              </div>
            </div>
          </main>
        </div>

      {/* Following List Modal */}
      <FollowingListModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        pubkeys={following.data?.pubkeys || []}
        followingCount={followingCount}
      />

      {/* Followers Modal */}
      <FollowersListModal
        pubkey={targetPubkey}
        open={showFollowersModal}
        onOpenChange={setShowFollowersModal}
        followerCount={followerCount}
      />

      {/* QR Modal */}
      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        pubkey={targetPubkey}
        metadata={metadata}
        displayName={displayName}
        relays={config.relayUrls}
      />

      {/* User Nutzap Dialog */}
      <UserNutzapDialog
        open={isNutzapDialogOpen}
        onOpenChange={setIsNutzapDialogOpen}
        pubkey={targetPubkey}
      />

      {/* Notification Settings Dialog */}
      <Dialog open={showNotificationSettings} onOpenChange={setShowNotificationSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </DialogTitle>
          </DialogHeader>
          <NotificationSettings />
        </DialogContent>
      </Dialog>

      {/* Feed-Style Video Viewer */}
      {showVideoViewer && getCurrentVideos().length > 0 && (
        <div 
          ref={videoViewerRef}
          className="fixed inset-0 z-50 bg-black overflow-y-auto snap-y snap-mandatory"
        >
          {/* Close Button */}
          <button
            onClick={handleCloseVideoViewer}
            className="fixed top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            aria-label="Close video viewer"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Render all videos for scrolling */}
          {getCurrentVideos().map((video, index) => {
            // Check if this is a YouTube video to adjust button positioning
            const isYouTube = video.videoUrl ? isYouTubeUrl(video.videoUrl) : false;
            
            // Determine if this video should be preloaded for smooth scrolling
            // Preload current, next, and previous videos
            const shouldPreload = Math.abs(index - currentVideoIndex) <= 1;
            
            return (
              <div key={video.id} className="h-screen flex items-center justify-center snap-start">
                <div className="flex w-full items-end h-full gap-6 max-w-2xl">
                  <div className="flex-1 h-full rounded-3xl border-2 border-gray-800 overflow-hidden bg-black shadow-2xl relative">
                    <VideoCard 
                      event={video}
                      isActive={index === currentVideoIndex}
                      onNext={handleNextVideo}
                      onPrevious={handlePreviousVideo}
                      shouldPreload={shouldPreload}
                    />
                    {/* Action Buttons - Positioned higher for YouTube to avoid player controls */}
                    <div className={`absolute right-1 z-10 ${isYouTube ? 'bottom-20' : 'bottom-4'}`}>
                      <VideoActionButtons event={video} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default Profile;
