import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useCashuStore } from '@/stores/cashuStore';
import { CashuMint, CashuWallet, Proof } from '@cashu/cashu-ts';
import { useCallback, useEffect } from 'react';
import { calculateBalance } from '@/lib/cashu';

export const useCashuWallet = () => {
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const {
    mints,
    proofs,
    privkey,
    activeMintUrl,
    addMint,
    setPrivkey,
    getMint,
    addProofs,
    removeProofs,
    getMintProofs,
    setMintInfo,
    setKeysets,
    setKeys,
    getActiveMintUrl,
    setActiveMintUrl,
  } = useCashuStore();

  // Initialize private key if needed
  useEffect(() => {
    if (user && !privkey) {
      // Generate a random private key using crypto.getRandomValues
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const generatedPrivkey = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      setPrivkey(generatedPrivkey);
    }
  }, [user, privkey, setPrivkey]);

  // Get wallet for specific mint
  const getWallet = useCallback(async (mintUrl: string) => {
    if (!privkey) {
      throw new Error('No private key available');
    }

    // Ensure mint is added to store
    addMint(mintUrl);

    // Create mint and wallet instances
    const mint = new CashuMint(mintUrl);

    // Convert hex privkey to Uint8Array for wallet
    const privkeyBytes = new Uint8Array(privkey.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
    const wallet = new CashuWallet(mint, { bip39seed: privkeyBytes });

    // Get and cache mint info if not already cached
    const mintData = getMint(mintUrl);
    if (!mintData.mintInfo) {
      const info = await mint.getInfo();
      setMintInfo(mintUrl, info);
    }

    // Get and cache keysets if not already cached
    if (!mintData.keysets) {
      const keysets = await mint.getKeySets();
      setKeysets(mintUrl, keysets.keysets);
    }

    // Get and cache keys if not already cached
    if (!mintData.keys) {
      const keysets = await mint.getKeySets();
      const allKeys = [];
      for (const keyset of keysets.keysets) {
        const keys = await mint.getKeys(keyset.id);
        allKeys.push({ [keyset.id]: keys });
      }
      setKeys(mintUrl, allKeys);
    }

    return { mint, wallet };
  }, [privkey, addMint, getMint, setMintInfo, setKeysets, setKeys]);

  // Get the active wallet
  const getActiveWallet = useCallback(async () => {
    const activeUrl = getActiveMintUrl();
    if (!activeUrl) {
      // Default to first mint or add a default mint
      if (mints.length > 0) {
        setActiveMintUrl(mints[0].url);
        return getWallet(mints[0].url);
      } else {
        // Add default mint
        const defaultMintUrl = 'https://mint.minibits.cash/Bitcoin';
        addMint(defaultMintUrl);
        setActiveMintUrl(defaultMintUrl);
        return getWallet(defaultMintUrl);
      }
    }
    return getWallet(activeUrl);
  }, [getActiveMintUrl, mints, setActiveMintUrl, getWallet, addMint]);

  // Get proofs for specific mint
  const getProofsForMint = useCallback(async (mintUrl: string): Promise<Proof[]> => {
    return getMintProofs(mintUrl);
  }, [getMintProofs]);

  // Get total balance across all mints
  const getTotalBalance = useCallback(() => {
    return calculateBalance(proofs);
  }, [proofs]);

  // Get balance for specific mint
  const getMintBalance = useCallback(async (mintUrl: string) => {
    const mintProofs = await getProofsForMint(mintUrl);
    return calculateBalance(mintProofs);
  }, [getProofsForMint]);

  // Check if wallet is ready (has private key)
  const isReady = Boolean(privkey && user);

  return {
    // State
    mints,
    proofs,
    privkey,
    activeMintUrl,
    isReady,

    // Methods
    getWallet,
    getActiveWallet,
    getProofsForMint,
    getTotalBalance,
    getMintBalance,
    addProofs,
    removeProofs,

    // Mint management
    addMint,
    setActiveMintUrl,

    // Legacy compatibility aliases
    wallet: null, // Will need to be populated properly
    isLoading: false,
    createWallet: () => {}, // Stub for legacy compatibility
    walletError: null,
    tokensError: null,
    updateProofs: () => {}, // Stub for legacy compatibility
    isWalletLoading: false,
    isTokensLoading: false,
  };
};