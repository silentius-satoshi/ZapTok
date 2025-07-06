// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { useState } from 'react';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { LoginModal } from './LoginModal';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { AccountSwitcher } from './AccountSwitcher';
import { cn } from '@/lib/utils';

export interface LoginAreaProps {
  className?: string;
}

export function LoginArea({ className }: LoginAreaProps) {
  const { currentUser } = useLoggedInAccounts();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      {currentUser ? (
        <AccountSwitcher onAddAccountClick={() => setLoginModalOpen(true)} />
      ) : (
        <Button
          onClick={() => setLoginModalOpen(true)}
          className='flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground w-full font-medium transition-all hover:bg-primary/90 animate-scale-in'
        >
          <User className='w-4 h-4' />
          <span className='truncate'>Log in</span>
        </Button>
      )}

      <LoginModal
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
      />
    </div>
  );
}