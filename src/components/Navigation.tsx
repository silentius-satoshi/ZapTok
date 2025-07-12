import { Search, Heart, TrendingUp, Zap, Play, PlusSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { ProfileModal } from '@/components/ProfileModal';
import LightningWalletModal from '@/components/lightning/LightningWalletModal';
import { useState } from 'react';

export function Navigation() {
  const { user } = useCurrentUser();
  const author = useAuthor(user?.pubkey || '');
  const metadata = author.data?.metadata;
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleProfileClick = () => {
    setActiveTab('profile');
    setShowProfileModal(true);
  };

  const handleWalletClick = () => {
    setActiveTab('wallet');
    setShowWalletModal(true);
  };

  const navItems = [
    { id: 'home', icon: Play, label: 'For You', onClick: undefined },
    { id: 'search', icon: Search, label: 'Discover', onClick: undefined },
    { id: 'trending', icon: TrendingUp, label: 'Trending', onClick: undefined },
    { id: 'notifications', icon: Heart, label: 'Notifications', onClick: undefined },
    { id: 'wallet', icon: Zap, label: 'Lightning Wallet', onClick: handleWalletClick },
    { id: 'settings', icon: Settings, label: 'Settings', onClick: undefined, path: '/settings' },
  ];

  return (
    <>
      <div className="hidden md:flex flex-col w-64 p-4 h-full">{/* Main Navigation */}
        <div className="space-y-2 flex-1">
          {navItems.map((item) => {
            // Special handling for settings item with Link
            if (item.path) {
              return (
                <Link key={item.id} to={item.path}>
                  <Button
                    variant={activeTab === item.id ? 'default' : 'ghost'}
                    className={`w-full justify-start text-left h-12 bg-transparent hover:bg-transparent ${
                      activeTab === item.id
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    onClick={() => setActiveTab(item.id)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <item.icon size={20} className={`mr-3 ${
                      activeTab === item.id || hoveredItem === item.id
                        ? 'text-orange-500'
                        : 'text-gray-400'
                    }`} style={activeTab === item.id || hoveredItem === item.id ? {
                      background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    } : {}} />
                    <span className={`font-medium ${
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

            // Regular navigation items
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'default' : 'ghost'}
                className={`w-full justify-start text-left h-12 bg-transparent hover:bg-transparent ${
                  activeTab === item.id
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={item.onClick || (() => setActiveTab(item.id))}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <item.icon size={20} className={`mr-3 ${
                  activeTab === item.id || hoveredItem === item.id
                    ? 'text-orange-500'
                    : 'text-gray-400'
                }`} style={activeTab === item.id || hoveredItem === item.id ? {
                  background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } : {}} />
                <span className={`font-medium ${
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
            <Button
              className={`w-full justify-start text-left h-12 bg-transparent hover:bg-transparent ${
                activeTab === 'upload'
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-400 hover:text-white'
              } mt-4`}
              onClick={() => setActiveTab('upload')}
              onMouseEnter={() => setHoveredItem('upload')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <PlusSquare size={20} className={`mr-3 ${
                activeTab === 'upload' || hoveredItem === 'upload'
                  ? 'text-orange-500'
                  : 'text-gray-400'
              }`} style={activeTab === 'upload' || hoveredItem === 'upload' ? {
                background: 'linear-gradient(to right, #fb923c, #ec4899, #9333ea)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              } : {}} />
              <span className={`font-medium ${
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

      {/* Profile Modal */}
      {user && (
        <ProfileModal 
          isOpen={showProfileModal} 
          onClose={() => setShowProfileModal(false)} 
        />
      )}

      {/* Lightning Wallet Modal */}
      <LightningWalletModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)} 
      />
    </>
  );
}
