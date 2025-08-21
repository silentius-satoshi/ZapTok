import { useState } from 'react';
import { Search, Heart, Zap, PlusSquare, Settings, Users, Globe, Radio, UserPlus, Menu, X, Wallet, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCurrentVideo } from '@/contexts/CurrentVideoContext';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { VideoUploadModal } from '@/components/VideoUploadModal';
import { UserSearchModal } from '@/components/UserSearchModal';
import { useVideoPlayback } from '@/contexts/VideoPlaybackContext';
import { ZapTokLogo } from '@/components/ZapTokLogo';
import { LoginArea } from '@/components/auth/LoginArea';
import { QuickZap } from '@/components/QuickZap';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export function MobileNavigation() {
  const { user } = useCurrentUser();
  const { currentVideo } = useCurrentVideo();
  const author = useAuthor(user?.pubkey || '');
  const metadata = author.data?.metadata;
  const location = useLocation();
  const navigate = useNavigate();
  const { pauseAllVideos, resumeAllVideos } = useVideoPlayback();

  const [isOpen, setIsOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const [showQuickZap, setShowQuickZap] = useState(false);

  const handleNavigateToPage = (path: string) => {
    setIsOpen(false); // Always close side nav when navigating
    if (path !== '/' && path !== '/global') {
      pauseAllVideos();
    } else {
      resumeAllVideos();
    }
    navigate(path);
  };

  const handleBottomNavClick = (path: string) => {
    // Separate handler for bottom nav to ensure no side nav interference
    if (path !== '/' && path !== '/global') {
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

  const handleZapClick = () => {
    // Zap the current video author if available
    if (currentVideo && user) {
      pauseAllVideos();
      setShowQuickZap(true);
    }
  };

  const navItems = [
    { id: 'discover', icon: Search, label: 'Discover', path: '/discover' },
    { id: 'following', icon: Users, label: 'Following', path: '/' },
    { id: 'global', icon: Globe, label: 'Global', path: '/global' },
    { id: 'notifications', icon: Heart, label: 'Notifications', path: '/notifications' },
    { id: 'wallet', icon: Zap, label: 'Wallet', path: '/wallet' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Core items for bottom navigation in the requested order
  const bottomNavItems = [
    { id: 'global', icon: Globe, label: 'Global', path: '/global' },
    { id: 'following', icon: Users, label: 'Following', path: '/' },
    { id: 'zap', icon: Zap, label: 'Zap', isCenter: true, isZapButton: true },
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
          {/* Left side - Navigation tabs */}
          <div className="flex gap-6 font-semibold text-lg tracking-wide pointer-events-auto">
            <button
              onClick={() => navigate('/following')}
              className={`transition-colors ${
                location.pathname === '/' || location.pathname === '/following'
                  ? 'text-white'
                  : 'text-white/60'
              }`}
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              Following
            </button>
            <button
              onClick={() => navigate('/discover')}
              className={`transition-colors ${
                location.pathname.startsWith('/discover')
                  ? 'text-white'
                  : 'text-white/60'
              }`}
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              For You
            </button>
          </div>

          {/* Right side - Action icons */}
          <div className="flex items-center gap-4 pointer-events-auto">
            {user && (
              <>
                <button
                  onClick={() => navigate('/lightning-wallet')}
                  aria-label="Wallet"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <Wallet className="h-6 w-6" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                </button>
                <button
                  onClick={handleUploadClick}
                  aria-label="Upload"
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <PlusSquare className="h-6 w-6" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                </button>
              </>
            )}

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
                        <span>Menu</span>
                      </SheetTitle>
                    </div>
                  </SheetHeader>

                  {/* Navigation Items */}
                  <div className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                      <Link key={item.id} to={item.path}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start h-12 ${
                            isActive(item.path)
                              ? 'bg-gray-800/50 text-orange-400'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                          }`}
                          onClick={() => handleNavigateToPage(item.path)}
                        >
                          <item.icon size={20} className="mr-3" />
                          <span className="font-medium">{item.label}</span>
                        </Button>
                      </Link>
                    ))}

                    {user && (
                      <>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-gray-400 hover:text-white hover:bg-gray-800/30"
                          onClick={handleUserSearchClick}
                        >
                          <UserPlus size={20} className="mr-3" />
                          <span className="font-medium">Search Users</span>
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-gray-400 hover:text-white hover:bg-gray-800/30"
                          onClick={handleUploadClick}
                        >
                          <PlusSquare size={20} className="mr-3" />
                          <span className="font-medium">Upload Video</span>
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full justify-start h-12 text-gray-400 hover:text-white hover:bg-gray-800/30"
                          onClick={() => handleNavigateToPage('/stream')}
                        >
                          <Radio size={20} className="mr-3" />
                          <span className="font-medium">Live Stream</span>
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Profile Section */}
                  <div className="p-4 border-t border-gray-800">
                    {user ? (
                      <button
                        className="flex items-center gap-3 p-3 rounded-xl transition-all w-full text-left hover:bg-gray-800/30"
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md">
        <div className="flex items-center justify-around pt-4 pb-3 px-4">
          {bottomNavItems.map((item) => (
            <div key={item.id} className="flex justify-center">
              {item.isCenter ? (
                // Center zap button with elevated styling
                <button
                  className={`h-14 w-14 flex items-center justify-center rounded-full transition-all transform bg-gradient-to-br from-orange-400 to-yellow-500 text-white shadow-md shadow-orange-400/20 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30`}
                  onClick={handleZapClick}
                >
                  <item.icon size={24} className="drop-shadow-sm" />
                </button>
              ) : item.isUserProfile ? (
                // Profile button with user avatar
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
                    onClick={() => handleBottomNavClick('/profile')}
                  >
                    <item.icon size={20} />
                  </button>
                )
              ) : (
                // Regular navigation buttons - icon only
                <button
                  className={`h-12 w-12 flex items-center justify-center rounded-full transition-colors ${
                    isActive(item.path!)
                      ? 'text-orange-400 bg-gray-800/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                  }`}
                  onClick={() => handleBottomNavClick(item.path!)}
                >
                  <item.icon size={20} />
                </button>
              )}
            </div>
          ))}
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

      {/* QuickZap Modal for current video author */}
      {showQuickZap && currentVideo && (
        <QuickZap
          isOpen={showQuickZap}
          recipientPubkey={currentVideo.pubkey}
          onClose={() => {
            setShowQuickZap(false);
            resumeAllVideos();
          }}
        />
      )}
    </>
  );
}
