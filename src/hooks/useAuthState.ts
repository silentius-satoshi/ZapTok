import { useEffect, useState } from 'react';
import { useNostrLogin } from '@nostrify/react/login';

/**
 * Custom auth state management to handle automatic extension login prevention
 */
export function useAuthState() {
  const { logins } = useNostrLogin();
  const [hasManuallyLoggedOut, setHasManuallyLoggedOut] = useState(false);
  const [allowAutoExtensionLogin, setAllowAutoExtensionLogin] = useState(false);

  // Check if user has manually logged out during this session
  useEffect(() => {
    const manualLogout = sessionStorage.getItem('manual-logout');
    if (manualLogout === 'true') {
      setHasManuallyLoggedOut(true);
    }
  }, []);

  // Check if extension login was manually initiated
  useEffect(() => {
    const manualExtensionLogin = sessionStorage.getItem('manual-extension-login');
    if (manualExtensionLogin === 'true') {
      setAllowAutoExtensionLogin(true);
    }
  }, []);

  const markManualLogout = () => {
    setHasManuallyLoggedOut(true);
    setAllowAutoExtensionLogin(false);
    sessionStorage.setItem('manual-logout', 'true');
    sessionStorage.removeItem('manual-extension-login');
  };

  const markManualExtensionLogin = () => {
    setAllowAutoExtensionLogin(true);
    setHasManuallyLoggedOut(false);
    sessionStorage.setItem('manual-extension-login', 'true');
    sessionStorage.removeItem('manual-logout');
  };

  // Clear session flags when all logins are removed
  useEffect(() => {
    if (logins.length === 0) {
      sessionStorage.removeItem('manual-extension-login');
      // Keep manual-logout flag to prevent auto-reconnection
    }
  }, [logins]);

  return {
    hasManuallyLoggedOut,
    allowAutoExtensionLogin,
    markManualLogout,
    markManualExtensionLogin,
  };
}
