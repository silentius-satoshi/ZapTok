import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Navigation } from '@/components/Navigation';
import { LoginArea } from '@/components/auth/LoginArea';
import { AuthGate } from '@/components/AuthGate';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useFollowing } from '@/hooks/useFollowing';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, Edit, ArrowLeft } from 'lucide-react';
import { FollowingListModal } from '@/components/FollowingListModal';
import { EditProfileForm } from '@/components/EditProfileForm';

const Profile = () => {
  const { pubkey } = useParams();
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'bookmarks'>('posts');
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  
  const targetPubkey = pubkey || user?.pubkey || '';
  const isOwnProfile = !pubkey || pubkey === user?.pubkey;

  const author = useAuthor(targetPubkey);
  const following = useFollowing(targetPubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.display_name || metadata?.name || genUserName(targetPubkey);
  const userName = metadata?.name || genUserName(targetPubkey);
  const bio = metadata?.about;
  const profileImage = metadata?.picture;
  const website = metadata?.website;
  const nip05 = metadata?.nip05;

  useSeoMeta({
    title: isOwnProfile ? 'My Profile - ZapTok' : `${displayName} - ZapTok`,
    description: bio || `View ${displayName}'s profile on ZapTok`,
  });

  const handleFollowingClick = () => {
    setShowFollowingModal(true);
  };

  if (showEditForm && isOwnProfile) {
    return (
      <AuthGate>
        <div className="min-h-screen bg-black text-white">
          <main className="h-screen">
            <div className="flex h-full">
              {/* Left Sidebar - Logo and Navigation */}
              <div className="flex flex-col bg-black">
                <div className="p-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src="/images/ZapTok-v2.png" 
                      alt="ZapTok Logo" 
                      className="w-8 h-8 rounded-lg"
                    />
                    <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                      ZapTok
                    </h1>
                  </div>
                </div>
                <div className="flex-1">
                  <Navigation />
                </div>
              </div>
              
              {/* Edit Profile Content */}
              <div className="flex-1 overflow-y-auto">
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
                <div className="p-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src="/images/ZapTok-v2.png" 
                      alt="ZapTok Logo" 
                      className="w-8 h-8 rounded-lg"
                    />
                    <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                      ZapTok
                    </h1>
                  </div>
                </div>
                <div className="flex-1">
                  <Navigation />
                </div>
              </div>
              
              {/* Profile Content */}
              <div className="flex-1 overflow-y-auto">
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

                      {/* Profile Stats */}
                      <div className="flex space-x-6">
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
                  <div className="grid grid-cols-3 gap-4">
                    {/* TODO: Add video grid based on activeTab */}
                    <div className="col-span-3 text-center py-12">
                      <p className="text-gray-400">
                        {activeTab === 'posts' && 'No posts yet'}
                        {activeTab === 'liked' && 'No liked videos yet'}
                        {activeTab === 'bookmarks' && 'No bookmarks yet'}
                      </p>
                    </div>
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
    </>
  );
};

export default Profile;
