import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (walletData?: CashuWalletStruct) => {
      console.log('useCreateCashuWallet: Starting wallet creation', { walletData, user: !!user });

      if (!user) {
        throw new Error('You must be logged in to create a wallet');
      }

      try {
        // If wallet data is provided, use it (for updates/modifications)
        if (walletData) {
          console.log('useCreateCashuWallet: Updating existing wallet');
          await createWallet(walletData);
          return { success: true };
        }

        // Otherwise create a new wallet with default settings
        console.log('useCreateCashuWallet: Creating new wallet');
        const privkey = bytesToHex(generateSecretKey());
        cashuStore.setPrivkey(privkey);

        // Create a new wallet with the default mint
        const mints = cashuStore.mints.map((m) => m.url);
        // add default mints
        mints.push(...defaultMints);

        console.log('useCreateCashuWallet: About to call createWallet with mints:', mints);
        await createWallet({
          privkey,
          mints,
        });

        console.log('useCreateCashuWallet: Wallet creation completed successfully');
        return { success: true };
      } catch (error) {
        console.error('useCreateCashuWallet: Failed to create wallet:', error);
        throw new Error('Failed to create wallet. Please try again.');
      }
    },
    onSuccess: (data) => {
      console.log('useCreateCashuWallet: onSuccess called', data);
      // Explicitly invalidate the wallet query to ensure UI updates
      queryClient.invalidateQueries({
        queryKey: ['cashu', 'wallet', user?.pubkey],
        exact: false
      });
      console.log('useCreateCashuWallet: Query invalidation completed');
    },
    onError: (error) => {
      console.error('useCreateCashuWallet: onError called', error);
    }
  });
}
