import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  CashuStore,
  CashuWalletStruct,
  CashuMintStruct,
} from './cashuStore';

// Cache for user-specific stores
const storeCache = new Map<string, any>();

/**
 * Hook that provides user-specific Cashu store
 * This ensures each user has isolated wallet data
 */
export function useUserCashuStore(userPubkey: string | undefined) {
  if (!userPubkey) {
    // Return a temporary store that doesn't persist if no user
    return {
      wallets: [],
      wallet: null,
      activeWalletId: null,
      mints: [],
      events: [],
      activeMintUrl: null,
      getTotalBalance: () => 0,
    };
  }

  return getUserCashuStore(userPubkey)();
}

/**
 * Get a user-specific Cashu store instance
 * Each user gets their own isolated Cashu wallet data
 */
function getUserCashuStore(userPubkey: string) {
  // Check cache first
  if (storeCache.has(userPubkey)) {
    return storeCache.get(userPubkey);
  }

  // Create user-specific store with isolated persistence
  const userStore = create<Partial<CashuStore>>()(
    persist(
      immer((set, get) => ({
        wallets: [],
        wallet: null,
        activeWalletId: null,
        mints: [],
        events: [],
        activeMintUrl: null,
        proofEventMap: new Map<string, string>(),
        pendingProofs: [],
        pendingProofEvents: [],
        mintQuotes: new Map(),
        meltQuotes: new Map(),

        // Utility methods that the LoginArea needs
        getTotalBalance: () => {
          const state = get();
          return (state.wallets || []).reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
        },

        addWallet: (wallet: CashuWalletStruct) => {
          set((state) => {
            if (!state.wallets) state.wallets = [];
            const existingIndex = state.wallets.findIndex(w => w.id === wallet.id);
            if (existingIndex >= 0) {
              state.wallets[existingIndex] = wallet;
            } else {
              state.wallets.push(wallet);
            }
          });
        },

        removeWallet: (walletId: string) => {
          set((state) => {
            if (state.wallets) {
              state.wallets = state.wallets.filter(w => w.id !== walletId);
            }
            if (state.activeWalletId === walletId) {
              state.activeWalletId = null;
              state.wallet = null;
            }
          });
        },

        updateWallet: (wallet: CashuWalletStruct) => {
          set((state) => {
            if (!state.wallets) return;
            const index = state.wallets.findIndex(w => w.id === wallet.id);
            if (index >= 0) {
              state.wallets[index] = wallet;
              if (state.activeWalletId === wallet.id) {
                state.wallet = wallet;
              }
            }
          });
        },

        setActiveWallet: (walletId: string | null) => {
          set((state) => {
            state.activeWalletId = walletId;
            state.wallet = walletId && state.wallets 
              ? state.wallets.find(w => w.id === walletId) || null 
              : null;
          });
        },

        privkey: undefined,
      })),
      {
        name: `cashu-store-${userPubkey}`, // User-specific storage key
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          wallets: state.wallets,
          wallet: state.wallet,
          activeWalletId: state.activeWalletId,
          mints: state.mints,
          activeMintUrl: state.activeMintUrl,
          events: state.events,
          pendingProofs: state.pendingProofs,
          pendingProofEvents: state.pendingProofEvents,
        }),
      }
    )
  );

  // Cache the store for this user
  storeCache.set(userPubkey, userStore);
  
  return userStore;
}

/**
 * Clear the store cache (useful for cleanup or testing)
 */
export function clearCashuStoreCache() {
  storeCache.clear();
}
