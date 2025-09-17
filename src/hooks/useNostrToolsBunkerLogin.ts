import { useState, useCallback } from 'react';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import { SimplePool } from 'nostr-tools/pool';
import { generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { bytesToHex } from '@noble/hashes/utils';
import { useNostrLogin } from '@nostrify/react/login';
import { useToast } from '@/hooks/useToast';
import { useBunkerPermissions } from '@/hooks/useBunkerPermissions';
import { useAuthState } from './useAuthState';
import { createNostrifyBunkerLogin } from './useNostrToolsBridge';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppContext } from '@/hooks/useAppContext';
import { debugLog } from '@/lib/debug';

/**
 * Detect if app is running in PWA mode
 */
function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for various PWA indicators
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://') ||
    window.location.search.includes('utm_source=pwa')
  );
}

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
  const { requestVideoPermissions, getBunkerConnectionOptions } = useBunkerPermissions();
  const isMobile = useIsMobile();
  const isInPWA = isPWA();
  const { config, addRelay } = useAppContext();

  const bunkerLogin = useCallback(async (bunkerUri: string): Promise<BunkerLoginResult> => {
    setState({ loading: true, error: null, success: false });

    // Request video permissions early in the process
    try {
      await requestVideoPermissions();
    } catch (error) {
      debugLog.bunkerWarn('Permission request display failed:', error);
      // Don't fail the login if we can't show the permission toast
    }

    // Show preemptive warning for mobile PWA users
    if (isMobile && isInPWA) {
      toast({
        title: "🔐 Approval Required",
        description: "You'll need to approve the connection in nsec.app. We'll open it for you, but you may need to switch apps manually.",
        duration: 10000, // Show longer for mobile users
      });
    }

    try {
      // Validate input
      if (!bunkerUri.trim()) {
        throw new Error('Bunker URI cannot be empty');
      }

      debugLog.bunker('🔐 Starting nostr-tools bunker login...', { uri: bunkerUri });

      // Parse bunker input (supports both bunker:// URLs and NIP-05)
      const bunkerPointer = await parseBunkerInput(bunkerUri.trim());

      if (!bunkerPointer) {
        throw new Error('Invalid bunker URI or NIP-05 identifier');
      }

      debugLog.bunker('✅ Parsed bunker pointer:', {
        pubkey: bunkerPointer.pubkey,
        relays: bunkerPointer.relays,
        hasSecret: !!bunkerPointer.secret,
      });

      // Generate local secret key for communication
      const localSecretKey = generateSecretKey();
      const localPubkey = getPublicKey(localSecretKey);

      debugLog.bunker('🔑 Generated local keypair for bunker communication');

      // Create relay pool
      const pool = new SimplePool();

      // Create bunker signer with timeout handling and video permissions
      const connectionOptions = getBunkerConnectionOptions();
      const bunker = new BunkerSigner(localSecretKey, bunkerPointer, {
        pool,
        // Include permissions in the connection request
        ...connectionOptions,
        onauth: (authUrl: string) => {
          debugLog.bunker('🔗 Auth URL received:', authUrl);
          
          // Enhance auth URL with permissions if supported
          const enhancedUrl = authUrl.includes('?') 
            ? `${authUrl}&perms=${encodeURIComponent(connectionOptions.perms)}`
            : `${authUrl}?perms=${encodeURIComponent(connectionOptions.perms)}`;
          
          debugLog.bunker('📋 Requesting permissions:', connectionOptions.perms);
          
          // Copy enhanced auth URL to clipboard
          if (navigator.clipboard) {
            navigator.clipboard.writeText(enhancedUrl).catch(() => {
              // Fallback to original URL if enhanced URL fails
              navigator.clipboard.writeText(authUrl).catch((err) => {
                debugLog.bunkerWarn('Failed to copy auth URL to clipboard:', err);
              });
            });
          }
          
          // Handle differently based on platform
          if (isMobile && isInPWA) {
            // For mobile PWA: show different message since we already warned them
            toast({
              title: "🔗 Connection Ready",
              description: "The connection URL has been copied to your clipboard. Please open nsec.app manually to approve.",
              duration: 12000, // Show longer for mobile users
            });
            
            // Don't try to open automatically on mobile PWA - it often fails
            debugLog.bunker('📱 Mobile PWA detected - not opening auth URL automatically');
          } else {
            // For desktop browser: show standard notification and auto-open
            toast({
              title: "🔐 Approval Required", 
              description: "Please check nsec.app to approve the connection request.",
              duration: 8000,
            });
            
            // Open nsec.app in a new tab for desktop convenience
            if (typeof window !== 'undefined') {
              window.open(authUrl, '_blank', 'noopener,noreferrer');
            }
          }
        }
      });

      debugLog.bunker('🤝 Connecting to bunker...');

      // Connect with timeout
      const connectPromise = bunker.connect();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      debugLog.bunker('✅ Connected to bunker successfully');

      // Get user's public key
      debugLog.bunker('🔍 Getting user public key...');
      const userPubkey = await bunker.getPublicKey();

      if (!userPubkey) {
        throw new Error('Failed to get user public key from bunker');
      }

      debugLog.bunker('✅ Retrieved user pubkey:', userPubkey);

      // Store bunker signer and local secret for future use (enhanced like Jumble)
      const clientSecretKey = bytesToHex(localSecretKey); // Store client secret like Jumble
      const bunkerData = {
        type: 'bunker' as const,
        userPubkey,
        bunkerPubkey: bunkerPointer.pubkey,
        localSecretHex: clientSecretKey, // Keep for backward compatibility
        clientSecretKey: clientSecretKey, // Add explicit client secret key like Jumble
        relays: bunkerPointer.relays,
        secret: bunkerPointer.secret,
        localPubkey,
        originalBunkerUri: bunkerUri, // Store the original bunker URI
        createdAt: Date.now(), // Add timestamp
        lastUsed: Date.now(), // Track usage
      };

      debugLog.bunker('💾 Storing bunker data with client secret key');

      // Store in localStorage for persistence
      const storageKey = `bunker-${userPubkey}`;
      localStorage.setItem(storageKey, JSON.stringify(bunkerData));

      // Create Nostrify-compatible login object with client secret
      const login = createNostrifyBunkerLogin(userPubkey, bunker, bunkerData, clientSecretKey);

      // Add to Nostrify's login system
      addLogin(login);
      setLogin(login.id);

      debugLog.bunker('💾 Integrated with Nostrify login system with enhanced bunker support');

      // Automatically add bunker relay to user's relay configuration if not already present
      const bunkerRelayUrl = 'wss://relay.nsec.app';
      if (bunkerPointer.relays && bunkerPointer.relays.length > 0) {
        const primaryBunkerRelay = bunkerPointer.relays[0];
        if (!config.relayUrls.includes(primaryBunkerRelay)) {
          debugLog.bunker('🔗 Adding bunker relay to user configuration:', primaryBunkerRelay);
          addRelay(primaryBunkerRelay);
        } else {
          debugLog.bunker('🔗 Bunker relay already in configuration:', primaryBunkerRelay);
        }
      } else if (!config.relayUrls.includes(bunkerRelayUrl)) {
        // Fallback to default bunker relay
        debugLog.bunker('🔗 Adding default bunker relay to user configuration:', bunkerRelayUrl);
        addRelay(bunkerRelayUrl);
      } else {
        debugLog.bunker('🔗 Default bunker relay already in configuration');
      }

      setState({ loading: false, error: null, success: true });

      debugLog.bunker('🎉 Bunker login completed successfully!');

      return {
        userPubkey,
        bunkerSigner: bunker,
        login,
      };

    } catch (error) {
      debugLog.bunkerError('Bunker login failed:', error);

      let errorMessage = 'Bunker login failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({ loading: false, error: errorMessage, success: false });
      throw error;
    }
  }, [addLogin, setLogin, toast, isMobile, isInPWA, addRelay, config.relayUrls]);

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
    debugLog.bunkerError('Failed to restore bunker signer:', error);
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