import { useState } from 'react';
import { useCashuStore } from '@/stores/cashuStore';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { CashuMint, CashuWallet, Proof, getDecodedToken, CheckStateEnum } from '@cashu/cashu-ts';
import { CashuToken } from '@/lib/cashu';
import { hashToCurve } from "@cashu/crypto/modules/common";
import { validateP2PKKeypair, deriveP2PKPubkey } from '@/lib/p2pk';

export function useCashuToken() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cashuStore = useCashuStore();
  const { wallet, createWallet, updateProofs } = useCashuWallet();

  const { createHistory } = useCashuHistory();

  /**
   * Generate a send token
   * @param mintUrl The URL of the mint to use
   * @param amount Amount to send in satoshis
   * @param p2pkPubkey The P2PK pubkey to lock the proofs to
   * @returns The encoded token string for regular tokens, or Proof[] for nutzap tokens
   */
  const sendToken = async (mintUrl: string, amount: number, p2pkPubkey?: string): Promise<Proof[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const mint = new CashuMint(mintUrl);
      const wallet = new CashuWallet(mint);

      // Load mint keysets
      await wallet.loadMint();

      // Get all proofs from store
      let proofs = await cashuStore.getMintProofs(mintUrl);

      const proofsAmount = proofs.reduce((sum, p) => sum + p.amount, 0);
      if (proofsAmount < amount) {
        throw new Error(`Not enough funds on mint ${mintUrl}`);
      }

      try {
        // Validate P2PK setup for sender's existing proofs
        if (cashuStore.privkey) {
          const senderP2PKPubkey = deriveP2PKPubkey(cashuStore.privkey);
          const isValid = validateP2PKKeypair(cashuStore.privkey, senderP2PKPubkey);
          // Validation result is available but not logged to reduce console spam
        }

        // For regular token, create a token string
        // Perform coin selection with proper P2PK handling
        const sendOptions: any = {};

        // If sending to a P2PK locked recipient, use the legacy format like Chorus
        if (p2pkPubkey) {
          sendOptions.pubkey = p2pkPubkey;
        }

        // Always provide sender's private key for witness creation
        if (cashuStore.privkey) {
          sendOptions.privkey = cashuStore.privkey;
        }

        const { keep: proofsToKeep, send: proofsToSend } = await wallet.send(amount, proofs, sendOptions);

        // Create new token for the proofs we're keeping
        if (proofsToKeep.length > 0) {
          const keepTokenData: CashuToken = {
            mint: mintUrl,
            proofs: proofsToKeep.map(p => ({
              id: p.id || '',
              amount: p.amount,
              secret: p.secret || '',
              C: p.C || ''
            }))
          };

          // update proofs
          await updateProofs({ mintUrl, proofsToAdd: keepTokenData.proofs, proofsToRemove: [...proofsToSend, ...proofs] });

          // Create history event
          await createHistory.mutateAsync({
            direction: 'out',
            amount: amount.toString(),
          });
        }
        return proofsToSend;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Check if error is "Token already spent"
        if (message.includes("Token already spent")) {
          console.log("Detected spent tokens, cleaning up and retrying...");

          // Clean spent proofs
          await cleanSpentProofs(mintUrl);

          // Get fresh proofs after cleanup
          proofs = await cashuStore.getMintProofs(mintUrl);

          // Check if we still have enough funds after cleanup
          const newProofsAmount = proofs.reduce((sum, p) => sum + p.amount, 0);
          if (newProofsAmount < amount) {
            throw new Error(`Not enough funds on mint ${mintUrl} after cleaning spent proofs`);
          }

          // Retry the send operation with fresh proofs using the same options
          const retrySendOptions: any = {};
          if (p2pkPubkey) {
            retrySendOptions.p2pk = {
              pubkey: p2pkPubkey
            };
          }
          if (cashuStore.privkey) {
            retrySendOptions.privkey = cashuStore.privkey;
          }

          const { keep: proofsToKeep, send: proofsToSend } = await wallet.send(amount, proofs, retrySendOptions);

          // Create new token for the proofs we're keeping
          if (proofsToKeep.length > 0) {
            const keepTokenData: CashuToken = {
              mint: mintUrl,
              proofs: proofsToKeep.map(p => ({
                id: p.id || '',
                amount: p.amount,
                secret: p.secret || '',
                C: p.C || ''
              }))
            };

            // update proofs
            await updateProofs({ mintUrl, proofsToAdd: keepTokenData.proofs, proofsToRemove: [...proofsToSend, ...proofs] });

            // Create history event
            await createHistory.mutateAsync({
              direction: 'out',
              amount: amount.toString(),
            });
          }
          return proofsToSend;
        }

        // Re-throw the error if it's not a "Token already spent" error
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(`Failed to generate token: ${message}`);
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
  }

  /**
   * Receive a token
   * @param token The encoded token string
   * @returns The received proofs
   */
  const receiveToken = async (token: string): Promise<Proof[]> => {
    setIsLoading(true);
    setError(null);

    try {
      // Decode token
      const decodedToken = getDecodedToken(token);
      if (!decodedToken) {
        throw new Error('Invalid token format');
      }

      const { mint: mintUrl } = decodedToken;

      // if we don't have the mintUrl yet, add it
      await addMintIfNotExists(mintUrl);

      // Setup wallet for receiving
      const mint = new CashuMint(mintUrl);
      const wallet = new CashuWallet(mint);

      // Load mint keysets
      await wallet.loadMint();

      // Receive proofs from token
      const receivedProofs = await wallet.receive(token);
      // Create token event in Nostr
      const receivedTokenData: CashuToken = {
        mint: mintUrl,
        proofs: receivedProofs.map(p => ({
          id: p.id || '',
          amount: p.amount,
          secret: p.secret || '',
          C: p.C || ''
        }))
      };

      try {
        // Attempt to create token in Nostr, but don't rely on the return value
        await updateProofs({ mintUrl, proofsToAdd: receivedTokenData.proofs, proofsToRemove: [] });
      } catch (err) {
        console.error('Error storing token in Nostr:', err);
      }

      // Create history event
      const totalAmount = receivedProofs.reduce((sum, p) => sum + p.amount, 0);
      await createHistory.mutateAsync({
        direction: 'in',
        amount: totalAmount.toString(),
      });

      return receivedProofs;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setError(`Failed to receive token: ${message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Analyze P2PK proofs to categorize them by type and spendability
   * @param mintUrl The URL of the mint to analyze
   * @returns Analysis breakdown of proof types and states
   */
  const analyzeP2PKProofs = async (mintUrl: string) => {
    const proofs = await cashuStore.getMintProofs(mintUrl);
    console.log(`[P2PK Analysis] Checking ${proofs.length} total proofs for mint: ${mintUrl}`);
    
    const analysis = {
      regularProofs: [] as Proof[],
      p2pkProofs: {
        spendable: [] as Proof[],
        unspendable: [] as Proof[],
        unknown: [] as Proof[]
      },
      totalCounts: { regular: 0, p2pk: 0, unspendable: 0 },
      debug: {
        p2pkFound: 0,
        regularFound: 0,
        detailedProofs: [] as any[]
      }
    };

    // Categorize proofs by type
    for (const proof of proofs) {
      // Enhanced P2PK detection - check multiple patterns
      const isP2PK = proof.secret?.startsWith('["P2PK",') || 
                     proof.secret?.includes('"P2PK"') ||
                     proof.secret?.startsWith('[["P2PK"');
      
      if (isP2PK) {
        analysis.debug.p2pkFound++;
        analysis.debug.detailedProofs.push({
          amount: proof.amount,
          secret: proof.secret?.substring(0, 50) + '...',
          id: proof.id?.substring(0, 16) + '...'
        });
        
        try {
          // Parse P2PK secret structure
          const secret = JSON.parse(proof.secret);
          if (Array.isArray(secret) && secret[0] === 'P2PK') {
            const p2pkData = secret[1];
            const locktime = p2pkData?.tags?.find((tag: any[]) => tag[0] === 'locktime')?.[1];
            
            console.log(`[P2PK Analysis] Found P2PK proof: ${proof.amount} sats, locktime: ${locktime}`);
            
            // Check if locktime has expired (making it unspendable)
            if (locktime && Date.now() / 1000 > locktime) {
              analysis.p2pkProofs.unspendable.push(proof);
              console.log(`[P2PK Analysis] Proof is expired (locktime: ${locktime})`);
            } else {
              analysis.p2pkProofs.spendable.push(proof);
              console.log(`[P2PK Analysis] Proof appears spendable`);
            }
          } else {
            analysis.p2pkProofs.unknown.push(proof);
            console.log(`[P2PK Analysis] Unknown P2PK format for proof: ${proof.amount} sats`);
          }
        } catch (error) {
          // If we can't parse the secret, mark as unknown
          analysis.p2pkProofs.unknown.push(proof);
          console.log(`[P2PK Analysis] Failed to parse P2PK secret for proof: ${proof.amount} sats`, error);
        }
      } else {
        analysis.regularProofs.push(proof);
        analysis.debug.regularFound++;
      }
    }

    // Calculate totals
    analysis.totalCounts.regular = analysis.regularProofs.length;
    analysis.totalCounts.p2pk = analysis.p2pkProofs.spendable.length + analysis.p2pkProofs.unknown.length;
    analysis.totalCounts.unspendable = analysis.p2pkProofs.unspendable.length;

    return analysis;
  };

  /**
   * Clean unspendable P2PK proofs without affecting regular proofs
   * @param mintUrl The URL of the mint to clean
   * @returns Array of removed proofs
   */
  const cleanUnspendableP2PKProofs = async (mintUrl: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const mint = new CashuMint(mintUrl);
      const wallet = new CashuWallet(mint);
      await wallet.loadMint();

      // Get user's P2PK public key for comparison
      const userP2PKPubkey = cashuStore.privkey ? deriveP2PKPubkey(cashuStore.privkey) : null;
      if (!userP2PKPubkey) {
        console.log(`[P2PK Cleanup] No private key available - cannot determine user's P2PK public key`);
        return [];
      }

      console.log(`[P2PK Cleanup] Starting cleanup for mint: ${mintUrl}`);
      console.log(`[P2PK Cleanup] User's P2PK pubkey: ${userP2PKPubkey}`);

      // Get only P2PK proofs with enhanced detection
      const allProofs = await cashuStore.getMintProofs(mintUrl);
      const p2pkProofs = allProofs.filter(p => 
        p.secret?.startsWith('["P2PK",') || 
        p.secret?.includes('"P2PK"') ||
        p.secret?.startsWith('[["P2PK"')
      );

      console.log(`[P2PK Cleanup] Found ${p2pkProofs.length} P2PK proofs out of ${allProofs.length} total proofs`);
      
      if (p2pkProofs.length === 0) {
        console.log(`[P2PK Cleanup] No P2PK proofs found`);
        return [];
      }

      // Log details of P2PK proofs found
      p2pkProofs.forEach(proof => {
        console.log(`[P2PK Cleanup] P2PK proof: ${proof.amount} sats, secret: ${proof.secret?.substring(0, 50)}...`);
      });

      // Check states of P2PK proofs only
      const proofStates = await wallet.checkProofsStates(p2pkProofs);
      console.log(`[P2PK Cleanup] Checked states for ${proofStates.length} P2PK proofs`);
      
      const unspendableProofs = p2pkProofs.filter((proof, index) => {
        const state = proofStates[index];
        
        console.log(`[P2PK Cleanup] Proof ${proof.amount} sats: state=${state.state}, witness=${state.witness}`);
        
        // Remove if spent or pending by mint
        if (state.state === CheckStateEnum.SPENT || state.state === CheckStateEnum.PENDING) {
          console.log(`[P2PK Cleanup] Marking as unspendable due to state: ${state.state}`);
          return true;
        }

        // Parse P2PK secret and check ownership
        try {
          const secret = JSON.parse(proof.secret);
          if (Array.isArray(secret) && secret[0] === 'P2PK') {
            const p2pkData = secret[1];
            
            // Check if locktime has expired
            const locktime = p2pkData?.tags?.find((tag: any[]) => tag[0] === 'locktime')?.[1];
            if (locktime && Date.now() / 1000 > locktime) {
              console.log(`[P2PK Cleanup] Marking as unspendable due to expired locktime: ${locktime}`);
              return true;
            }

            // **KEY ENHANCEMENT**: Check if this P2PK proof belongs to the current user
            const proofP2PKPubkey = p2pkData?.data;
            if (proofP2PKPubkey && proofP2PKPubkey !== userP2PKPubkey) {
              console.log(`[P2PK Cleanup] P2PK proof belongs to different pubkey: ${proofP2PKPubkey} (user: ${userP2PKPubkey})`);
              console.log(`[P2PK Cleanup] Marking as unspendable - user cannot unlock this P2PK proof`);
              return true;
            }

            // If there's no pubkey data or it's malformed, it's definitely unspendable
            if (!proofP2PKPubkey) {
              console.log(`[P2PK Cleanup] P2PK proof has no pubkey data - marking as unspendable`);
              return true;
            }

            // If we reach here, it's a valid P2PK proof for this user
            console.log(`[P2PK Cleanup] P2PK proof belongs to user - keeping`);
            return false;
          }
        } catch (error) {
          console.log(`[P2PK Cleanup] Failed to parse P2PK secret - marking as unspendable: ${error}`);
          return true;
        }

        return false;
      });

      console.log(`[P2PK Cleanup] Found ${unspendableProofs.length} unspendable P2PK proofs to remove`);
      
      if (unspendableProofs.length > 0) {
        const totalAmount = unspendableProofs.reduce((sum, p) => sum + p.amount, 0);
        console.log(`[P2PK Cleanup] Removing ${unspendableProofs.length} proofs totaling ${totalAmount} sats`);
        
        await updateProofs({ 
          mintUrl, 
          proofsToAdd: [], 
          proofsToRemove: unspendableProofs 
        });
      }

      return unspendableProofs;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[P2PK Cleanup] Error:`, error);
      setError(`Failed to clean P2PK proofs: ${message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cleanSpentProofs = async (mintUrl: string) => {
    setIsLoading(true);
    setError(null);

    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint);

    await wallet.loadMint();

    const proofs = await cashuStore.getMintProofs(mintUrl);

    const proofStates = await wallet.checkProofsStates(proofs);
    const spentProofsStates = proofStates.filter(
      (p) => p.state == CheckStateEnum.SPENT
    );
    const enc = new TextEncoder();
    const spentProofs = proofs.filter((p) =>
      spentProofsStates.find(
        (s) => s.Y == hashToCurve(enc.encode(p.secret)).toHex(true)
      )
    );

    await updateProofs({ mintUrl, proofsToAdd: [], proofsToRemove: spentProofs });

    return spentProofs;
  }

  return {
    sendToken,
    receiveToken,
    cleanSpentProofs,
    analyzeP2PKProofs,
    cleanUnspendableP2PKProofs,
    isLoading,
    error
  };
}