import { useMutation } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuStore } from '@/stores/cashuStore';
import { defaultMints, CashuWalletStruct } from '@/lib/cashu';
import { generateSecretKey } from 'nostr-tools';
import { bytesToHex } from "@noble/hashes/utils";

export function useCreateCashuWallet() {
  const { user } = useCurrentUser();
  const { createWallet } = useCashuWallet();
  const cashuStore = useCashuStore();

  return useMutation({
    mutationFn: async (walletData?: CashuWalletStruct) => {
      if (!user) {
        throw new Error('You must be logged in to create a wallet');
      }

      try {
        // If wallet data is provided, use it (for updates/modifications)
        if (walletData) {
          await createWallet(walletData);
          return { success: true };
        }

        // Otherwise create a new wallet with default settings
        const privkey = bytesToHex(generateSecretKey());
        cashuStore.setPrivkey(privkey);

        // Create a new wallet with the default mint
        const mints = cashuStore.mints.map((m) => m.url);
        // add default mints
        mints.push(...defaultMints);

        await createWallet({
          privkey,
          mints,
        });

        return { success: true };
      } catch (error) {
        console.error('Failed to derive private key:', error);
        throw new Error('Failed to create wallet. Please try again.');
      }
    }
  });
}
