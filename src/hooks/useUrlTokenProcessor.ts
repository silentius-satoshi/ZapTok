import { useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuToken } from '@/hooks/useCashuToken';
import { useCashuStore } from '@/stores/cashuStore';
import { formatBalance } from '@/lib/cashu';
import { toast } from 'sonner';

/**
 * Hook to automatically process Cashu tokens from URL parameters
 * Chorus-style URL token redemption
 */
export function useUrlTokenProcessor() {
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const { receiveToken } = useCashuToken();
  const cashuStore = useCashuStore();

  useEffect(() => {
    if (!user || !wallet) return;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) return;

    const processToken = async () => {
      try {
        // Clear the token from URL immediately
        window.history.replaceState(null, '', window.location.pathname);

        // Receive the token
        const result = await receiveToken(token);

        // Calculate total amount
        const totalAmount = result.proofs.reduce((sum, p) => sum + p.amount, 0);

        // Show success notification
        toast.success('eCash received!', {
          description: `You've received ${formatBalance(totalAmount)} in your wallet`,
        });
      } catch (error) {
        console.error('Error processing URL token:', error);
        toast.error('Failed to redeem token', {
          description: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    };

    processToken();
  }, [user, wallet, receiveToken]);
}

/**
 * Hook to handle pending onboarding tokens (Chorus pattern)
 */
export function useOnboardingTokenProcessor() {
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const { receiveToken } = useCashuToken();
  const cashuStore = useCashuStore();

  useEffect(() => {
    if (!user || !wallet) return;

    const pendingToken = cashuStore.getPendingOnboardingToken();
    if (!pendingToken) return;

    const processPendingToken = async () => {
      try {
        // Clear the pending token
        cashuStore.setPendingOnboardingToken(undefined);

        // Receive the token
        const result = await receiveToken(pendingToken);

        // Calculate total amount
        const totalAmount = result.proofs.reduce((sum, p) => sum + p.amount, 0);

        // Show success notification
        toast.success('Welcome bonus received!', {
          description: `You've received ${formatBalance(totalAmount)} to get started`,
        });
      } catch (error) {
        console.error('Error processing onboarding token:', error);
        toast.error('Failed to process welcome bonus', {
          description: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    };

    processPendingToken();
  }, [user, wallet, receiveToken, cashuStore]);
}