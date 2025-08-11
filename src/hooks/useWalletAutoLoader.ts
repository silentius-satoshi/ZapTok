import { useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

/**
 * Hook that automatically triggers wallet loading when a user logs in
 * This ensures existing accounts have their wallets loaded after login
 */
export function useWalletAutoLoader() {
  const { user } = useCurrentUser();
  const { wallet, isLoading } = useCashuWallet();
  const queryClient = useQueryClient();
  const { config } = useAppContext();

  // Check if Cashu operations should run in the current context
  const shouldRunCashuOperations = config.relayContext === 'all' || 
    config.relayContext === 'wallet' || 
    config.relayContext === 'cashu-only' || 
    config.relayContext === 'settings-cashu';

  useEffect(() => {
    // Only run when we have a user, Cashu ops should run, and wallet data hasn't been loaded yet
    if (shouldRunCashuOperations && user && !wallet && !isLoading) {
      // Invalidate the wallet query to force a refetch
      queryClient.invalidateQueries({ queryKey: ['cashu', 'wallet', user.pubkey] });
      queryClient.invalidateQueries({ queryKey: ['cashu', 'tokens', user.pubkey] });
    }
  }, [shouldRunCashuOperations, user, wallet, isLoading, queryClient]);

  return { wallet, isLoading };
}
