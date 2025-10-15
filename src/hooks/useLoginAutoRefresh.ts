import { useEffect, useRef } from 'react';
import { useLoggedInAccounts } from './useLoggedInAccounts';

/**
 * Hook to detect when a user has just logged in and trigger auto-refresh
 * Returns a boolean indicating if the user just logged in
 */
export function useLoginAutoRefresh() {
  const { currentUser } = useLoggedInAccounts();
  const previousUserRef = useRef<string | null>(null);
  const justLoggedInRef = useRef(false);

  useEffect(() => {
    const currentPubkey = currentUser?.pubkey || null;
    const previousPubkey = previousUserRef.current;

    // User just logged in: currentUser exists but previousUser was null
    if (currentPubkey && !previousPubkey) {
      justLoggedInRef.current = true;
      
      // Reset the flag after a short delay to prevent multiple triggers
      const timeoutId = setTimeout(() => {
        justLoggedInRef.current = false;
      }, 1000);

      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeoutId);
    }
    
    // User switched accounts: different pubkey
    else if (currentPubkey && previousPubkey && currentPubkey !== previousPubkey) {
      justLoggedInRef.current = true;
      
      // Reset the flag after a short delay
      const timeoutId = setTimeout(() => {
        justLoggedInRef.current = false;
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
    
    // User logged out: no current user but had previous user
    else if (!currentPubkey && previousPubkey) {
      justLoggedInRef.current = false;
    }

    // Update the previous user reference
    previousUserRef.current = currentPubkey;
  }, [currentUser?.pubkey]);

  return {
    justLoggedIn: justLoggedInRef.current,
    currentUser,
  };
}