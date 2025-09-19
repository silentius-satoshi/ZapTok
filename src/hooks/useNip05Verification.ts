import { useState, useEffect } from 'react';
import { nip05 } from 'nostr-tools';

export interface Nip05VerificationResult {
  isValid: boolean | null;
  isLoading: boolean;
  error?: string;
  pubkey?: string;
  relays?: string[];
}

/**
 * Hook to verify NIP-05 identifiers
 * 
 * @param identifier - The NIP-05 identifier (e.g., "username@domain.com")
 * @param expectedPubkey - The expected pubkey to verify against
 * @param options - Verification options
 * @returns Verification result with loading state
 */
export function useNip05Verification(
  identifier: string | undefined,
  expectedPubkey?: string,
  options: {
    timeout?: number;
    enabled?: boolean;
  } = {}
): Nip05VerificationResult {
  const { timeout = 10000, enabled = true } = options;
  
  const [result, setResult] = useState<Nip05VerificationResult>({
    isValid: null,
    isLoading: false,
  });

  useEffect(() => {
    if (!identifier || !enabled) {
      setResult({ isValid: null, isLoading: false });
      return;
    }

    // Basic format validation
    if (!identifier.includes('@') || identifier.split('@').length !== 2) {
      setResult({
        isValid: false,
        isLoading: false,
        error: 'Invalid NIP-05 format',
      });
      return;
    }

    let isCancelled = false;
    
    const verifyIdentifier = async () => {
      setResult(prev => ({ ...prev, isLoading: true, error: undefined }));

      try {
        // Use nostr-tools to query the profile
        const profile = await Promise.race([
          nip05.queryProfile(identifier),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]);

        if (isCancelled) return;

        if (!profile) {
          setResult({
            isValid: false,
            isLoading: false,
            error: 'Profile not found',
          });
          return;
        }

        // If expectedPubkey is provided, verify it matches
        const isValid = expectedPubkey 
          ? profile.pubkey === expectedPubkey
          : true;

        setResult({
          isValid,
          isLoading: false,
          pubkey: profile.pubkey,
          relays: profile.relays,
          error: !isValid ? 'Pubkey mismatch' : undefined,
        });

      } catch (error) {
        if (isCancelled) return;
        
        setResult({
          isValid: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Verification failed',
        });
      }
    };

    verifyIdentifier();

    return () => {
      isCancelled = true;
    };
  }, [identifier, expectedPubkey, timeout, enabled]);

  return result;
}

/**
 * Simple hook to check if a NIP-05 identifier is valid
 * 
 * @param identifier - The NIP-05 identifier
 * @param pubkey - The pubkey to verify
 * @returns Boolean indicating if the identifier is valid
 */
export function useNip05Validation(
  identifier: string | undefined,
  pubkey: string | undefined
): boolean | null {
  const { isValid } = useNip05Verification(identifier, pubkey, {
    enabled: !!(identifier && pubkey),
  });
  
  return isValid;
}
