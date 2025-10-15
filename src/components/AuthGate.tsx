import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginModal } from '@/components/auth/LoginModal';

interface AuthGateProps {
  children: ReactNode;
  redirectTo?: string;
}

export function AuthGate({ children, redirectTo = '/' }: AuthGateProps) {
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  // Don't render children at all when not authenticated
  // This prevents the underlying content from being in the DOM and receiving events
  if (!user) {
    return <LoginModal isOpen={true} onClose={() => navigate(redirectTo)} />;
  }

  return <>{children}</>;
}
