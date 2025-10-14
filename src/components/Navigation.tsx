import React from 'react';
import { Search, Heart, Zap, PlusSquare, Settings, Users, Globe, Radio, UserPlus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostrLogin } from '@nostrify/react/login';
import { genUserName } from '@/lib/genUserName';
import { VideoUploadModal } from '@/components/VideoUploadModal';
import { UserSearchModal } from '@/components/UserSearchModal';
import { useVideoPlayback } from '@/contexts/VideoPlaybackContext';
import { useState, useEffect, useRef } from 'react';
import { SupporterButton } from '@/components/SupporterButton';
import { CashuBalanceDisplay } from '@/components/CashuBalanceDisplay';
import { BitcoinConnectBalanceDisplay } from '@/components/BitcoinConnectBalanceDisplay';
import { useWallet } from '@/hooks/useWallet';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice, satsToUSD } from '@/hooks/useBitcoinPrice';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuStore } from '@/stores/cashuStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VideoCacheDebug } from '@/components/VideoCacheDebug';

export function Navigation() {
  const { user, isAuthenticated, checkLogin } = useCurrentUser();
  const { withLoginCheck } = useLoginPrompt();
  const { logins } = useNostrLogin();
  const author = useAuthor(user?.pubkey || '');
  const metadata = author.data?.metadata;
  const location = useLocation();
  const navigate = useNavigate();
  const { pauseAllVideos, resumeAllVideos } = useVideoPlayback();

  // Get comprehensive wallet/signer detection
  const { isBunkerSigner, isNsecSigner, isExtensionSigner } = useWallet();

  // Currency display and wallet hooks for toggle
  const { showSats, toggleCurrency } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();
  const { totalBalance: cashuBalance } = useCashuWallet();
  const cashuStore = useCashuStore();

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
    if (location.pathname === '/') return 'global';
    if (location.pathname === '/following') return 'following';
    return 'global'; // default to global for now
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
    // Hide Discover page from production
    ...(!import.meta.env.PROD ? [{ id: 'search', icon: Search, label: 'Discover', path: '/discover' }] : []),
    { id: 'search-users', icon: UserPlus, label: 'Search Users', action: 'searchUsers' },
    { id: 'following', icon: Users, label: 'Following', path: '/following' },
    { id: 'global', icon: Globe, label: 'Global', path: '/' },
    { id: 'notifications', icon: Heart, label: 'Notifications', path: '/notifications' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Update activeTab when location changes
  useEffect(() => {
    const pathname = location.pathname;

    // Map routes to navigation tabs
    if (pathname === '/') {
      setActiveTab('global');
    } else if (pathname === '/following') {
      setActiveTab('following');
    } else if (pathname === '/discover') {
      setActiveTab('discover');
    } else if (pathname === '/global') {
      setActiveTab('global');
    } else if (pathname === '/settings') {
      setActiveTab('settings');
    } else if (pathname === '/cashu-wallet') {
      setActiveTab('wallet');
    } else if (pathname === '/bitcoin-connect-wallet') {
      setActiveTab('bitcoin-connect-wallet');
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
        <div className="space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            // Check if this item requires authentication
            const requiresAuth = ['following', 'notifications'].includes(item.id);
            
            // Special handling for items with paths (use Link for routing)
            if (item.path) {
              // For authenticated routes, show for all users but handle auth on click
              if (requiresAuth) {
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? 'default' : 'ghost'}
                    size={null}
                    className={`w-full justify-start text-left h-12 bg-transparent hover:bg-transparent px-0 py-0 ${
                      activeTab === item.id
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => {
                      if (!isAuthenticated) {
                        setShowLoginModal(true);
                      } else {
                        setActiveTab(item.id);
                        handleNavigateToPage(item.path!);
                      }
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`w-6 h-6 mr-3 flex items-center justify-center ${
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
                        React.createElement(item.icon, { size: 22 })
                      ) : (
                        React.createElement(item.icon as any, { size: 22 })
                      )}
                    </div>
                    <span className={`font-medium text-base ${
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
              }
              
              // For non-authenticated routes, use normal Link
              return (
                <Link key={item.id} to={item.path}>
                  <Button
                    variant={activeTab === item.id ? 'default' : 'ghost'}
                    size={null}
                    className={`w-full justify-start text-left h-12 bg-transparent hover:bg-transparent px-0 py-0 ${
                      activeTab === item.id
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => setActiveTab(item.id)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`w-6 h-6 mr-3 flex items-center justify-center ${
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
                        React.createElement(item.icon, { size: 22 })
                      ) : (
                        React.createElement(item.icon as any, { size: 22 })
                      )}
                    </div>
                    <span className={`font-medium text-base ${
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
                size={null}
                className={`w-full justify-start text-left h-12 bg-transparent hover:bg-transparent px-0 py-0 ${
                  activeTab === item.id
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => {
                  if (item.action === 'searchUsers' && !isAuthenticated) {
                    setShowLoginModal(true);
                  } else {
                    setActiveTab(item.id);
                    // Handle specific actions
                    if (item.action === 'searchUsers') {
                      handleUserSearchClick();
                    }
                  }
                }}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className={`w-6 h-6 mr-3 flex items-center justify-center ${
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
                    React.createElement(item.icon, { size: 22 })
                  ) : (
                    React.createElement(item.icon as any, { size: 22 })
                  )}
                </div>
                <span className={`font-medium text-base ${
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

          {/* Stream and Upload buttons - visible for all users */}
          <Button
            className={`w-full justify-start text-left h-12 bg-transparent hover:bg-transparent px-0 py-0 ${
              activeTab === 'stream'
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            size={null}
            onClick={() => {
              if (!user) {
                setShowLoginModal(true);
              } else {
                setActiveTab('stream');
                pauseAllVideos();
                navigate('/stream', { state: { fromNavigation: true } });
              }
            }}
            onMouseEnter={() => setHoveredItem('stream')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className={`w-6 h-6 mr-3 flex items-center justify-center ${
              activeTab === 'stream' || hoveredItem === 'stream'
                ? 'text-orange-500'
                : 'text-gray-400'
            }`} style={activeTab === 'stream' || hoveredItem === 'stream' ? {
              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            } : {}}>
              <Radio size={22} />
            </div>
            <span className={`font-medium text-base ${
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

          <Button
            className={`w-full justify-start text-left h-12 bg-transparent hover:bg-transparent px-0 py-0 ${
              activeTab === 'upload'
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            size={null}
            onClick={() => {
              if (!user) {
                setShowLoginModal(true);
              } else {
                handleUploadClick();
              }
            }}
            onMouseEnter={() => setHoveredItem('upload')}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className={`w-6 h-6 mr-3 flex items-center justify-center ${
              activeTab === 'upload' || hoveredItem === 'upload'
                ? 'text-orange-500'
                : 'text-gray-400'
            }`} style={activeTab === 'upload' || hoveredItem === 'upload' ? {
              background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            } : {}}>
              <PlusSquare size={22} />
            </div>
            <span className={`font-medium text-base ${
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
        </div>

        {/* Bottom Section with Balance, Supporter and Profile - Fixed at bottom */}
        <div className="mt-auto pt-4 space-y-3 flex-shrink-0">
          {/* Wallet displays - always visible, but with different behavior based on auth status */}
          {user ? (
            <>
              <BitcoinConnectBalanceDisplay variant="compact" />
              <CashuBalanceDisplay variant="compact" />
              <SupporterButton />
            </>
          ) : (
            <>
              {/* Read-only placeholders that trigger LoginModal */}
              <div 
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => setShowLoginModal(true)}
                title="Sign in to view your Lightning wallet"
              >
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">₿</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">
                    {showSats ? '0 sats' : '$0.00'}
                  </span>
                  <span className="text-muted-foreground ml-1">lightning</span>
                </div>
              </div>

              <div 
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => setShowLoginModal(true)}
                title="Sign in to view your Cashu wallet"
              >
                <img 
                  src="/images/cashu-icon.png" 
                  alt="Cashu" 
                  className="w-5 h-5 rounded-full"
                />
                <div className="text-sm">
                  <span className="font-medium text-foreground">
                    {showSats ? '0 sats' : '$0.00'}
                  </span>
                  <span className="text-muted-foreground ml-1">cashu wallet</span>
                </div>
              </div>

              <Button
                onClick={() => setShowLoginModal(true)}
                variant="outline"
                className="hidden md:flex items-center gap-2 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white hover:border-gray-500 transition-colors cursor-pointer"
                title="Sign in to become a supporter"
              >
                <Heart className="h-4 w-4 text-red-500" />
                Become a Supporter
              </Button>
            </>
          )}

          {/* Profile Section - visible for all users */}
          <button
            className={`flex items-center gap-3 p-3 rounded-2xl transition-all w-full text-foreground ${
              hoveredItem === 'profile'
                ? 'bg-gray-800/30 scale-105'
                : 'hover:bg-gray-800/20'
            }`}
            onClick={() => {
              if (!user) {
                setShowLoginModal(true);
              } else {
                handleProfileClick();
              }
            }}
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
              <AvatarImage src={metadata?.picture} alt={user ? (metadata?.name ?? genUserName(user.pubkey)) : 'Profile'} />
              <AvatarFallback>{user ? (metadata?.name ?? genUserName(user.pubkey)).charAt(0) : 'P'}</AvatarFallback>
            </Avatar>
            <div className='flex-1 text-left hidden md:block truncate'>
              <p className={`font-medium text-sm truncate transition-colors ${
                hoveredItem === 'profile' ? 'text-white' : 'text-gray-300'
              }`}>
                {user ? (metadata?.name ?? genUserName(user.pubkey)) : 'Log in'}
              </p>
              {user && metadata?.nip05 && (
                <p className={`text-xs truncate transition-colors ${
                  hoveredItem === 'profile' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {metadata.nip05}
                </p>
              )}
            </div>
          </button>
        </div>
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

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
