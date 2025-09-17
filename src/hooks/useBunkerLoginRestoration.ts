import { useEffect, useRef } from 'react';
import { useNostrLogin } from '@nostrify/react/login';
import { restoreNostrifyBunkerLogin } from './useNostrToolsBridge';
import { debugLog } from '@/lib/debug';

/**
 * Hook for automatically restoring bunker logins on app startup
 * Inspired by Jumble's approach to maintaining persistent bunker sessions
 */
export function useBunkerLoginRestoration() {
  const { logins, addLogin, setLogin } = useNostrLogin();
  const restorationAttempted = useRef(false);

  useEffect(() => {
    // Prevent multiple restoration attempts
    if (restorationAttempted.current) {
      debugLog.bunker('⏭️ Restoration already attempted, skipping');
      return;
    }

    debugLog.bunker('🔄 useBunkerLoginRestoration: Starting restoration check');

    // Get bunker session data from localStorage
    const bunkerKeys = Object.keys(localStorage).filter(key => key.startsWith('bunker-'));
    debugLog.bunker('📦 Found stored bunker sessions:', bunkerKeys.length);

    if (bunkerKeys.length === 0) {
      debugLog.bunker('ℹ️ No stored bunker sessions found');
      restorationAttempted.current = true;
      return;
    }

    // Check if we already have bunker logins in Nostrify
    const existingBunkerLogins = logins.filter(login => 
      login.type === 'x-bunker-nostr-tools' || 
      (login as any).method === 'bunker'
    );

    debugLog.bunker('🔍 Existing bunker logins in Nostrify:', existingBunkerLogins.length);

    // If we have stored sessions but no active logins, attempt restoration
    if (bunkerKeys.length > 0 && existingBunkerLogins.length === 0) {
      debugLog.bunker('🚀 No active bunker logins found, attempting restoration...');
      restorationAttempted.current = true;

      // Attempt to restore each stored bunker session (use Promise.all for proper async handling)
      const restorePromises = bunkerKeys.map(async (key) => {
        try {
          const userPubkey = key.replace('bunker-', '');
          debugLog.bunker('🔄 Restoring bunker session for:', userPubkey?.substring(0, 16) + '...');

          const restoredLogin = await restoreNostrifyBunkerLogin(userPubkey);

          if (restoredLogin) {
            debugLog.bunker('✅ Successfully restored bunker login');
            addLogin(restoredLogin);
            
            // Set as active login if it's the first one restored
            setLogin(restoredLogin.id);
            debugLog.bunker('✅ Set restored login as active');
            
            return restoredLogin;
          } else {
            debugLog.bunker('❌ Failed to restore bunker login for:', userPubkey?.substring(0, 16) + '...');
            return null;
          }
        } catch (error) {
          debugLog.bunker('❌ Error restoring bunker session:', error);
          return null;
        }
      });

      // Wait for all restoration attempts to complete
      Promise.all(restorePromises).then(results => {
        const successfulRestorations = results.filter(result => result !== null);
        debugLog.bunker('🏁 Restoration complete:', successfulRestorations.length, 'of', bunkerKeys.length, 'sessions restored');
      }).catch(error => {
        debugLog.bunker('❌ Error in restoration process:', error);
      });
    } else if (existingBunkerLogins.length > 0) {
      debugLog.bunker('✅ Active bunker logins already exist, no restoration needed');
      restorationAttempted.current = true;
    }
  }, []); // Remove dependencies to ensure it only runs once on mount

  // Return nothing - this is just a restoration hook
  return null;
}