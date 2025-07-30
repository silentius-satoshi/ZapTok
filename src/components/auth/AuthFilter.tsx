import { useEffect, useRef } from 'react';
import { useNostrLogin } from '@nostrify/react/login';
import { useAuthState } from '@/hooks/useAuthState';

/**
 * Component that filters out automatic extension logins
 * This prevents browser extensions from automatically logging users in
 * unless they explicitly clicked "Login with Extension"
 */
export function AuthFilter({ children }: { children: React.ReactNode }) {
  const { logins, removeLogin } = useNostrLogin();
  const { hasManuallyLoggedOut, allowAutoExtensionLogin } = useAuthState();
  const hasCheckedInitialLogins = useRef(false);

  useEffect(() => {
    // Only run the filter on initial load to prevent removing valid manual logins
    if (hasCheckedInitialLogins.current) {
      return;
    }

    // Small delay to ensure auth state is properly initialized
    const checkTimer = setTimeout(() => {
      // Debug logging - only in development
      if (import.meta.env.DEV) {
        console.debug('AuthFilter check:', {
          logins: logins.length,
          hasManuallyLoggedOut,
          allowAutoExtensionLogin,
          extensionLogins: logins.filter(l => l.type === 'extension').length
        });
      }

      logins.forEach(login => {
        if (login.type === 'extension') {
          // Only remove if user has manually logged out AND hasn't manually logged in with extension
          if (hasManuallyLoggedOut && !allowAutoExtensionLogin) {
            if (import.meta.env.DEV) {
              console.debug('Removing automatic extension login - user previously logged out');
            }
            removeLogin(login.id);
          }
          // If no manual action has been taken, allow the login (this handles page refresh scenarios)
          else if (!hasManuallyLoggedOut && !allowAutoExtensionLogin) {
            if (import.meta.env.DEV) {
              console.debug('Allowing existing extension login on page load');
            }
          }
        }
      });

      hasCheckedInitialLogins.current = true;
    }, 100);

    return () => clearTimeout(checkTimer);
  }, [logins, hasManuallyLoggedOut, allowAutoExtensionLogin, removeLogin]);

  return <>{children}</>;
}
