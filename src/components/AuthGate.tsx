import { ReactNode } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginModal } from '@/components/auth/LoginModal';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user } = useCurrentUser();

  if (!user) {
    return <LoginModal isOpen={true} onClose={() => {}} />;
  }

  return <>{children}</>;
}
