import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';
import { useAuthState } from './useAuthState';
import { useNostrToolsBunkerLogin } from './useNostrToolsBunkerLogin';

// NOTE: This file should not be edited except for adding new login methods.

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin, setLogin } = useNostrLogin();
  const { markManualLogout, markManualExtensionLogin } = useAuthState();
  const { bunkerLogin: nostrToolsBunkerLogin } = useNostrToolsBunkerLogin();

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
    // Login with a NIP-46 "bunker://" URI using nostr-tools (more reliable)
    async bunkerNostrTools(uri: string): Promise<void> {
      // Use the nostr-tools implementation which handles integration automatically
      await nostrToolsBunkerLogin(uri);
      // Login is automatically added and activated by the hook
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
        
        // If this was a bunker login, track it as manually removed and clean up storage
        if (login.type === 'x-bunker-nostr-tools' || (login as any).method === 'bunker') {
          try {
            // Track this session as manually removed to prevent auto-restoration
            const removedSessions = JSON.parse(sessionStorage.getItem('removed-bunker-sessions') || '[]');
            if (!removedSessions.includes(login.pubkey)) {
              removedSessions.push(login.pubkey);
              sessionStorage.setItem('removed-bunker-sessions', JSON.stringify(removedSessions));
            }
            
            // Remove the localStorage data to prevent restoration
            const storageKey = `bunker-${login.pubkey}`;
            localStorage.removeItem(storageKey);
            console.log('🗑️ Removed bunker session storage for:', login.pubkey?.substring(0, 16) + '...');
          } catch (error) {
            console.warn('Failed to remove bunker session storage:', error);
          }
        }
        
        removeLogin(login.id);
        
        // Ensure no user is automatically selected after logout
        // This prevents switching to another stored account
        if (logins.length <= 1) {
          // If this was the last/only login, clear the active login
          setLogin('');
        }
      }
    }
  };
}
