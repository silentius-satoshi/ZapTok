// NIP-60 compliant Cashu wallet hook
// Replaces the localStorage-based useCashu with Nostr event-driven implementation

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { NIP60WalletManager, type NostrInterface as NIP60NostrInterface } from '@/lib/nip60-wallet';
import { createNostrAdapter } from '@/lib/nwc-client'; // Reuse the adapter pattern
import {
  type TokenEventContent,
  type HistoryEventContent,
  type NIP60Wallet,
  groupProofsByMint
} from '@/lib/nip60-types';
import { CASHU_MINTS } from '@/lib/cashu-types';
import { CashuClient, isValidMintUrl } from '@/lib/cashu-client';
import { useNIP87MintDiscovery, type DiscoveredMint } from './useNIP87MintDiscovery';

interface UseNIP60CashuResult {
  // Wallet state
  wallets: NIP60CashuWallet[];
  activeWallet: string | null;
  currentWallet: NIP60CashuWallet | null;
  isLoading: boolean;
  error: string | null;

  // Wallet management
  createWallet: (mints: string[]) => Promise<string>;
  addMintToWallet: (walletId: string, mintUrl: string) => Promise<void>;
  setActiveWallet: (walletId: string) => void;
  refreshWallet: (walletId: string) => Promise<void>;
  cleanupWallet: (walletId: string) => Promise<void>;
  removeMintFromWallet: (walletId: string, mintUrl: string) => Promise<void>;

  // Well-known mints
  addWellKnownMint: (mintKey: keyof typeof CASHU_MINTS) => Promise<string>;

  // NIP-87 dynamic mint discovery
  discoveredMints: DiscoveredMint[];
  recommendedMints: DiscoveredMint[];
  addDiscoveredMint: (mint: DiscoveredMint) => Promise<string>;
  refreshMintDiscovery: () => Promise<void>;

  // Token operations
  receiveTokens: (tokenString: string, walletId?: string) => Promise<void>;
  sendTokens: (amount: number, walletId?: string, memo?: string) => Promise<string>;

  // Utility functions
  testConnection: (walletId: string) => Promise<boolean>;
  getBalance: (walletId?: string) => number;
  getProofsByMint: (walletId?: string) => Record<string, object[]>;
}

export interface NIP60CashuWallet {
  id: string;
  mints: string[];
  tokens: TokenEventContent[];
  history: HistoryEventContent[];
  balance: number;
  lastUpdated: number;
  isLoading?: boolean;
}

