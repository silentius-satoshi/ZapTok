import { useState, useCallback } from 'react';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import { SimplePool } from 'nostr-tools/pool';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex } from '@noble/hashes/utils';
import { useNostrLogin } from '@nostrify/react/login';
import { useToast } from '@/hooks/useToast';
import { useAuthState } from './useAuthState';
import { createNostrifyBunkerLogin } from './useNostrToolsBridge';

interface BunkerLoginState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

interface BunkerLoginResult {
  userPubkey: string;
  bunkerSigner: BunkerSigner;
  login: any; // Nostrify-compatible login object
}

/**
 * Hook for reliable bunker login using nostr-tools instead of Nostrify
 * Addresses timeout and reliability issues with the current implementation
 */
export function useNostrToolsBunkerLogin() {
  const [state, setState] = useState<BunkerLoginState>({
    loading: false,
    error: null,
    success: false
  });

  const { addLogin, setLogin } = useNostrLogin();
  const authState = useAuthState();
  const { toast } = useToast();

  const bunkerLogin = useCallback(async (bunkerUri: string): Promise<BunkerLoginResult> => {
    setState({ loading: true, error: null, success: false });

    try {
      // Validate input
      if (!bunkerUri.trim()) {
        throw new Error('Bunker URI cannot be empty');
      }

      console.log('🔐 Starting nostr-tools bunker login...', { uri: bunkerUri });

      // Parse bunker input (supports both bunker:// URLs and NIP-05)
      const bunkerPointer = await parseBunkerInput(bunkerUri.trim());

      if (!bunkerPointer) {
        throw new Error('Invalid bunker URI or NIP-05 identifier');
      }

      console.log('✅ Parsed bunker pointer:', {
        pubkey: bunkerPointer.pubkey,
        relays: bunkerPointer.relays,
        hasSecret: !!bunkerPointer.secret,
      });

      // Generate local secret key for communication
      const localSecretKey = generateSecretKey();
      const localPubkey = getPublicKey(localSecretKey);

      console.log('🔑 Generated local keypair for bunker communication');

      // Create relay pool
      const pool = new SimplePool();

      // Create bunker signer with timeout handling
      const bunker = new BunkerSigner(localSecretKey, bunkerPointer, {
        pool,
        onauth: (authUrl: string) => {
          console.log('🔗 Auth URL received:', authUrl);
          
          // Show user-friendly notification
          toast({
            title: "🔐 Approval Required",
            description: "Please check nsec.app to approve the connection request. The link has been copied to your clipboard.",
            duration: 8000, // Show for 8 seconds
          });
          
          // Copy auth URL to clipboard for user convenience
          if (navigator.clipboard) {
            navigator.clipboard.writeText(authUrl).catch(console.warn);
          }
          
          // Open nsec.app in a new tab for user convenience
          if (typeof window !== 'undefined') {
            window.open(authUrl, '_blank', 'noopener,noreferrer');
          }
        }
      });

      console.log('🤝 Connecting to bunker...');

      // Connect with timeout
      const connectPromise = bunker.connect();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      console.log('✅ Connected to bunker successfully');

      // Get user's public key
      console.log('🔍 Getting user public key...');
      const userPubkey = await bunker.getPublicKey();

      if (!userPubkey) {
        throw new Error('Failed to get user public key from bunker');
      }

      console.log('✅ Retrieved user pubkey:', userPubkey);

      // Store bunker signer and local secret for future use
      const bunkerData = {
        type: 'bunker' as const,
        userPubkey,
        bunkerPubkey: bunkerPointer.pubkey,
        localSecretHex: bytesToHex(localSecretKey),
        relays: bunkerPointer.relays,
        secret: bunkerPointer.secret,
        localPubkey,
        originalBunkerUri: bunkerUri, // Store the original bunker URI
      };

      // Store in localStorage for persistence
      const storageKey = `bunker-${userPubkey}`;
      localStorage.setItem(storageKey, JSON.stringify(bunkerData));

      // Create Nostrify-compatible login object
      const login = createNostrifyBunkerLogin(userPubkey, bunker, bunkerData);

      // Add to Nostrify's login system
      addLogin(login);
      setLogin(login.id);

      console.log('💾 Integrated with Nostrify login system');

      setState({ loading: false, error: null, success: true });

      console.log('🎉 Bunker login completed successfully!');

      return {
        userPubkey,
        bunkerSigner: bunker,
        login,
      };

    } catch (error) {
      console.error('❌ Bunker login failed:', error);

      let errorMessage = 'Bunker login failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({ loading: false, error: errorMessage, success: false });
      throw error;
    }
  }, [addLogin, setLogin]);

  const resetState = useCallback(() => {
    setState({ loading: false, error: null, success: false });
  }, []);

  return {
    bunkerLogin,
    resetState,
    ...state,
  };
}

/**
 * Utility function to restore a bunker signer from stored data
 */
export async function restoreBunkerSigner(userPubkey: string): Promise<BunkerSigner | null> {
  try {
    const storageKey = `bunker-${userPubkey}`;
    const storedData = localStorage.getItem(storageKey);

    if (!storedData) {
      return null;
    }

    const bunkerData = JSON.parse(storedData);

    // Reconstruct bunker pointer
    const bunkerPointer = {
      pubkey: bunkerData.bunkerPubkey,
      relays: bunkerData.relays,
      secret: bunkerData.secret,
    };

    // Reconstruct local secret key
    const localSecretKey = new Uint8Array(
      bunkerData.localSecretHex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
    );

    // Create new bunker signer
    const pool = new SimplePool();
    const bunker = new BunkerSigner(localSecretKey, bunkerPointer, { pool });

    return bunker;
  } catch (error) {
    console.error('Failed to restore bunker signer:', error);
    return null;
  }
}

/**
 * Utility function to clean up stored bunker data
 */
export function cleanupBunkerData(userPubkey: string): void {
  const storageKey = `bunker-${userPubkey}`;
  localStorage.removeItem(storageKey);
}