import { type NLoginType, NUser, useNostrLogin } from '@nostrify/react/login';
import { useNostr } from '@nostrify/react';
import { useCallback, useMemo, useEffect, useRef } from 'react';
import { devWarn } from '@/lib/devConsole';

import { useAuthor } from './useAuthor.ts';
import { NostrToolsSigner } from './useNostrToolsBridge.ts';

export function useCurrentUser() {
  const { nostr } = useNostr();
  const { logins, removeLogin } = useNostrLogin();

  // Track invalid logins that need to be removed
  const invalidLoginsRef = useRef<Set<string>>(new Set());

  const loginToUser = useCallback((login: NLoginType): NUser | null => {
    switch (login.type) {
      case 'nsec': // Nostr login with secret key
        return NUser.fromNsecLogin(login);
      case 'bunker': // Nostr login with NIP-46 "bunker://" URI
        return NUser.fromBunkerLogin(login, nostr);
      case 'x-bunker-nostr-tools': {
        // Handle our custom bunker login that already has a working signer
        const customLogin = login as any; // Type assertion for our custom structure
        // Check if we have the required properties - handle both old and new formats
        const bunkerUrl = customLogin.bunkerUrl || customLogin.data?.bunkerUrl;
        if (!bunkerUrl || !customLogin.pubkey) {
          devWarn('⚠️  Invalid x-bunker-nostr-tools login detected:', {
            id: login.id,
            hasBunkerUrl: !!bunkerUrl,
            hasPubkey: !!customLogin.pubkey,
            hasDataBunkerUrl: !!customLogin.data?.bunkerUrl,
            hasDirectBunkerUrl: !!customLogin.bunkerUrl,
            hasSigner: !!customLogin.signer
          });
          // Mark for removal but don't remove during render
          invalidLoginsRef.current.add(login.id);
          return null; // Return null instead of throwing to prevent render loops
        }

        // If we have a working signer, create a simple user object
        // The new login format already contains a working Nostrify-compatible signer
        if (customLogin.signer && customLogin.pubkey) {
          // ✅ Use cached signer instead of creating new one every render
          // Check if we already have a cached bridged signer
          if (!customLogin._cachedBridgedSigner) {
            // Only create new NostrToolsSigner if not cached
            customLogin._cachedBridgedSigner = new NostrToolsSigner(customLogin.signer.bunkerSigner, customLogin.pubkey);
          }

          return {
            pubkey: customLogin.pubkey,
            signer: customLogin._cachedBridgedSigner,
            // Remove wrapper methods - let the signer handle everything directly
            // This ensures consistency with extension/nsec signers that use user.signer.signEvent
          } as any; // Cast to NUser-compatible type
        }

        // Fallback: Parse the bunker URL to extract components for NLoginBunker (for old format)
        const bunkerUrlObj = new URL(bunkerUrl);
        const bunkerPubkey = bunkerUrlObj.pathname.slice(2); // Remove '//' prefix
        const relays = bunkerUrlObj.searchParams.getAll('relay');

        // Create proper NLoginBunker structure
        const enhancedLogin = {
          type: 'bunker' as const,
          id: customLogin.id || crypto.randomUUID(),
          createdAt: customLogin.createdAt || Date.now(),
          pubkey: customLogin.pubkey,
          data: {
            bunkerPubkey: bunkerPubkey,
            clientNsec: customLogin.clientNsec || 'nsec1' + '0'.repeat(58), // Placeholder if missing
            relays: relays.length > 0 ? relays : ['wss://relay.nsec.app'],
          },
        };
        return NUser.fromBunkerLogin(enhancedLogin, nostr);
      }
      case 'extension': // Nostr login with NIP-07 browser extension
        return NUser.fromExtensionLogin(login);
      // Other login types can be defined here
      default:
        throw new Error(`Unsupported login type: ${login.type}`);
    }
  }, [nostr]);

  // Clean up invalid logins outside of render cycle
  useEffect(() => {
    if (invalidLoginsRef.current.size > 0) {
      for (const loginId of invalidLoginsRef.current) {
        console.warn('🗑️  Removing invalid login from storage:', loginId);
        removeLogin(loginId);
      }
      invalidLoginsRef.current.clear();
    }
  }, [removeLogin, logins.length]); // Trigger when logins change

  const users = useMemo(() => {
    const users: NUser[] = [];

    for (const login of logins) {
      try {
        const user = loginToUser(login);
        if (user) { // Only add valid users, skip null ones
          users.push(user);
        }
      } catch (error) {
        console.warn('Skipped invalid login', login.id, error);
      }
    }

    return users;
  }, [logins, loginToUser]);

  const user = users[0] as NUser | undefined;
  const author = useAuthor(user?.pubkey);

  // Memoize the return object to prevent unnecessary re-renders
  const result = useMemo(() => ({
    user,
    users,
    ...author.data,
  }), [user, users, author.data]);

  // Debug logging - only in development and throttled
  useMemo(() => {
    if (import.meta.env.DEV) {
      console.debug('useCurrentUser:', {
        loginCount: logins.length,
        userCount: users.length,
        hasUser: !!user,
        userPubkey: user?.pubkey?.substring(0, 8) + '...'
      });
    }
  }, [logins.length, users.length, user?.pubkey]);

  return result;
}
