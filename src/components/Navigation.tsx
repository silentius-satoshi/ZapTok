import React from 'react';
import { Search, Heart, Zap, PlusSquare, Settings, Users, Globe, Radio, UserPlus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostrLogin } from '@nostrify/react/login';
import { genUserName } from '@/lib/genUserName';
import { VideoUploadModal } from '@/components/VideoUploadModal';
import { UserSearchModal } from '@/components/UserSearchModal';
import { useVideoPlayback } from '@/contexts/VideoPlaybackContext';
import { useState, useEffect, useRef } from 'react';
import { SupporterButton } from '@/components/SupporterButton';
import { useWallet } from '@/hooks/useWallet';

export function Navigation() {
  const { user } = useCurrentUser();
  const { logins } = useNostrLogin();
  const author = useAuthor(user?.pubkey || '');
  const metadata = author.data?.metadata;
  const location = useLocation();
  const navigate = useNavigate();
  const { pauseAllVideos, resumeAllVideos } = useVideoPlayback();

  // Get comprehensive wallet/signer detection
  const { isBunkerSigner, isNsecSigner, isExtensionSigner } = useWallet();

  // Check current user login for backwards compatibility
  const currentUserLogin = logins.find(login => login.pubkey === user?.pubkey);
  const loginType = currentUserLogin?.type;

  // Detect potential signer conflicts (respect user's choice)
  const isExtensionAvailable = !!(window.nostr);
  const hasMultipleSigners = isExtensionAvailable && isBunkerSigner;

  // Track if we've already logged the multiple signers detection to prevent spam
  const loggedMultipleSigners = useRef<string | null>(null);

  // Optional: Log conflict detection for debugging (respects user's active choice) - only once per user session
  if (hasMultipleSigners && user?.pubkey && loggedMultipleSigners.current !== user.pubkey) {
    console.info('Multiple signers detected - showing interface for active login choice:', loginType);
    loggedMultipleSigners.current = user.pubkey;
  }

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
    { id: 'search', icon: Search, label: 'Discover', path: '/discover' },
    { id: 'global', icon: Globe, label: 'Global', path: '/global' },
    { id: 'following', icon: Users, label: 'Following', path: '/' },
    { id: 'notifications', icon: Heart, label: 'Notifications', path: '/notifications' },
    // Wallet items - nsec signers see both, others see their respective wallet
    ...(isNsecSigner ? [
      {
        id: 'cashu-wallet',
        icon: () => <img src={`${import.meta.env.BASE_URL}images/cashu-icon.png`} alt="Cashu" className="w-6 h-6 object-contain" />,
        label: 'Cashu Wallet',
        path: '/cashu-wallet'
      },
      {
        id: 'bitcoin-connect-wallet',
        icon: Zap,
        label: 'Bitcoin Connect',
        path: '/bitcoin-connect-wallet'
      }
    ] : [
      {
        id: 'wallet',
        icon: isBunkerSigner ? Zap : Wallet,
        label: isBunkerSigner ? 'Bitcoin Connect' : 'Cashu Wallet',
        path: isBunkerSigner ? '/bitcoin-connect-wallet' : '/cashu-wallet'
      }
    ]),
    { id: 'search-users', icon: UserPlus, label: 'Search Users', action: 'searchUsers' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
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
    } else if (pathname === '/cashu-wallet') {
      setActiveTab(isNsecSigner ? 'cashu-wallet' : 'wallet');
    } else if (pathname === '/bitcoin-connect-wallet') {
      setActiveTab(isNsecSigner ? 'bitcoin-connect-wallet' : 'wallet');
    } else if (pathname === '/wallet') {
      setActiveTab('wallet');
    } else if (pathname === '/pro') {
      setActiveTab('pro');
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
                    onClick={() => setActiveTab(item.id)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`w-6 h-6 mr-4 flex items-center justify-center ${
                      activeTab === item.id || hoveredItem === item.id
                        ? 'text-orange-500'
                        : 'text-gray-400'
                    }`} style={activeTab === item.id || hoveredItem === item.id ? {
                      background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    } : {}}>
                      {typeof item.icon === 'function' ? (
                        (item.icon as () => JSX.Element)()
                      ) : (
                        React.createElement(item.icon as any, { size: 24 })
                      )}
                    </div>
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
                onClick={() => {
                  setActiveTab(item.id);
                  // Handle specific actions
                  if (item.action === 'searchUsers') {
                    handleUserSearchClick();
                  }
                }}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className={`w-6 h-6 mr-4 flex items-center justify-center ${
                  activeTab === item.id || hoveredItem === item.id
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === item.id || hoveredItem === item.id ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}}>
                  {typeof item.icon === 'function' ? (
                    (item.icon as () => JSX.Element)()
                  ) : (
                    React.createElement(item.icon as any, { size: 24 })
                  )}
                </div>
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
                <div className={`w-6 h-6 mr-4 flex items-center justify-center ${
                  activeTab === 'upload' || hoveredItem === 'upload'
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === 'upload' || hoveredItem === 'upload' ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}}>
                  <PlusSquare size={24} />
                </div>
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
                <div className={`w-6 h-6 mr-4 flex items-center justify-center ${
                  activeTab === 'stream' || hoveredItem === 'stream'
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === 'stream' || hoveredItem === 'stream' ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}}>
                  <Radio size={24} />
                </div>
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

        {/* Bottom Section with Supporter and Profile */}
        {user && (
          <div className="mt-auto pt-4 space-y-3">
            <SupporterButton />

            {/* Profile Section */}
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
