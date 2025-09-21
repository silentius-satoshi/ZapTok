import { useMutation } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuStore } from '@/stores/cashuStore';
import { defaultMints } from '@/lib/cashu';
import { generateSecretKey } from 'nostr-tools';
import { bytesToHex } from "@noble/hashes/utils";

/**
 * Hook for creating a Cashu wallet with Chorus-style defaults
 * Automatically includes default mints and sets up the wallet
 */
export function useCreateCashuWallet() {
  const { user } = useCurrentUser();
  const { createWallet } = useCashuWallet();
  const cashuStore = useCashuStore();

  return useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('You must be logged in to create a wallet');
      }

      try {
        // Generate a new private key for the wallet
        const privkey = bytesToHex(generateSecretKey());
        cashuStore.setPrivkey(privkey);

        // Start with existing mints and add defaults
        const existingMints = cashuStore.mints.map((m) => m.url);
        const allMints = [...existingMints];
        
        // Add default mints that aren't already present
        for (const mint of defaultMints) {
          if (!allMints.includes(mint)) {
            allMints.push(mint);
          }
        }

        // Create the wallet with all mints
        createWallet({
          privkey,
          mints: allMints,
        });

        // Set the first mint as active if none is set
        if (!cashuStore.getActiveMintUrl() && allMints.length > 0) {
          cashuStore.setActiveMintUrl(allMints[0]);
        }

        return { success: true, mints: allMints };
      } catch (error) {
        console.error('Failed to create wallet:', error);
        throw new Error('Failed to create wallet. Please try again.');
      }
    },
  });
}