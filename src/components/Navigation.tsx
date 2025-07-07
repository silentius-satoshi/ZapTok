import { Home, Search, Heart, User, Plus, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ProfileModal } from '@/components/ProfileModal';
import LightningWalletModal from '@/components/lightning/LightningWalletModal';
import { useState } from 'react';

export function Navigation() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleProfileClick = () => {
    setActiveTab('profile');
    setShowProfileModal(true);
  };

  const handleWalletClick = () => {
    setActiveTab('wallet');
    setShowWalletModal(true);
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'For You', onClick: undefined },
    { id: 'search', icon: Search, label: 'Discover', onClick: undefined },
    { id: 'trending', icon: TrendingUp, label: 'Trending', onClick: undefined },
    { id: 'notifications', icon: Heart, label: 'Notifications', onClick: undefined },
    { id: 'wallet', icon: Zap, label: 'Lightning Wallet', onClick: handleWalletClick },
    { id: 'profile', icon: User, label: 'Profile', onClick: handleProfileClick },
  ];

  return (
    <TooltipProvider>
      <div className="hidden md:flex flex-col w-64 p-4 space-y-2 sticky top-20 h-fit">
        {navItems.map((item) => {
          // Special handling for Lightning Wallet button with tooltip
          if (item.id === 'wallet') {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeTab === item.id ? 'default' : 'ghost'}
                    className={`w-full justify-start text-left h-12 ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white hover:from-orange-500 hover:via-pink-600 hover:to-purple-700'
                        : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950'
                    }`}
                    onClick={item.onClick || (() => setActiveTab(item.id))}
                  >
                    <item.icon size={20} className="mr-3" />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-sm">
                  <div className="space-y-2">
                    <div className="font-semibold text-orange-500">⚡ Lightning Integration</div>
                    <p className="text-sm">
                      ZapTok integrates Bitcoin's Lightning Network for instant, low-fee payments. Zap creators directly with just a tap! Lightning Network enables fast, low-cost Bitcoin payments perfect for microtransactions and zapping creators on Nostr.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }

          // Regular buttons without tooltip
          return (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'default' : 'ghost'}
              className={`w-full justify-start text-left h-12 ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white hover:from-orange-500 hover:via-pink-600 hover:to-purple-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              onClick={item.onClick || (() => setActiveTab(item.id))}
            >
              <item.icon size={20} className="mr-3" />
              <span className="font-medium">{item.label}</span>
            </Button>
          );
        })}

        {user && (
          <Button
            className="w-full justify-start text-left h-12 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white hover:from-orange-500 hover:via-pink-600 hover:to-purple-700 mt-4"
          >
            <Plus size={20} className="mr-3" />
            <span className="font-medium">Upload</span>
          </Button>
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
    </TooltipProvider>
  );
}
