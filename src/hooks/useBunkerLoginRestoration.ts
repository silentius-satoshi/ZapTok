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

    // Get bunker session data from localStorage first
    const bunkerKeys = Object.keys(localStorage).filter(key => key.startsWith('bunker-'));
    debugLog.bunker('📦 Found stored bunker sessions:', bunkerKeys.length);

    // Check if user has manually logged out - but clear the flag if bunker sessions exist
    // This handles page refresh vs. actual logout distinction
    const hasManuallyLoggedOut = sessionStorage.getItem('manual-logout') === 'true';
    if (hasManuallyLoggedOut && bunkerKeys.length > 0) {
      debugLog.bunker('� Page refresh detected with existing bunker sessions, clearing manual logout flag');
      sessionStorage.removeItem('manual-logout');
    } else if (hasManuallyLoggedOut) {
      debugLog.bunker('�🚫 Manual logout detected, skipping automatic restoration');
      restorationAttempted.current = true;
      return;
    }

    debugLog.bunker('🔄 useBunkerLoginRestoration: Starting restoration check');

    if (bunkerKeys.length === 0) {
      debugLog.bunker('ℹ️ No stored bunker sessions found');
      restorationAttempted.current = true;
      return;
    }

    // Check if we already have FUNCTIONAL bunker logins in Nostrify
    const existingBunkerLogins = logins.filter(login => {
      const isBunkerType = login.type === 'x-bunker-nostr-tools' || (login as any).method === 'bunker';
      
      if (!isBunkerType) return false;
      
      // Check if the login has a functional signer with signEvent method
      const loginWithSigner = login as any; // Type assertion to access signer property
      const hasFunctionalSigner = loginWithSigner.signer && (
        typeof loginWithSigner.signer.signEvent === 'function' ||
        typeof Object.getPrototypeOf(loginWithSigner.signer)?.signEvent === 'function' ||
        (loginWithSigner.signer.bunkerSigner && typeof loginWithSigner.signer.bunkerSigner.signEvent === 'function')
      );
      
      debugLog.bunker('🔍 Checking bunker login functionality:', {
        loginId: login.id?.substring(0, 16) + '...',
        isBunkerType,
        hasSigner: !!loginWithSigner.signer,
        hasFunctionalSigner,
        signerType: loginWithSigner.signer?.constructor?.name
      });
      
      return hasFunctionalSigner;
    });

    debugLog.bunker('🔍 Functional bunker logins in Nostrify:', existingBunkerLogins.length);

    // If we have stored sessions but no active logins, attempt restoration
    if (bunkerKeys.length > 0 && existingBunkerLogins.length === 0) {
      debugLog.bunker('🚀 No active bunker logins found, attempting restoration...');
      restorationAttempted.current = true;

      // Find the most recently used bunker session instead of restoring all
      const getMostRecentSession = () => {
        let mostRecentKey = bunkerKeys[0];
        let mostRecentTime = 0;

        // Get list of sessions that have been manually removed (should not be restored)
        const removedSessions = JSON.parse(sessionStorage.getItem('removed-bunker-sessions') || '[]');

        for (const key of bunkerKeys) {
          try {
            const userPubkey = key.replace('bunker-', '');
            
            // Skip sessions that were manually removed
            if (removedSessions.includes(userPubkey)) {
              debugLog.bunker('⏭️ Skipping manually removed session:', userPubkey?.substring(0, 16) + '...');
              continue;
            }

            const storedData = localStorage.getItem(key);
            if (storedData) {
              const data = JSON.parse(storedData);
              const lastUsed = data.lastUsed || data.createdAt || 0;
              if (lastUsed > mostRecentTime) {
                mostRecentTime = lastUsed;
                mostRecentKey = key;
              }
            }
          } catch (error) {
            debugLog.bunker('⚠️ Error parsing session data for:', key, error);
          }
        }

        return mostRecentKey;
      };

      const mostRecentKey = getMostRecentSession();
      const userPubkey = mostRecentKey.replace('bunker-', '');
      
      // Check if the most recent session was manually removed
      const removedSessions = JSON.parse(sessionStorage.getItem('removed-bunker-sessions') || '[]');
      if (removedSessions.includes(userPubkey)) {
        debugLog.bunker('🚫 Most recent session was manually removed, skipping restoration');
        restorationAttempted.current = true;
        return;
      }
      
      debugLog.bunker('🎯 Restoring most recent bunker session:', userPubkey?.substring(0, 16) + '...');
      debugLog.bunker('📦 Other stored sessions will remain available for manual login');

      // Only restore the most recently used session
      restoreNostrifyBunkerLogin(userPubkey)
        .then(restoredLogin => {
          if (restoredLogin) {
            debugLog.bunker('✅ Successfully restored bunker login');
            
            // Clear this pubkey from removed sessions list since restoration was successful
            try {
              const removedSessions = JSON.parse(sessionStorage.getItem('removed-bunker-sessions') || '[]');
              const updatedRemovedSessions = removedSessions.filter((pubkey: string) => pubkey !== userPubkey);
              if (updatedRemovedSessions.length !== removedSessions.length) {
                sessionStorage.setItem('removed-bunker-sessions', JSON.stringify(updatedRemovedSessions));
                debugLog.bunker('🔄 Cleared pubkey from removed sessions list after restoration:', userPubkey?.substring(0, 16) + '...');
              }
            } catch (error) {
              debugLog.bunker('⚠️ Failed to clear removed sessions after restoration:', error);
            }
            
            addLogin(restoredLogin);
            setLogin(restoredLogin.id);
            debugLog.bunker('✅ Set restored login as active');
          } else {
            debugLog.bunker('❌ Failed to restore bunker login for:', userPubkey?.substring(0, 16) + '...');
          }
        })
        .catch(error => {
          debugLog.bunker('❌ Error restoring bunker session:', error);
        });
    } else if (existingBunkerLogins.length > 0) {
      debugLog.bunker('✅ Active FUNCTIONAL bunker logins already exist, no restoration needed');
      restorationAttempted.current = true;
    }
  }, []); // Remove dependencies to ensure it only runs once on mount

  // Return nothing - this is just a restoration hook
  return null;
}