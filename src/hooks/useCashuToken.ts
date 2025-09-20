import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCashuWallet } from './useCashuWallet';
import { useCashuStore } from '@/stores/cashuStore';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { CashuToken, decodeCashuToken, encodeCashuToken } from '@/lib/cashu';
import { Proof } from '@cashu/cashu-ts';

export const useCashuToken = () => {
  const queryClient = useQueryClient();
  const { getActiveWallet, addProofs, removeProofs, getProofsForMint } = useCashuWallet();
  const { addMint } = useCashuStore();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { user } = useCurrentUser();

  // Send tokens (create token for sending)
  const sendToken = useMutation({
    mutationFn: async ({ amount, mintUrl }: { amount: number; mintUrl?: string }) => {
      if (!user) {
        throw new Error('Must be logged in to send tokens');
      }

      const { wallet } = await getActiveWallet();

      // Get current proofs from store for this mint
      const mintProofs = await getProofsForMint(wallet.mint.mintUrl);

      // Send tokens using wallet's send method
      const { send, keep } = await wallet.send(amount, mintProofs, { includeFees: true });

      // Remove sent proofs from store
      removeProofs(send);

      // Create token
      const token: CashuToken = {
        mint: wallet.mint.mintUrl,
        proofs: send,
      };

      const encodedToken = encodeCashuToken(token);

      // Publish NIP-60 token event
      const tokenEvent = await publishEvent({
        kind: 60,
        content: encodedToken,
        tags: [
          ['mint', wallet.mint.mintUrl],
          ['amount', amount.toString()],
          ['u', wallet.mint.mintUrl],
        ],
      });

      return {
        token: encodedToken,
        proofs: send,
        amount,
        eventId: tokenEvent.id,
      };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['cashu'] });
    },
  });

  // Receive tokens (redeem token)
  const receiveToken = useMutation({
    mutationFn: async ({ token, eventId }: { token: string; eventId?: string }) => {
      if (!user) {
        throw new Error('Must be logged in to receive tokens');
      }

      // Decode the token
      const cashuToken = decodeCashuToken(token);

      // Add mint if not already known
      addMint(cashuToken.mint);

      // Get wallet for this mint
      const { wallet } = await getActiveWallet();

      // Receive the token using the encoded token string directly
      const receivedProofs = await wallet.receive(token);

      // Add proofs to store with event ID
      addProofs(receivedProofs, eventId || 'received');

      return {
        proofs: receivedProofs,
        amount: receivedProofs.reduce((sum, p) => sum + p.amount, 0),
        mint: cashuToken.mint,
      };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['cashu'] });
    },
  });

  // Clean spent proofs (simplified - just remove old proofs)
  const cleanSpentProofs = useMutation({
    mutationFn: async () => {
      // For now, just return success - in a real implementation you'd check with the mint
      // which proofs are spent and remove them
      return {
        total: 0,
        spent: 0,
        remaining: 0,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashu'] });
    },
  });

  // Swap tokens (refresh/split proofs)
  const swapToken = useMutation({
    mutationFn: async ({ proofs }: { proofs: Proof[] }) => {
      const { wallet } = await getActiveWallet();

      // Remove old proofs
      removeProofs(proofs);

      // Get current proofs and swap for new ones
      const mintProofs = await getProofsForMint(wallet.mint.mintUrl);
      const { send: newProofs } = await wallet.send(
        proofs.reduce((sum, p) => sum + p.amount, 0),
        mintProofs,
        { includeFees: true }
      );

      // Add new proofs
      addProofs(newProofs, 'swapped');

      return newProofs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashu'] });
    },
  });

  return {
    sendToken,
    receiveToken,
    cleanSpentProofs,
    swapToken,
    // Legacy compatibility aliases
    createToken: sendToken,
    isCreatingToken: sendToken.isPending,
    isReceivingToken: receiveToken.isPending,
    isLoading: sendToken.isPending || receiveToken.isPending,
    error: sendToken.error || receiveToken.error,
  };
};