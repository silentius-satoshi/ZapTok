import { Home, Search, Heart, User, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ProfileModal } from '@/components/ProfileModal';
import { useState } from 'react';

export function Navigation() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('home');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleProfileClick = () => {
    setActiveTab('profile');
    setShowProfileModal(true);
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'For You', onClick: undefined },
    { id: 'search', icon: Search, label: 'Discover', onClick: undefined },
    { id: 'trending', icon: TrendingUp, label: 'Trending', onClick: undefined },
    { id: 'notifications', icon: Heart, label: 'Notifications', onClick: undefined },
    { id: 'profile', icon: User, label: 'Profile', onClick: handleProfileClick },
  ];

  return (
    <>
      <div className="hidden md:flex flex-col w-64 p-4 space-y-2 sticky top-20 h-fit">
        {navItems.map((item) => (
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
        ))}

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
    </>
  );
}