export function useNIP60Cashu(): UseNIP60CashuResult {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  // NIP-87 mint discovery
  const {
    cashuMints: discoveredMints,
    recommendations,
    refreshDiscovery
  } = useNIP87MintDiscovery();

  // Get recommended mints (mints that have recommendations from users we follow)
  const recommendedMints = discoveredMints.filter(mint => 
    recommendations.some(rec => rec.recommendedMint.pubkey === mint.pubkey)
  );

  const [wallets, setWallets] = useState<NIP60CashuWallet[]>([]);
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize wallet manager using useMemo to prevent recreation on every render
  const walletManager = useMemo(() => {
    if (!user) return null;

    const createNIP60Adapter = (nostrInstance: unknown): NIP60NostrInterface => {
      const baseAdapter = createNostrAdapter(nostrInstance as Parameters<typeof createNostrAdapter>[0]);
      return {
        ...baseAdapter,
        event: async (event: Record<string, unknown>) => {
          const result = await baseAdapter.event(event);
          return result; // Return the event itself to match NIP60 interface
        }
      };
    };

    return new NIP60WalletManager(user, createNIP60Adapter(nostr));
  }, [user, nostr]);

  const currentWallet = wallets.find(w => w.id === activeWallet) || null;

  // Load wallets on component mount and when user changes
  useEffect(() => {
    if (!user || !walletManager) return;

    const loadWallets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Wallet loading timed out after 10 seconds')), 10000)
        );

        const walletsPromise = walletManager.getWallets();

        const nip60Wallets = await Promise.race([walletsPromise, timeoutPromise]) as NIP60Wallet[];

        const convertedWallets: NIP60CashuWallet[] = nip60Wallets.map(w => ({
          id: w.id,
          mints: w.mints,
          tokens: w.tokens,
          history: w.history,
          balance: w.balance,
          lastUpdated: w.lastUpdated
        }));

        setWallets(convertedWallets);

        // Set first wallet as active if none selected (only check current activeWallet state)
        setActiveWallet(current => {
          if (!current && convertedWallets.length > 0) {
            return convertedWallets[0].id;
          }
          return current;
        });
      } catch (err) {
        console.error('Failed to load NIP-60 wallets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load wallets');
      } finally {
        setIsLoading(false);
      }
    };

    loadWallets();
  }, [user, walletManager]);

  /**
   * Create a new NIP-60 wallet
   */
  const createWallet = useCallback(async (mints: string[]): Promise<string> => {
    if (!user || !walletManager) {
      throw new Error('User must be logged in to create wallets');
    }

    console.log('useNIP60Cashu: createWallet called with mints:', mints);
    setError(null);
    try {
      console.log('useNIP60Cashu: Calling walletManager.createWallet...');
      const walletId = await walletManager.createWallet(mints);
      console.log('useNIP60Cashu: Wallet created with ID:', walletId);

      // Refresh wallets list
      console.log('useNIP60Cashu: Refreshing wallets list...');
      const nip60Wallets = await walletManager.getWallets();
      const convertedWallets: NIP60CashuWallet[] = nip60Wallets.map((w: NIP60Wallet) => ({
        id: w.id,
        mints: w.mints,
        tokens: w.tokens,
        history: w.history,
        balance: w.balance,
        lastUpdated: w.lastUpdated
      }));

      console.log('useNIP60Cashu: Converted wallets:', convertedWallets);
      setWallets(convertedWallets);

      // Set as active wallet if it's the first one
      if (convertedWallets.length === 1) {
        setActiveWallet(walletId);
      }

      return walletId;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create wallet';
      console.error('useNIP60Cashu: createWallet error:', errorMsg, err);
      setError(errorMsg);
      throw err;
    }
  }, [user, walletManager]);

  /**
   * Add a well-known mint to create a wallet
   */
  const addWellKnownMint = useCallback(async (mintKey: keyof typeof CASHU_MINTS): Promise<string> => {
    const mintUrl = CASHU_MINTS[mintKey];
    return await createWallet([mintUrl]);
  }, [createWallet]);

  /**
   * Add a mint to an existing wallet
   */
  const addMintToWallet = useCallback(async (walletId: string, mintUrl: string): Promise<void> => {
    if (!user || !walletManager) {
      throw new Error('User must be logged in to modify wallets');
    }

    if (!isValidMintUrl(mintUrl)) {
      throw new Error('Invalid mint URL');
    }

    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.mints.includes(mintUrl)) {
      throw new Error('Mint already added to wallet');
    }

    setError(null);
    try {
      // Create new wallet with additional mint
      // Note: NIP-60 wallets are replaceable, so we create a new one
      const newMints = [...wallet.mints, mintUrl];
      await createWallet(newMints);

      // The createWallet function will refresh the wallets list
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add mint to wallet';
      setError(errorMsg);
      throw err;
    }
  }, [user, walletManager, wallets, createWallet]);

  /**
   * Refresh a specific wallet's data
   */
  const refreshWallet = useCallback(async (walletId: string): Promise<void> => {
    if (!user || !walletManager) {
      throw new Error('User must be logged in');
    }

    // Mark wallet as loading
    setWallets(prev => prev.map(w =>
      w.id === walletId ? { ...w, isLoading: true } : w
    ));

    setError(null);
    try {
      // Reload all wallets to get fresh data
      const nip60Wallets = await walletManager.getWallets();
      const convertedWallets: NIP60CashuWallet[] = nip60Wallets.map(w => ({
        id: w.id,
        mints: w.mints,
        tokens: w.tokens,
        history: w.history,
        balance: w.balance,
        lastUpdated: w.lastUpdated
      }));

      setWallets(convertedWallets);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refresh wallet';
      setError(errorMsg);
      throw err;
    }
  }, [user, walletManager]);

  /**
   * Receive Cashu tokens
   */
  const receiveTokens = useCallback(async (tokenString: string, walletId?: string): Promise<void> => {
    if (!user || !walletManager) {
      throw new Error('User must be logged in to receive tokens');
    }

    const targetWalletId = walletId || activeWallet;
    if (!targetWalletId) {
      throw new Error('No wallet selected');
    }

    setError(null);
    try {
      // Parse token (this would need to be implemented based on Cashu token format)
      // For now, assuming we have parsed proofs and mint URL
      const parsedToken = JSON.parse(tokenString); // Placeholder - implement proper parsing
      const { proofs, mint } = parsedToken;

      await walletManager.receiveTokens(proofs, mint);

      // Refresh wallet data
      if (targetWalletId) {
        await refreshWallet(targetWalletId);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to receive tokens';
      setError(errorMsg);
      throw err;
    }
  }, [user, walletManager, activeWallet, refreshWallet]);

  /**
   * Send Cashu tokens
   */
  const sendTokens = useCallback(async (
    amount: number,
    walletId?: string,
    memo?: string
  ): Promise<string> => {
    if (!user || !walletManager) {
      throw new Error('User must be logged in to send tokens');
    }

    const targetWalletId = walletId || activeWallet;
    const wallet = wallets.find(w => w.id === targetWalletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    setError(null);
    try {
      // Find mint with sufficient balance
      const proofsbyMint = groupProofsByMint(wallet.tokens);
      let selectedMint = '';

      for (const [mint, proofs] of Object.entries(proofsbyMint)) {
        const mintBalance = proofs.reduce((sum, proof) => sum + proof.amount, 0);
        if (mintBalance >= amount) {
          selectedMint = mint;
          break;
        }
      }

      if (!selectedMint) {
        throw new Error('No single mint has sufficient balance');
      }

      // Get token event IDs for spending
      const tokenEventIds = wallet.tokens
        .filter(token => token.mint === selectedMint)
        .map((_, index) => `token-${targetWalletId}-${index}`); // Placeholder - need actual event IDs

      await walletManager.spendTokens(amount, selectedMint, tokenEventIds);

      // Refresh wallet data
      if (targetWalletId) {
        await refreshWallet(targetWalletId);
      }

      // Return token string (placeholder implementation)
      return JSON.stringify({
        token: [{
          mint: selectedMint,
          proofs: proofsbyMint[selectedMint].slice(0, Math.ceil(amount / 100)) // Simplified
        }],
        memo
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send tokens';
      setError(errorMsg);
      throw err;
    }
  }, [user, walletManager, activeWallet, wallets, refreshWallet]);

  /**
   * Test connection to mint
   */
  const testConnection = useCallback(async (walletId: string): Promise<boolean> => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet || wallet.mints.length === 0) {
      return false;
    }

    try {
      // Test connection to first mint
      const client = new CashuClient({ url: wallet.mints[0] });
      await client.getMintInfo();
      return true;
    } catch {
      return false;
    }
  }, [wallets]);

  /**
   * Get wallet balance
   */
  const getBalance = useCallback((walletId?: string): number => {
    const targetWalletId = walletId || activeWallet;
    const wallet = wallets.find(w => w.id === targetWalletId);
    return wallet?.balance || 0;
  }, [wallets, activeWallet]);

  /**
   * Get proofs grouped by mint
   */
  const getProofsByMint = useCallback((walletId?: string): Record<string, object[]> => {
    const targetWalletId = walletId || activeWallet;
    const wallet = wallets.find(w => w.id === targetWalletId);
    return wallet ? groupProofsByMint(wallet.tokens) : {};
  }, [wallets, activeWallet]);

  /**
   * Cleanup wallet by removing spent tokens and consolidating data
   */
  const cleanupWallet = useCallback(async (walletId: string): Promise<void> => {
    if (!user || !walletManager) {
      throw new Error('User must be logged in to cleanup wallet');
    }

    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    setError(null);
    try {
      // Mark wallet as loading
      setWallets(prev => prev.map(w =>
        w.id === walletId ? { ...w, isLoading: true } : w
      ));

      // Simply refresh the wallet data which will automatically filter out spent tokens
      // due to the getCurrentTokens implementation in walletManager
      await refreshWallet(walletId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cleanup wallet';
      setError(errorMsg);
      throw err;
    }
  }, [user, walletManager, wallets, refreshWallet]);

  /**
   * Remove a mint from the wallet by creating a new wallet without that mint
   */
  const removeMintFromWallet = useCallback(async (walletId: string, mintUrl: string): Promise<void> => {
    if (!user || !walletManager) {
      throw new Error('User must be logged in to modify wallets');
    }

    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (!wallet.mints.includes(mintUrl)) {
      throw new Error('Mint not found in wallet');
    }

    if (wallet.mints.length === 1) {
      throw new Error('Cannot remove the last mint from a wallet');
    }

    setError(null);
    try {
      // Create new wallet without the specified mint
      const newMints = wallet.mints.filter(mint => mint !== mintUrl);
      
      // Check if there are any tokens for this mint
      const hasTokensForMint = wallet.tokens.some(token => token.mint === mintUrl);
      
      if (hasTokensForMint) {
        throw new Error('Cannot remove mint with existing tokens. Spend or transfer tokens first.');
      }

      await createWallet(newMints);

      // The createWallet function will refresh the wallets list
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove mint from wallet';
      setError(errorMsg);
      throw err;
    }
  }, [user, walletManager, wallets, createWallet]);

  /**
   * Add a discovered mint from NIP-87 to create a wallet
   */
  const addDiscoveredMint = useCallback(async (mint: DiscoveredMint): Promise<string> => {
    if (mint.type !== 'cashu') {
      throw new Error('Only Cashu mints are supported in this wallet');
    }
    return await createWallet([mint.url]);
  }, [createWallet]);

  /**
   * Refresh NIP-87 mint discovery
   */
  const refreshMintDiscovery = useCallback(async (): Promise<void> => {
    try {
      await refreshDiscovery();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refresh mint discovery';
      setError(errorMsg);
      throw err;
    }
  }, [refreshDiscovery]);

  return {
    // State
    wallets,
    activeWallet,
    currentWallet,
    isLoading,
    error,

    // Actions
    createWallet,
    addMintToWallet,
    setActiveWallet,
    refreshWallet,
    cleanupWallet,
    removeMintFromWallet,
    addWellKnownMint,
    addDiscoveredMint,
    refreshMintDiscovery,
    receiveTokens,
    sendTokens,
    testConnection,
    getBalance,
    getProofsByMint,

    // NIP-87 discovered mints
    discoveredMints,
    recommendedMints
  };
}
