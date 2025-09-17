import { useEffect, useState } from 'react';
import { useNostrLogin } from '@nostrify/react/login';
import { debugLog } from '@/lib/debug';

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
      // Only keep manual-logout flag if no bunker sessions exist in localStorage
      // This prevents page refresh from being treated as manual logout
      const bunkerKeys = Object.keys(localStorage).filter(key => key.startsWith('bunker-'));
      if (bunkerKeys.length === 0) {
        // No bunker sessions, so this was likely a real logout
        debugLog.bunker('🔄 No bunker sessions found, preserving manual-logout flag');
      } else {
        // Bunker sessions exist, so this is likely a page refresh
        debugLog.bunker('🔄 Bunker sessions exist, clearing manual-logout flag for page refresh');
        sessionStorage.removeItem('manual-logout');
      }
    }
  }, [logins]);

  return {
    hasManuallyLoggedOut,
    allowAutoExtensionLogin,
    markManualLogout,
    markManualExtensionLogin,
  };
}
