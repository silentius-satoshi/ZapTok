import { useState } from 'react';
import React from 'react';
import { Search, Heart, Zap, PlusSquare, Settings, Users, Globe, Radio, UserPlus, Menu, Wallet, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';
import { useNostrLogin } from '@nostrify/react/login';
import { useLogoutWithWarning } from '@/hooks/useLogoutWithWarning';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { VideoUploadModal } from '@/components/VideoUploadModal';
import { UserSearchModal } from '@/components/UserSearchModal';
import { useVideoPlayback } from '@/contexts/VideoPlaybackContext';
import { ZapTokLogo } from '@/components/ZapTokLogo';
import { LoginArea } from '@/components/auth/LoginArea';
import { LoginModal } from '@/components/auth/LoginModal';
import { LogoutWarningModal } from '@/components/LogoutWarningModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useFeedRefresh } from '@/contexts/FeedRefreshContext';
import { bundleLog } from '@/lib/logBundler';
import { MobileSupporterButton } from '@/components/MobileSupporterButton';
import { CashuBalanceDisplay } from '@/components/CashuBalanceDisplay';
import { BitcoinConnectBalanceDisplay } from '@/components/BitcoinConnectBalanceDisplay';
import { useWallet } from '@/hooks/useWallet';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice, satsToUSD } from '@/hooks/useBitcoinPrice';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuStore } from '@/stores/cashuStore';
import { DollarSign, Bitcoin } from 'lucide-react';
import FeedButton from '@/components/FeedButton';

