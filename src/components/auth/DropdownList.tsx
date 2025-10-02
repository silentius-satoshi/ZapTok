// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { ChevronDown, LogOut, UserIcon, UserPlus, Settings, Upload, Wallet, Info, Download, Heart } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { useLoggedInAccounts, type Account } from '@/hooks/useLoggedInAccounts';
import { useLogoutWithWarning } from '@/hooks/useLogoutWithWarning';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { useNavigate } from 'react-router-dom';
import { VideoUploadModal } from '@/components/VideoUploadModal';
import { LogoutWarningModal } from '@/components/LogoutWarningModal';
import { PWAInstallModal } from '@/components/PWAInstallModal';
import { useVideoPlayback } from '@/contexts/VideoPlaybackContext';
import { useState } from 'react';

interface DropdownListProps {
  onAddAccountClick: () => void;
}

export function DropdownList({ onAddAccountClick }: DropdownListProps) {
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();
  const { logout, confirmLogout, cancelLogout, showWarning } = useLogoutWithWarning();
  const currentAuthor = useAuthor(currentUser?.pubkey);
  const currentUserMetadata = currentAuthor.data?.metadata;
  const navigate = useNavigate();
  const { pauseAllVideos, resumeAllVideos } = useVideoPlayback();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPWAInstallModal, setShowPWAInstallModal] = useState(false);

  if (!currentUser) return null;

  const getDisplayName = (account: Account): string => {
    return account.metadata.name ?? genUserName(account.pubkey);
  }

  const getCurrentUserDisplayName = (): string => {
    return currentUserMetadata?.name ?? genUserName(currentUser.pubkey);
  }

  const handleUploadClick = () => {
    pauseAllVideos();
    setShowUploadModal(true);
  };

  const handleUploadModalClose = () => {
    setShowUploadModal(false);
    resumeAllVideos();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className='flex items-center gap-3 p-3 rounded-2xl bg-gray-800/30 hover:bg-gray-700/40 transition-all min-w-0 flex-shrink-0 text-foreground'
          style={{
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
          }}
        >
          <Avatar className='w-10 h-10'>
            <AvatarImage src={currentUserMetadata?.picture} alt={getCurrentUserDisplayName()} />
            <AvatarFallback>{getCurrentUserDisplayName().charAt(0)}</AvatarFallback>
          </Avatar>
          <div className='flex-1 text-left hidden md:block truncate min-w-0'>
            <p className='font-medium text-sm truncate'>{getCurrentUserDisplayName()}</p>
          </div>
          <ChevronDown className='w-4 h-4 text-muted-foreground flex-shrink-0' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className='w-56 p-2 animate-scale-in' 
        align="end" 
        side="bottom" 
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={16}
        collisionBoundary={document.documentElement}
        sticky="always"
      >
        {/* Upload Video */}
        <DropdownMenuItem
          onClick={handleUploadClick}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <Upload className='w-4 h-4' />
          <span>Upload Video</span>
        </DropdownMenuItem>

        {/* View Profile */}
        <DropdownMenuItem
          onClick={() => navigate('/profile')}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <UserIcon className='w-4 h-4' />
          <span>View Profile</span>
        </DropdownMenuItem>

        {/* Cashu Wallet */}
        <DropdownMenuItem
          onClick={() => navigate('/settings?section=cashu-wallet')}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <Wallet className='w-4 h-4' />
          <span>Cashu Wallet Settings</span>
        </DropdownMenuItem>

        {/* Notifications */}
        <DropdownMenuItem
          onClick={() => navigate('/settings?section=notifications')}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <Heart className='w-4 h-4' />
          <span>Notification Settings</span>
        </DropdownMenuItem>

        {/* Settings */}
        <DropdownMenuItem
          onClick={() => navigate('/settings')}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <Settings className='w-4 h-4' />
          <span>Settings</span>
        </DropdownMenuItem>

        {/* About ZapTok */}
        <DropdownMenuItem
          onClick={() => navigate('/about')}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <Info className='w-4 h-4' />
          <span>About ZapTok</span>
        </DropdownMenuItem>

        {/* Install App */}
        <DropdownMenuItem
          onClick={() => setShowPWAInstallModal(true)}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <Download className='w-4 h-4' />
          <span>Install App</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Account switching section - DISABLED due to wallet isolation bug */}
        <div className='font-medium text-sm px-2 py-1.5 text-muted-foreground/70'>Switch Account</div>
        <div className='px-2 py-1 text-xs text-muted-foreground/60 mb-2'>
          Account switching temporarily disabled due to wallet connection issues
        </div>
        {otherUsers.map((user) => (
          <DropdownMenuItem
            key={user.id}
            disabled={true}
            className='flex items-center gap-2 p-2 rounded-md opacity-40 cursor-not-allowed'
          >
            <Avatar className='w-8 h-8'>
              <AvatarImage src={user.metadata.picture} alt={getDisplayName(user)} />
              <AvatarFallback>{getDisplayName(user)?.charAt(0) || <UserIcon />}</AvatarFallback>
            </Avatar>
            <div className='flex-1 truncate'>
              <p className='text-sm font-medium'>{getDisplayName(user)}</p>
            </div>
            {user.id === currentUser.id && <div className='w-2 h-2 rounded-full bg-primary'></div>}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={true}
          className='flex items-center gap-2 p-2 rounded-md opacity-40 cursor-not-allowed'
        >
          <UserPlus className='w-4 h-4' />
          <span>Add another account</span>
        </DropdownMenuItem>

        {/* Log out - Red color to match screenshot */}
        <DropdownMenuItem
          onClick={logout}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md text-red-500'
        >
          <LogOut className='w-4 h-4' />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={showUploadModal}
        onClose={handleUploadModalClose}
      />

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={showPWAInstallModal}
        onClose={() => setShowPWAInstallModal(false)}
      />

      {/* Logout Warning Modal */}
      <LogoutWarningModal
        isOpen={showWarning}
        onClose={cancelLogout}
        onConfirmLogout={confirmLogout}
      />
    </DropdownMenu>
  );
}