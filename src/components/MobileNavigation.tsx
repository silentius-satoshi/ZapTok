import { useState } from 'react';
import { Search, Heart, Zap, PlusSquare, Settings, Users, Globe, Radio, UserPlus, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { VideoUploadModal } from '@/components/VideoUploadModal';
import { UserSearchModal } from '@/components/UserSearchModal';
import { useVideoPlayback } from '@/contexts/VideoPlaybackContext';
import { ZapTokLogo } from '@/components/ZapTokLogo';
import { LoginArea } from '@/components/auth/LoginArea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export function MobileNavigation() {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey || '');
  const metadata = author.data?.metadata;
  const location = useLocation();
  const navigate = useNavigate();
  const { pauseAllVideos, resumeAllVideos } = useVideoPlayback();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);

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

  const navItems = [
    { id: 'discover', icon: Search, label: 'Discover', path: '/discover' },
    { id: 'following', icon: Users, label: 'Following', path: '/' },
    { id: 'global', icon: Globe, label: 'Global', path: '/global' },
    { id: 'notifications', icon: Heart, label: 'Notifications', path: '/notifications' },
    { id: 'wallet', icon: Zap, label: 'Wallet', path: '/wallet' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <ZapTokLogo size={32} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              ZapTok
            </h1>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUploadClick}
                className="p-2"
              >
                <PlusSquare size={20} className="text-gray-400" />
              </Button>
            )}
            
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu size={20} className="text-gray-400" />
                </Button>
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-gray-800">
        <div className="flex items-center overflow-x-auto scrollbar-hide py-2 px-2 gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`flex-shrink-0 w-16 h-12 flex flex-col items-center justify-center gap-1 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'text-orange-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
              }`}
              onClick={() => handleBottomNavClick(item.path)}
            >
              <item.icon size={16} />
              <span className="text-xs font-medium leading-tight truncate w-full text-center">{item.label}</span>
            </button>
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
    </>
  );
}
