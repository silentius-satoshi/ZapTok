import { useState } from 'react';
import { useNostrLogin } from '@nostrify/react/login';
import { useLoginActions } from './useLoginActions';

/**
 * Custom hook that handles logout with warnings for local key users
 */
export function useLogoutWithWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const { logins } = useNostrLogin();
  const { logout: directLogout } = useLoginActions();

  const isUsingLocalKeys = () => {
    const currentLogin = logins[0];
    return currentLogin?.type === 'nsec';
  };

  const logout = () => {
    if (isUsingLocalKeys()) {
      // Show warning modal for local key users
      setShowWarning(true);
    } else {
      // Direct logout for external signers
      directLogout();
    }
  };

  const confirmLogout = () => {
    directLogout();
    setShowWarning(false);
  };

  const cancelLogout = () => {
    setShowWarning(false);
  };

  return {
    logout,
    confirmLogout,
    cancelLogout,
    showWarning,
    isUsingLocalKeys: isUsingLocalKeys(),
  };
}