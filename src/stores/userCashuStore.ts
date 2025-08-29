import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Proof } from '@cashu/cashu-ts';
import type {
  CashuStore,
  CashuWalletStruct,
  CashuMintStruct,
} from './cashuStore';

// Cache for user-specific stores
const storeCache = new Map<string, any>();

// Single store instance for when no user is logged in
const defaultStoreInstance = create<Partial<CashuStore>>(() => ({
  wallets: [],
  wallet: null,
  activeWalletId: null,
  mints: [],
  events: [],
  activeMintUrl: null,
  proofEventMap: new Map(),
  pendingProofs: [],
  pendingProofEvents: [],
  mintQuotes: new Map(),
  meltQuotes: new Map(),
  getTotalBalance: () => 0,
  addWallet: () => {},
  removeWallet: () => {},
  updateWallet: () => {},
  setActiveWallet: () => {},
  addMint: () => {},
  updateMint: () => {},
  addEvent: () => {},
  updateEvent: () => {},
  removeEvent: () => {},
  setActiveMintUrl: () => {},
  storeProofs: () => {},
  spendProofs: () => {},
  getAvailableProofs: () => [],
  clearAllData: () => {},
  addPendingProofEvent: () => {},
  removePendingProofEvent: () => {},
  clearPendingProofEvents: () => {},
  addMintQuote: () => {},
  getMintQuote: () => undefined as any,
  removeMintQuote: () => {},
  addMeltQuote: () => {},
  getMeltQuote: () => undefined as any,
  removeMeltQuote: () => {},
}));

/**
 * Hook that provides user-specific Cashu store
 * This ensures each user has isolated wallet data
 */
export function useUserCashuStore(userPubkey: string | undefined) {
  // Create a single hook call that handles both cases
  const store = userPubkey ? getUserCashuStore(userPubkey) : defaultStoreInstance;

  // Always call the store hook consistently
  return store();
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

        addProofs: (proofs: Proof[], eventId: string) => {
          set((state) => {
            // Check if we've already processed this event
            const existingEventProofs = Array.from(state.proofEventMap?.entries() || [])
              .filter(([_, eid]) => eid === eventId)
              .map(([secret, _]) => secret);

            if (existingEventProofs.length > 0) {
              return; // Already processed this event
            }

            // Filter out proofs that already exist in any wallet
            const newProofs = proofs.filter(proof => {
              const alreadyExists = (state.wallets || []).some(wallet =>
                wallet.proofs.some(existingProof => existingProof.secret === proof.secret)
              ) || (state.pendingProofs || []).some(pendingProof => pendingProof.secret === proof.secret);
              return !alreadyExists;
            });

            if (newProofs.length === 0) return;

            // Ensure proofEventMap exists
            if (!state.proofEventMap) state.proofEventMap = new Map();

            // Map each new proof to its event ID
            newProofs.forEach(proof => {
              if (state.proofEventMap) {
                state.proofEventMap.set(proof.secret, eventId);
              }
            });

            // Find wallet that can store these proofs (for now, use the first wallet)
            const wallet = (state.wallets || [])[0];
            if (wallet) {
              wallet.proofs.push(...newProofs);
              wallet.balance = wallet.proofs.reduce((sum, p) => sum + p.amount, 0);
              wallet.lastUpdated = Date.now();
            } else {
              // Store proofs temporarily until a wallet is created
              if (!state.pendingProofs) state.pendingProofs = [];
              if (!state.pendingProofEvents) state.pendingProofEvents = [];
              state.pendingProofs.push(...newProofs);
              state.pendingProofEvents.push(...newProofs.map(() => eventId));
            }
          });
        },

        setProofEventId: (proof: Proof, eventId: string) => {
          set((state) => {
            if (!state.proofEventMap) state.proofEventMap = new Map();
            state.proofEventMap.set(proof.secret, eventId);
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
