import { Search, Heart, Zap, PlusSquare, Settings, Users, Globe, Radio, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { VideoUploadModal } from '@/components/VideoUploadModal';
import { UserSearchModal } from '@/components/UserSearchModal';
import { useVideoPlayback } from '@/contexts/VideoPlaybackContext';
import { useState, useEffect } from 'react';

export function Navigation() {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey || '');
  const metadata = author.data?.metadata;
  const location = useLocation();
  const navigate = useNavigate();
  const { pauseAllVideos, resumeAllVideos } = useVideoPlayback();
  
  // Set activeTab based on current route
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname === '/') return 'following';
    return 'following'; // default to following for now
  });
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleProfileClick = () => {
    setActiveTab('profile');
    pauseAllVideos();
    navigate('/profile');
  };

  const handleUploadClick = () => {
    setActiveTab('upload');
    pauseAllVideos();
    setShowUploadModal(true);
  };

  const handleUserSearchClick = () => {
    setActiveTab('userSearch');
    pauseAllVideos();
    setShowUserSearchModal(true);
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    resumeAllVideos();
  };

  const handleUserSearchModalClose = (open: boolean) => {
    setShowUserSearchModal(open);
    if (!open) {
      resumeAllVideos();
    }
  };

  const handleNavigateToPage = (path: string) => {
    // Pause videos when navigating to non-video pages
    if (path !== '/' && path !== '/global') {
      pauseAllVideos();
    } else {
      // Resume videos when returning to video feeds
      resumeAllVideos();
    }
    navigate(path);
  };

  const navItems = [
    { id: 'discover', icon: Search, label: 'Discover', onClick: () => handleNavigateToPage('/discover'), path: '/discover' },
    { id: 'following', icon: Users, label: 'Following', onClick: () => handleNavigateToPage('/'), path: '/' },
    { id: 'global', icon: Globe, label: 'Global', onClick: () => handleNavigateToPage('/global'), path: '/global' },
    { id: 'userSearch', icon: UserPlus, label: 'Search Users', onClick: handleUserSearchClick },
    { id: 'notifications', icon: Heart, label: 'Notifications', onClick: () => setActiveTab('notifications') },
    { id: 'wallet', icon: Zap, label: 'Lightning Wallet', onClick: () => handleNavigateToPage('/wallet'), path: '/wallet' },
    { id: 'settings', icon: Settings, label: 'Settings', onClick: () => handleNavigateToPage('/settings'), path: '/settings' },
  ];

  // Update activeTab when location changes
  useEffect(() => {
    const pathname = location.pathname;
    
    // Map routes to navigation tabs
    if (pathname === '/') {
      setActiveTab('following');
    } else if (pathname === '/discover') {
      setActiveTab('discover');
    } else if (pathname === '/global') {
      setActiveTab('global');
    } else if (pathname === '/settings') {
      setActiveTab('settings');
    } else if (pathname === '/wallet') {
      setActiveTab('wallet');
    } else if (pathname === '/stream') {
      setActiveTab('stream');
    } else if (pathname.startsWith('/profile')) {
      setActiveTab('profile');
    } else {
      // For other routes, try to match by path or keep current activeTab
      const matchedItem = navItems.find(item => item.path === pathname);
      if (matchedItem) {
        setActiveTab(matchedItem.id);
      }
    }
  }, [location.pathname, navItems]);

  return (
    <>
      <div className="hidden md:flex flex-col w-64 p-4 h-full">{/* Main Navigation */}
        <div className="space-y-2 flex-1">
          {navItems.map((item) => {
            // Special handling for items with paths (use Link for routing)
            if (item.path) {
              return (
                <Link key={item.id} to={item.path}>
                  <Button
                    variant={activeTab === item.id ? 'default' : 'ghost'}
                    className={`w-full justify-start text-left h-14 bg-transparent hover:bg-transparent ${
                      activeTab === item.id
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={item.onClick}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <item.icon size={24} className={`mr-4 ${
                      activeTab === item.id || hoveredItem === item.id
                        ? 'text-orange-500'
                        : 'text-gray-400'
                    }`} style={activeTab === item.id || hoveredItem === item.id ? {
                      background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    } : {}} />
                    <span className={`font-medium text-lg ${
                      activeTab === item.id || hoveredItem === item.id
                        ? 'text-orange-500'
                        : 'text-gray-400'
                    }`} style={activeTab === item.id || hoveredItem === item.id ? {
                      background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    } : {}}>{item.label}</span>
                  </Button>
                </Link>
              );
            }

            // Regular navigation items (no routing, just state changes)
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'default' : 'ghost'}
                className={`w-full justify-start text-left h-14 bg-transparent hover:bg-transparent ${
                  activeTab === item.id
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={item.onClick}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <item.icon size={24} className={`mr-4 ${
                  activeTab === item.id || hoveredItem === item.id
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === item.id || hoveredItem === item.id ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}} />
                <span className={`font-medium text-lg ${
                  activeTab === item.id || hoveredItem === item.id
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === item.id || hoveredItem === item.id ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}}>{item.label}</span>
              </Button>
            );
          })}

          {user && (
            <>
              <Button
                className={`w-full justify-start text-left h-14 bg-transparent hover:bg-transparent ${
                  activeTab === 'upload'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-400 hover:text-white'
                } mt-4`}
                onClick={handleUploadClick}
                onMouseEnter={() => setHoveredItem('upload')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <PlusSquare size={24} className={`mr-4 ${
                  activeTab === 'upload' || hoveredItem === 'upload'
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === 'upload' || hoveredItem === 'upload' ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}} />
                <span className={`font-medium text-lg ${
                  activeTab === 'upload' || hoveredItem === 'upload'
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === 'upload' || hoveredItem === 'upload' ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}}>Upload</span>
              </Button>

              <Button
                className={`w-full justify-start text-left h-14 bg-transparent hover:bg-transparent ${
                  activeTab === 'stream'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => {
                  setActiveTab('stream');
                  pauseAllVideos();
                  navigate('/stream', { state: { fromNavigation: true } });
                }}
                onMouseEnter={() => setHoveredItem('stream')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Radio size={24} className={`mr-4 ${
                  activeTab === 'stream' || hoveredItem === 'stream'
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === 'stream' || hoveredItem === 'stream' ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}} />
                <span className={`font-medium text-lg ${
                  activeTab === 'stream' || hoveredItem === 'stream'
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === 'stream' || hoveredItem === 'stream' ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}}>Stream</span>
              </Button>
            </>
          )}
        </div>

        {/* Profile Section at Bottom */}
        {user && (
          <div className="mt-auto pt-4">
            <button 
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all w-full text-foreground ${
                hoveredItem === 'profile' 
                  ? 'bg-gray-800/30 scale-105' 
                  : 'hover:bg-gray-800/20'
              }`}
              onClick={handleProfileClick}
              onMouseEnter={() => setHoveredItem('profile')}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                background: hoveredItem === 'profile' ? 'rgba(31, 41, 55, 0.3)' : 'transparent',
              }}
            >
              <Avatar className={`w-10 h-10 transition-all ${
                hoveredItem === 'profile' ? 'ring-2 ring-orange-400/50' : ''
              }`}>
                <AvatarImage src={metadata?.picture} alt={metadata?.name ?? genUserName(user.pubkey)} />
                <AvatarFallback>{(metadata?.name ?? genUserName(user.pubkey)).charAt(0)}</AvatarFallback>
              </Avatar>
              <div className='flex-1 text-left hidden md:block truncate'>
                <p className={`font-medium text-sm truncate transition-colors ${
                  hoveredItem === 'profile' ? 'text-white' : 'text-gray-300'
                }`}>{metadata?.name ?? genUserName(user.pubkey)}</p>
                {metadata?.nip05 && (
                  <p className={`text-xs truncate transition-colors ${
                    hoveredItem === 'profile' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {metadata.nip05}
                  </p>
                )}
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Video Upload Modal */}
      <VideoUploadModal 
        isOpen={showUploadModal} 
        onClose={handleUploadModalClose} 
      />

      {/* User Search Modal */}
      <UserSearchModal 
        open={showUserSearchModal} 
        onOpenChange={handleUserSearchModalClose} 
      />
    </>
  );
}
