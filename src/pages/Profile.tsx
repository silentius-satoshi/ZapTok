import { useState, useEffect } from 'react';
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
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { VideoGrid } from '@/components/VideoGrid';
import { Users, Edit, ArrowLeft, QrCode, MessageCircle, UserPlus, UserMinus, Send, Bell } from 'lucide-react';
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

  if (showEditForm && isOwnProfile) {
    return (
      <AuthGate>
        <div className={`h-screen bg-black text-white overflow-hidden ${isMobile ? 'overflow-x-hidden' : ''}`}>
          <main className="h-full flex">
            <div className="flex">
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
              <div className={`flex-1 h-full overflow-y-auto scrollbar-hide ${isMobile ? 'min-w-0 overflow-x-hidden' : ''}`}>
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
      <div className={`min-h-screen bg-black text-white ${isMobile ? 'overflow-x-hidden' : ''}`}>
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
            <div className={`flex-1 overflow-y-auto scrollbar-hide ${isMobile ? 'min-w-0 overflow-x-hidden' : ''}`}>
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
                        <Avatar className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'}`}>
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
                            className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-gray-800 hover:bg-gray-700 border-2 border-black shadow-lg"
                            onClick={() => setShowNotificationSettings(true)}
                          >
                            <Bell className="w-5 h-5" />
                          </Button>
                        )}
                      </div>

                      <div className="text-center space-y-3">
                        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold`}>{displayName}</h1>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {userName !== displayName && (
                            <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-gray-400`}>@{userName}</p>
                          )}
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
                              ✓ {nip05}
                            </Badge>
                          )}
                        </div>
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

                      {/* Profile Action Buttons - Only Following List and QR Code above bio */}
                      <div className={`flex ${isMobile ? 'flex-wrap justify-center gap-2' : 'space-x-3'}`}>
                        {/* 1. Followers Button */}
                        <Button
                          variant="outline"
                          onClick={() => setShowFollowersModal(true)}
                          className="flex items-center space-x-2"
                        >
                          <Users className="w-4 h-4" />
                          <span>
                            {followerCount !== null && followerCount !== undefined 
                              ? `${followerCount.toLocaleString()} Followers`
                              : 'Followers'
                            }
                          </span>
                        </Button>

                        {/* 2. Following List Button */}
                        <Button
                          variant="outline"
                          onClick={handleFollowingClick}
                          className="flex items-center space-x-2"
                          disabled={followerCountLoading || !following.data?.count}
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
                        </Button>

                        {/* 3. QR Code Button */}
                        <Button
                          variant="outline"
                          onClick={() => setShowQRModal(true)}
                          className="flex items-center justify-center w-10 h-10 p-0"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>

                        {/* 4. Notification Bell - Only for own profile */}
                        {isOwnProfile && (
                          <Button
                            variant="outline"
                            onClick={() => setShowNotificationSettings(true)}
                            className="flex items-center justify-center w-10 h-10 p-0"
                            title="Notification Settings"
                          >
                            <Bell className="w-4 h-4" />
                          </Button>
                        )}

                        {/* 5. Edit Profile Button - Only for own profile */}
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
                      </div>

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
                            <img src="/images/cashu-icon.png" alt="Cashu" className="h-4 w-4" />
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
                        videos={userVideos.data || []}
                        isLoading={userVideos.isLoading}
                        emptyMessage="No videos published yet. Start creating and sharing videos!"
                        allowRemove={false}
                        showVerificationBadge={false}
                      />
                    ) : activeTab === 'reposts' ? (
                      <VideoGrid
                        videos={repostedVideos.data || []}
                        isLoading={repostedVideos.isLoading}
                        emptyMessage="No reposts yet. Repost some videos to see them here!"
                        allowRemove={false}
                        showVerificationBadge={false}
                      />
                    ) : activeTab === 'bookmarks' && isOwnProfile ? (
                      <VideoGrid
                        videos={bookmarkedVideos.data || []}
                        isLoading={bookmarkedVideos.isLoading}
                        emptyMessage="No bookmarks yet. Start bookmarking videos you want to save!"
                        allowRemove={true}
                        showVerificationBadge={false}
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
    </>
  );
};

export default Profile;
