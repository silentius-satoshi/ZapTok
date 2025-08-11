import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';
import { useAuthState } from './useAuthState';

// NOTE: This file should not be edited except for adding new login methods.

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin, setLogin } = useNostrLogin();
  const { markManualLogout, markManualExtensionLogin } = useAuthState();

  return {
    // Login with a Nostr secret key
    nsec(nsec: string): void {
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
      // Auto-switch to the newly added account
      setLogin(login.id);
    },
    // Login with a NIP-46 "bunker://" URI
    async bunker(uri: string): Promise<void> {
      const login = await NLogin.fromBunker(uri, nostr);
      addLogin(login);
      // Auto-switch to the newly added account
      setLogin(login.id);
    },
    // Login with a NIP-07 browser extension
    async extension(): Promise<void> {
      console.log('Extension login initiated');
      markManualExtensionLogin(); // Mark that this was a manual login
      const login = await NLogin.fromExtension();
      addLogin(login);
      // Auto-switch to the newly added account
      setLogin(login.id);
      console.log('Extension login completed successfully');
    },
    // Log out the current user
    async logout(): Promise<void> {
      const login = logins[0];
      if (login) {
        markManualLogout(); // Mark that this was a manual logout
        removeLogin(login.id);
      }
    }
  };
}
