import { useState } from 'react';
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
import { useLikedVideos } from '@/hooks/useLikedVideos';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { VideoGrid } from '@/components/VideoGrid';
import { Users, Edit, ArrowLeft, QrCode, MessageCircle, UserPlus, UserMinus } from 'lucide-react';
import { FollowingListModal } from '@/components/FollowingListModal';
import { EditProfileForm } from '@/components/EditProfileForm';
import { QRModal } from '@/components/QRModal';
import { ZapButton } from '@/components/ZapButton';
import { useToast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';

const Profile = () => {
  const { pubkey: paramPubkey } = useParams();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'bookmarks'>('posts');
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
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
  const likedVideos = useLikedVideos(targetPubkey);
  const metadata = author.data?.metadata;

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
  };

  const handleDirectMessage = () => {
    // TODO: Implement direct message functionality
    toast({
      title: "Coming Soon",
      description: "Direct messaging feature is coming soon!",
    });
  };

  if (showEditForm && isOwnProfile) {
    return (
      <AuthGate>
        <div className="min-h-screen bg-black text-white">
          <main className="h-screen">
            <div className="flex h-full">
              {/* Left Sidebar - Logo and Navigation */}
              <div className="flex flex-col bg-black">
                <LogoHeader />
                <div className="flex-1">
                  <Navigation />
                </div>
              </div>
              
              {/* Edit Profile Content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="max-w-2xl mx-auto p-6">
                  <div className="mb-6">
                    <Button 
                      variant="ghost" 
                      className="mb-4"
                      onClick={() => setShowEditForm(false)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Profile
                    </Button>
                    <h1 className="text-2xl font-bold flex items-center space-x-2">
                      <Edit className="w-6 h-6" />
                      <span>Edit Profile</span>
                    </h1>
                  </div>
                  <EditProfileForm />
                </div>
              </div>
              
              {/* Right Sidebar - Login Area */}
              <div className="hidden lg:block w-80 p-4">
                <div className="sticky top-4">
                  <LoginArea className="w-full" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </AuthGate>
    );
  }

  return (
    <>
      <AuthGate>
        <div className="min-h-screen bg-black text-white">
          <main className="h-screen">
            <div className="flex h-full">
              {/* Left Sidebar - Logo and Navigation */}
              <div className="flex flex-col bg-black">
                <LogoHeader />
                <div className="flex-1">
                  <Navigation />
                </div>
              </div>
              
              {/* Profile Content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="max-w-4xl mx-auto p-6">
                  {/* Back to Home Button (only for other users' profiles) */}
                  {!isOwnProfile && (
                    <Link to="/">
                      <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                      </Button>
                    </Link>
                  )}

                  {/* Profile Header */}
                  <div className="mb-8">
                    <div className="flex flex-col items-center space-y-6">
                      <Avatar className="w-32 h-32">
                        <AvatarImage src={profileImage} alt={displayName} />
                        <AvatarFallback className="text-2xl">
                          {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="text-center space-y-3">
                        <h1 className="text-3xl font-bold">{displayName}</h1>
                        {userName !== displayName && (
                          <p className="text-xl text-gray-400">@{userName}</p>
                        )}
                        {nip05 && (
                          <Badge variant="secondary" className="text-sm">
                            ✓ {nip05}
                          </Badge>
                        )}
                      </div>

                      {/* Profile Action Buttons */}
                      <div className="flex space-x-3">
                        {/* 1. Following List Button */}
                        <Button
                          variant="outline"
                          onClick={handleFollowingClick}
                          className="flex items-center space-x-2"
                          disabled={following.isLoading || !following.data?.count}
                        >
                          <Users className="w-4 h-4" />
                          <span>
                            {following.isLoading ? 'Loading...' : `${following.data?.count || 0} Following`}
                          </span>
                        </Button>

                        {/* 2. QR Code Button */}
                        <Button
                          variant="outline"
                          onClick={() => setShowQRModal(true)}
                          className="flex items-center justify-center w-10 h-10 p-0"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>

                        {!isOwnProfile && (
                          <>
                            {/* 3. Zap Button */}
                            <ZapButton
                              recipientPubkey={targetPubkey}
                              variant="outline"
                              size="icon"
                              className="w-10 h-10"
                            />

                            {/* 4. Direct Message Button */}
                            <Button
                              variant="outline"
                              onClick={handleDirectMessage}
                              className="flex items-center justify-center w-10 h-10 p-0"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>

                            {/* 5. Follow/Unfollow Button */}
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
                          </>
                        )}

                        {isOwnProfile && (
                          <Button
                            variant="outline"
                            onClick={() => setShowEditForm(true)}
                            className="flex items-center space-x-2"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit Profile</span>
                          </Button>
                        )}
                      </div>

                      {/* Bio */}
                      {bio && (
                        <Card className="w-full max-w-2xl">
                          <CardContent className="pt-6">
                            <p className="text-center text-gray-300 whitespace-pre-wrap">{bio}</p>
                          </CardContent>
                        </Card>
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
                      {(['posts', 'liked', 'bookmarks'] as const).map((tab) => (
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
                          {tab === 'liked' && 'Liked'}
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
                      />
                    ) : activeTab === 'liked' ? (
                      <VideoGrid 
                        videos={likedVideos.data || []}
                        isLoading={likedVideos.isLoading}
                        emptyMessage="No liked videos yet. Like some videos to see them here!"
                        allowRemove={false}
                      />
                    ) : activeTab === 'bookmarks' && isOwnProfile ? (
                      <VideoGrid 
                        videos={bookmarkedVideos.data || []}
                        isLoading={bookmarkedVideos.isLoading}
                        emptyMessage="No bookmarks yet. Start bookmarking videos you want to save!"
                        allowRemove={true}
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
              
              {/* Right Sidebar - Login Area */}
              <div className="hidden lg:block w-80 p-4">
                <div className="sticky top-4">
                  <LoginArea className="w-full" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </AuthGate>

      {/* Following List Modal */}
      <FollowingListModal
        isOpen={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        pubkeys={following.data?.pubkeys || []}
      />

      {/* QR Modal */}
      <QRModal 
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        pubkey={targetPubkey}
        metadata={metadata}
        displayName={displayName}
      />
    </>
  );
};

export default Profile;