export function MobileNavigation() {
  const { user, isAuthenticated } = useCurrentUser();
  const { withLoginCheck } = useLoginPrompt();
  const { logins } = useNostrLogin();
  const author = useAuthor(user?.pubkey || '');
  const metadata = author.data?.metadata;

  // Get comprehensive wallet/signer detection
  const { walletInfo, isConnected, userHasLightningAccess, isBunkerSigner, isNsecSigner, isExtensionSigner } = useWallet();

  // Currency toggle functionality
  const { showSats, toggleCurrency } = useCurrencyDisplayStore();
  const { data: btcPriceData, isLoading: isPriceLoading } = useBitcoinPrice();

  // Wallet balance functionality
  const globalCashuStore = useCashuStore();
  const { totalBalance: cashuBalance } = useCashuWallet();

  // Check current user login for backwards compatibility
  const currentUserLogin = logins.find(login => login.pubkey === user?.pubkey);
  const loginType = currentUserLogin?.type;

  // Detect potential signer conflicts (respect user's choice)
  const isExtensionAvailable = !!(window.nostr);
  const hasMultipleSigners = isExtensionAvailable && isBunkerSigner;

  // Optional: Log conflict detection for debugging (respects user's active choice)
  if (hasMultipleSigners && user?.pubkey) {
    console.info('Multiple signers detected - showing interface for active login choice:', loginType);
  }

  const location = useLocation();
  const navigate = useNavigate();
  const { pauseAllVideos, resumeAllVideos } = useVideoPlayback();
  const { refreshCurrentFeed } = useFeedRefresh();
  const { logout, confirmLogout, cancelLogout, showWarning } = useLogoutWithWarning();

  const [isOpen, setIsOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Format balance for currency toggle button (similar to desktop LoginArea)
  const formatToggleBalance = () => {
    if (!user) return '';

    // Get balances from both sources
    const lightningBalance = userHasLightningAccess ? (walletInfo?.balance || 0) : 0;
    const totalBalance = lightningBalance + cashuBalance;

    if (showSats) {
      return `${totalBalance.toLocaleString()}`;
    } else {
      // Use the existing useBitcoinPrice hook utilities
      if (btcPriceData?.USD) {
        const usdAmount = satsToUSD(totalBalance, btcPriceData.USD);
        return `${usdAmount.toFixed(2)}`;
      } else {
        return `${totalBalance.toLocaleString()}`;
      }
    }
  };

  const handleNavigateToPage = (path: string) => {
    setIsOpen(false); // Always close side nav when navigating
    if (path !== '/' && path !== '/global') {
      pauseAllVideos();
    } else {
      resumeAllVideos();
    }
    navigate(path);
  };

  const handleBottomNavClick = (path: string, requiresAuth = false) => {
    bundleLog('mobileNavClick', `📱 Bottom nav clicked: ${path}, current: ${location.pathname}`);

    // Handle authentication-required routes
    if (requiresAuth && !isAuthenticated) {
      withLoginCheck(() => {
        // If login succeeds, then navigate
        if (location.pathname === path && (path === '/following' || path === '/')) {
          bundleLog('mobileNavRefresh', `📱 Same-page refresh triggered for path: ${path}`);
          refreshCurrentFeed(path);
          return;
        }
        navigate(path);
      }, {
        loginMessage: `Login required to view ${
          path === '/following' ? 'following feed' : 
          path === '/profile' ? 'your profile' : 
          'this feature'
        }`,
      });
      return;
    }

    // Check if user is clicking on the same feed they're currently viewing
    if (location.pathname === path && (path === '/' || path === '/following')) {
      bundleLog('mobileNavRefresh', `📱 Same-page refresh triggered for path: ${path}`);
      refreshCurrentFeed(path);
      return; // Don't navigate, just refresh
    }

    // Different page navigation
    if (path !== '/' && path !== '/following') {
      pauseAllVideos();
    } else {
      resumeAllVideos();
    }
    navigate(path);
  };

  const handleUploadClick = () => {
    setIsOpen(false);
    pauseAllVideos();
    setShowUploadModal(true);
  };

  const handleUserSearchClick = () => {
    setIsOpen(false);
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

  const handleLogout = () => {
    setIsOpen(false); // Close the sheet
    logout();
  };

  interface NavItem {
    id: string;
    icon: any;
    label: string;
    path?: string;
    action?: string;
    isUserProfile?: boolean;
    isCenter?: boolean;
  }

  const navItems: NavItem[] = [
    { id: 'discover', icon: Search, label: 'Discover', path: '/discover' },
    { id: 'search-users', icon: UserPlus, label: 'Search Users', action: 'searchUsers' },
    { id: 'following', icon: Users, label: 'Following', path: '/following' },
    { id: 'global', icon: Globe, label: 'Global', path: '/' },
    { id: 'notifications', icon: Heart, label: 'Notifications', path: '/notifications' },
    { id: 'live-stream', icon: Radio, label: 'Live Stream', action: 'liveStream' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
    { id: 'upload-video', icon: PlusSquare, label: 'Upload Video', action: 'uploadVideo' },
  ];

  // Core items for bottom navigation
  const bottomNavItems = [
    { id: 'global', icon: Globe, label: 'Global', path: '/' },
    { id: 'following', icon: Users, label: 'Following', path: '/following' },
    { id: 'lightning', icon: Zap, label: 'Wallet', path: '/bitcoin-connect-wallet', isCenter: true },
    { id: 'notifications', icon: Heart, label: 'Notifications', path: '/notifications' },
    { id: 'profile', icon: User, label: 'Profile', isUserProfile: true },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Top Bar - Completely transparent overlay */}
      <div
        className="md:hidden fixed left-0 top-0 z-50 w-full bg-transparent pointer-events-none select-none"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex w-full max-w-screen-sm items-center justify-between px-4 py-3">
          {/* Left side - Currency Toggle Button + Feed Button */}
          <div className="flex gap-2 font-semibold text-lg tracking-wide pointer-events-auto">
            <button
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-all duration-200"
              onClick={() => {
                if (!user) {
                  setShowLoginModal(true);
                } else {
                  toggleCurrency();
                }
              }}
              title={user ? `Switch to ${showSats ? 'USD' : 'BTC'} ${isPriceLoading ? '(updating price...)' : btcPriceData?.USD ? `(BTC: $${btcPriceData.USD.toLocaleString()})` : ''}` : 'Sign in to view your balance'}
            >
              {showSats ? (
                <>
                  <Bitcoin className="w-4 h-4 text-orange-400" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                  <span className="text-orange-200 font-medium text-xs" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}>
                    {user ? formatToggleBalance() : '0'} sats
                  </span>
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 text-green-400" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                  <span className="text-green-200 font-medium text-xs" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}>
                    ${user ? formatToggleBalance() : '0.00'}
                  </span>
                  {user && isPriceLoading && <span className="opacity-50 ml-1 text-xs" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}>⟳</span>}
                </>
              )}
            </button>
            
            {/* Feed Selection Button */}
            <FeedButton />
          </div>

          {/* Right side - Action icons */}
          <div className="flex items-center gap-6 pointer-events-auto">
            {/* Always show these icons, but trigger login for read-only users */}
            
            {/* Stream Icon */}
            <button
              onClick={() => {
                if (!user) {
                  setShowLoginModal(true);
                } else {
                  navigate('/stream');
                }
              }}
              aria-label="Live Stream"
              className="text-white/80 hover:text-white transition-colors"
            >
              <Radio className="h-6 w-6" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
            </button>

            {/* Search User Icon */}
            <button
              onClick={() => {
                if (!user) {
                  setShowLoginModal(true);
                } else {
                  handleUserSearchClick();
                }
              }}
              aria-label="Search Users"
              className="text-white/80 hover:text-white transition-colors"
            >
              <UserPlus className="h-6 w-6" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
            </button>

            {/* Wallet Icons - show based on user type or default for read-only */}
            {user && isNsecSigner ? (
              <>
                {/* Cashu Wallet Icon */}
                <button
                  onClick={() => navigate('/cashu-wallet')}
                  aria-label="Cashu Wallet"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <img
                    src={`${import.meta.env.BASE_URL}images/cashu-icon.png`}
                    alt="Cashu"
                    className="w-6 h-6"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
                  />
                </button>

                {/* Bitcoin Connect Wallet Icon */}
                <button
                  onClick={() => navigate('/bitcoin-connect-wallet')}
                  aria-label="Bitcoin Connect Wallet"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <Zap className="h-6 w-6" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  if (!user) {
                    setShowLoginModal(true);
                  } else {
                    navigate('/cashu-wallet');
                  }
                }}
                aria-label="Cashu Wallet"
                className="text-white/80 hover:text-white transition-colors"
              >
                <img
                  src={`${import.meta.env.BASE_URL}images/cashu-icon.png`}
                  alt="Cashu"
                  className="w-6 h-6"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}
                />
              </button>
            )}

            {/* Upload Icon */}
            <button
              onClick={() => {
                if (!user) {
                  setShowLoginModal(true);
                } else {
                  handleUploadClick();
                }
              }}
              aria-label="Upload"
              className="text-white/80 hover:text-white transition-colors"
            >
              <PlusSquare className="h-6 w-6" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
            </button>

            {/* Hamburger Icon */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Menu"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <Menu className="h-6 w-6" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-black border-gray-800 p-0">
                <div className="flex flex-col h-full">
                  <SheetHeader className="p-6 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-white flex items-center space-x-2">
                        <ZapTokLogo size={24} />
                        <span>ZapTok</span>
                      </SheetTitle>
                    </div>
                  </SheetHeader>

                  {/* Navigation Items */}
                  <div className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                      // Handle action items vs navigation items
                      if (item.action) {
                        // Action items that don't navigate but perform functions
                        let onClick;
                        switch (item.action) {
                          case 'searchUsers':
                            onClick = handleUserSearchClick;
                            break;
                          case 'uploadVideo':
                            onClick = handleUploadClick;
                            break;
                          case 'liveStream':
                            onClick = () => handleNavigateToPage('/stream');
                            break;
                          default:
                            onClick = () => {};
                        }

                        // Only show user-only action items if user is logged in
                        if (['searchUsers', 'uploadVideo', 'liveStream'].includes(item.action) && !user) {
                          return null;
                        }

                        return (
                          <Button
                            key={item.id}
                            variant="ghost"
                            className="w-full justify-start h-12 text-gray-400 hover:text-white hover:bg-gray-800/30"
                            onClick={onClick}
                          >
                            <div className="w-5 h-5 mr-3 flex items-center justify-center">
                              {typeof item.icon === 'function' ? (
                                (item.icon as () => JSX.Element)()
                              ) : (
                                React.createElement(item.icon as React.ComponentType<{ size?: number }>, { size: 20 })
                              )}
                            </div>
                            <span className="font-medium">{item.label}</span>
                          </Button>
                        );
                      } else {
                        // Navigation items with paths
                        if (!item.path) return null; // Skip items without paths

                        // Check if this item requires authentication
                        const requiresAuth = ['discover', 'following', 'notifications', 'lightning'].includes(item.id);

                        return (
                          <Button
                            key={item.id}
                            variant="ghost"
                            className={`w-full justify-start h-12 ${
                              isActive(item.path)
                                ? 'bg-gray-800/50 text-orange-400'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                            }`}
                            onClick={() => {
                              if (requiresAuth && !isAuthenticated) {
                                setIsOpen(false); // Close dropdown first
                                setShowLoginModal(true); // Open login modal directly
                              } else {
                                handleNavigateToPage(item.path!);
                              }
                            }}
                          >
                            <div className="w-5 h-5 mr-3 flex items-center justify-center">
                              {typeof item.icon === 'function' ? (
                                (item.icon as () => JSX.Element)()
                              ) : (
                                React.createElement(item.icon as React.ComponentType<{ size?: number }>, { size: 20 })
                              )}
                            </div>
                            <span className="font-medium">{item.label}</span>
                          </Button>
                        );
                      }
                    })}
                  </div>

                  {/* Balance Displays Section */}
                  {user && (
                    <div className="px-4 py-2 space-y-2">
                      <BitcoinConnectBalanceDisplay variant="compact" />
                      <CashuBalanceDisplay variant="compact" />
                    </div>
                  )}

                  {/* Supporter Section */}
                  {user && (
                    <div className="px-4 py-2">
                      <MobileSupporterButton onClose={() => setIsOpen(false)} />
                    </div>
                  )}

                  {/* Profile Section */}
                  <div className="p-4 border-t border-gray-800">
                    {user ? (
                      <div className="flex items-center gap-3">
                        <button
                          className="flex items-center gap-3 p-3 rounded-xl transition-all flex-1 text-left hover:bg-gray-800/30"
                          onClick={() => handleNavigateToPage('/profile')}
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={metadata?.picture} alt={metadata?.name ?? genUserName(user.pubkey)} />
                            <AvatarFallback>{(metadata?.name ?? genUserName(user.pubkey)).charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className='flex-1 text-left truncate'>
                            <p className="font-medium text-sm text-gray-300 truncate">
                              {metadata?.name ?? genUserName(user.pubkey)}
                            </p>
                            {metadata?.nip05 && (
                              <p className="text-xs text-gray-500 truncate">{metadata.nip05}</p>
                            )}
                          </div>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLogout}
                          className="h-10 w-10 p-0 border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400 hover:bg-red-400/10"
                          title="Logout"
                        >
                          <LogOut className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <LoginArea className="w-full justify-center" />
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed left-0 right-0 z-50 bg-black/95 backdrop-blur-md" style={{ bottom: '16px' }}>
        <div className="flex items-center justify-around px-6 py-3 gap-4">
          {bottomNavItems.map((item) => {
            // Check if this item requires authentication
            const requiresAuth = ['following', 'notifications', 'lightning', 'discover'].includes(item.id);
            
            return (
              <div key={item.id} className="flex justify-center flex-1 max-w-[64px]">
                {item.isUserProfile ? (
                  // Profile button with user avatar or login prompt
                  user ? (
                    <button
                      className={`h-12 w-12 flex items-center justify-center rounded-full transition-colors ${
                        isActive('/profile')
                          ? 'ring-2 ring-orange-400'
                          : 'hover:ring-2 hover:ring-gray-600'
                      }`}
                      onClick={() => handleBottomNavClick('/profile')}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={metadata?.picture} alt={metadata?.name ?? genUserName(user.pubkey)} />
                        <AvatarFallback className="text-xs bg-gray-700 text-gray-300">
                          {(metadata?.name ?? genUserName(user.pubkey)).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  ) : (
                    <button
                      className={`h-12 w-12 flex items-center justify-center rounded-full transition-colors ${
                        isActive('/profile')
                          ? 'text-orange-400 bg-gray-800/30'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                      }`}
                      onClick={() => setShowLoginModal(true)}
                    >
                      <item.icon size={20} />
                    </button>
                  )
                ) : item.isCenter ? (
                  // Center lightning button - larger and highlighted
                  <button
                    className={`h-14 w-14 flex items-center justify-center rounded-full transition-colors ${
                      isActive(item.path!)
                        ? 'text-white bg-orange-600 shadow-lg shadow-orange-600/30'
                        : 'text-orange-400 bg-gray-800/50 hover:text-white hover:bg-orange-600/20 border border-orange-400/20'
                    }`}
                    onClick={() => {
                      if (requiresAuth && !isAuthenticated) {
                        setShowLoginModal(true);
                      } else {
                        handleBottomNavClick(item.path!);
                      }
                    }}
                  >
                    <item.icon size={24} />
                  </button>
                ) : (
                  // Regular navigation buttons - icon only
                  <button
                    className={`h-12 w-12 flex items-center justify-center rounded-full transition-colors ${
                      isActive(item.path!)
                        ? 'text-orange-400 bg-gray-800/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                    }`}
                    onClick={() => {
                      if (requiresAuth && !isAuthenticated) {
                        setShowLoginModal(true);
                      } else {
                        handleBottomNavClick(item.path!);
                      }
                    }}
                  >
                    <item.icon size={20} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <VideoUploadModal
        isOpen={showUploadModal}
        onClose={handleUploadModalClose}
      />

      <UserSearchModal
        open={showUserSearchModal}
        onOpenChange={handleUserSearchModalClose}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Logout Warning Modal */}
      <LogoutWarningModal
        isOpen={showWarning}
        onClose={cancelLogout}
        onConfirmLogout={confirmLogout}
      />
    </>
  );
}
