import { useEffect } from 'react';
import { loginWithNip46 } from '@welshman/app';
import { debugLog } from '@/lib/debug';

interface BunkerSession {
  pubkey: string;
  clientSecret: string;
  signerPubkey: string;
  relays: string[];
}

/**
 * Hook to restore Welshman bunker sessions on app startup
 * This replaces the old useBunkerLoginRestoration hook
 */
export function useWelshmanBunkerRestoration() {
  useEffect(() => {
    const restoreBunkerSession = async () => {
      try {
        const bunkerSessions = localStorage.getItem('bunkerSessions');
        const lastBunkerPubkey = localStorage.getItem('lastBunkerPubkey');

        if (!bunkerSessions || !lastBunkerPubkey) {
          debugLog.bunker('No bunker session to restore');
          return;
        }

        const sessions: Record<string, BunkerSession> = JSON.parse(bunkerSessions);
        const session = sessions[lastBunkerPubkey];

        if (!session) {
          debugLog.bunkerWarn('Last bunker pubkey not found in sessions');
          return;
        }

        debugLog.bunker('🔄 Restoring bunker session:', {
          pubkey: session.pubkey,
          signerPubkey: session.signerPubkey,
          relays: session.relays,
        });

        // Create signer using stored credentials and log in
        // loginWithNip46 automatically handles the session management
        loginWithNip46(
          session.pubkey,
          session.clientSecret,
          session.signerPubkey,
          session.relays
        );

        debugLog.bunker('✅ Bunker session restored successfully');

      } catch (err) {
        debugLog.bunkerError('❌ Failed to restore bunker session:', err);
        // Don't throw - just fail silently and let user login again
      }
    };

    // Use dynamic import to isolate Welshman code
    restoreBunkerSession();
  }, []);
}
