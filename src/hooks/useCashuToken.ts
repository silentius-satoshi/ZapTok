import { useState } from 'react';
import { useCashuStore } from '@/stores/cashuStore';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { CashuMint, CashuWallet, Proof, getDecodedToken } from '@cashu/cashu-ts';

export function useCashuToken() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cashuStore = useCashuStore();
  const { wallet, createWallet } = useCashuWallet();
  const { createHistory } = useCashuHistory();

  /**
   * Generate a send token
   * @param amount Amount to send in satoshis
   * @param socialContext Optional social payment context
   * @returns Token string and proofs that were sent
   */
  const sendToken = async (
    amount: number,
    socialContext?: {
      groupId?: string;
      isNutzap?: boolean;
      recipientPubkey?: string;
      publicNote?: string;
    }
  ): Promise<{ token: string; proofs: Proof[] }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the active mint
      const mintUrl = cashuStore.getActiveMintUrl();
      if (!mintUrl) {
        throw new Error('No active mint selected');
      }

      const mint = new CashuMint(mintUrl);
      const wallet = new CashuWallet(mint);

      // Load mint keysets
      await wallet.loadMint();

      // Get all proofs from store
      const proofs = await cashuStore.getMintProofs(mintUrl);

      const proofsAmount = proofs.reduce((sum, p) => sum + p.amount, 0);
      if (proofsAmount < amount) {
        throw new Error(`Not enough funds. Available: ${proofsAmount}, Required: ${amount}`);
      }

      // Perform coin selection
      const { keep: proofsToKeep, send: proofsToSend } = await wallet.send(amount, proofs, {
        pubkey: socialContext?.recipientPubkey,
        privkey: cashuStore.privkey
      });

      // Update proofs in store (keeping the unsent ones)
      if (proofsToKeep.length > 0) {
        cashuStore.addProofs(proofsToKeep, `send-keep-${Date.now()}`);
      }

      // Remove the spent proofs from the store
      cashuStore.removeProofs(proofsToSend);

      // Create token string using @cashu/cashu-ts
      const { getEncodedTokenV4 } = await import('@cashu/cashu-ts');
      const tokenString = getEncodedTokenV4({
        mint: mintUrl,
        proofs: proofsToSend.map(p => ({
          id: p.id || '',
          amount: p.amount,
          secret: p.secret || '',
          C: p.C || ''
        }))
      });

      // Record history for social context
      await createHistory.mutateAsync({
        direction: 'out',
        amount: amount.toString(),
        groupId: socialContext?.groupId,
        recipientPubkey: socialContext?.recipientPubkey,
        isNutzap: socialContext?.isNutzap,
        destroyedTokens: proofsToSend.map(p => `${p.C}-${p.secret}`),
      });

      return {
        token: tokenString,
        proofs: proofsToSend
      };
    } catch (error: any) {
      const message = error.message || 'Unknown error occurred';
      setError(`Failed to send token: ${message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Receive a token
   * @param token The encoded token string
   * @returns Received amount and proofs
   */
  const receiveToken = async (token: string): Promise<{ totalAmount: number; proofs: Proof[] }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Decode token
      const decodedToken = getDecodedToken(token);
      if (!decodedToken) {
        throw new Error('Invalid token format');
      }

      const { mint: mintUrl } = decodedToken;

      // Add mint if we don't have it
      await addMintIfNotExists(mintUrl);

      // Setup wallet for receiving
      const mint = new CashuMint(mintUrl);
      const wallet = new CashuWallet(mint);

      // Load mint keysets
      await wallet.loadMint();

      // Receive proofs from token
      const receivedProofs = await wallet.receive(token);
      const totalAmount = receivedProofs.reduce((sum, p) => sum + p.amount, 0);

      // Add proofs to store
      cashuStore.addProofs(receivedProofs, `receive-${Date.now()}`);

      // Record history
      await createHistory.mutateAsync({
        direction: 'in',
        amount: totalAmount.toString(),
        createdTokens: receivedProofs.map(p => `${p.C}-${p.secret}`),
      });

      return {
        totalAmount,
        proofs: receivedProofs
      };
    } catch (error: any) {
      const message = error.message || 'Unknown error occurred';
      setError(`Failed to receive token: ${message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const addMintIfNotExists = async (mintUrl: string) => {
    // Validate URL
    new URL(mintUrl);
    if (!wallet) {
      throw new Error('Wallet not found');
    }
    // Add mint to wallet
    createWallet({
      ...wallet,
      mints: [...wallet.mints, mintUrl],
    });
  };

  return {
    sendToken,
    receiveToken,
    isLoading,
    error,
    // Compatibility aliases for old interface
    isSendingToken: isLoading,
    isReceivingToken: isLoading,
    lastToken: null, // Not used in simplified version
    clearLastToken: () => {}, // Not used in simplified version
    cleanSpentProofs: {
      mutateAsync: async () => {},
      isPending: false
    }, // Simplified - not needed with automatic cleanup
  };
}