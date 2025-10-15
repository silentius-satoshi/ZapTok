import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SpendingHistoryEntry } from '@/lib/cashu';
import { bundleLog } from '@/lib/logBundler';

// ⚠️ DEPRECATED: This store is deprecated in favor of the official cashu-wallet pattern
// Use @/stores/transactionHistoryStore instead
// This file is kept for backwards compatibility during migration

// Define a pending transaction interface for lightning invoices
export interface PendingTransaction {
  id: string;
  direction: 'in' | 'out';
  amount: string;
  timestamp: number;
  status: 'pending';
  mintUrl: string;
  quoteId: string;
  paymentRequest: string;
}

interface TransactionHistoryStore {
  history: (SpendingHistoryEntry & { id: string })[];
  pendingTransactions: PendingTransaction[];
  transactions: Record<string, any[]>; // For backwards compatibility

  // Add a new history entry to the store
  addHistoryEntry: (entry: SpendingHistoryEntry & { id: string }) => void;
  // Add multiple history entries in one batch (skips duplicates)
  addHistoryEntries: (entries: (SpendingHistoryEntry & { id: string })[]) => void;

  // Add a pending transaction
  addPendingTransaction: (transaction: PendingTransaction) => void;

  // Remove a pending transaction by id
  removePendingTransaction: (id: string) => void;

  // Get pending transactions
  getPendingTransactions: () => PendingTransaction[];

  // Get history entries, optionally filtered by direction
  getHistoryEntries: (direction?: 'in' | 'out') => (SpendingHistoryEntry & { id: string })[];

  // Get combined history - both confirmed and pending
  getCombinedHistory: () => (SpendingHistoryEntry & { id: string } | PendingTransaction)[];

  // Clear history entries for a specific user
  clearHistory: (pubkey?: string) => void;

  // Backwards compatibility methods
  getTransactions: (pubkey: string) => any[];
  setTransactions: (pubkey: string, transactions: any[]) => void;
}

// Store cache to avoid creating multiple stores for the same user
const userTransactionHistoryStores = new Map<string, any>();

/**
 * @deprecated Use useTransactionHistoryStore from @/stores/transactionHistoryStore instead
 * This hook is kept for backwards compatibility during migration.
 * The new official cashu-wallet pattern uses a global transaction store.
 */
export function useUserTransactionHistoryStore(userPubkey?: string) {
  console.warn('⚠️ useUserTransactionHistoryStore is deprecated. Use useTransactionHistoryStore instead.');

  if (!userPubkey) {
    // Return empty store for logged-out users
    return {
      history: [],
      pendingTransactions: [],
      transactions: {},
      addHistoryEntry: () => {},
      addHistoryEntries: () => {},
      addPendingTransaction: () => {},
      removePendingTransaction: () => {},
      getPendingTransactions: () => [],
      getHistoryEntries: () => [],
      getCombinedHistory: () => [],
      clearHistory: () => {},
      getTransactions: () => [],
      setTransactions: () => {},
    };
  }

  return getUserTransactionHistoryStore(userPubkey)();
}

/**
 * Get or create a user-specific transaction history store
 */
function getUserTransactionHistoryStore(userPubkey: string) {
  // Check if we already have a store for this user
  if (userTransactionHistoryStores.has(userPubkey)) {
    return userTransactionHistoryStores.get(userPubkey);
  }

  // Create a new user-specific store with isolated persistence
  const userStore = create<TransactionHistoryStore>()(
    persist(
      (set, get) => ({
        history: [],
        pendingTransactions: [],
        transactions: {},

        addHistoryEntry(entry) {
          // Check if entry already exists
          const exists = get().history.some(item => item.id === entry.id);
          if (!exists) {
            set(state => ({
              history: [entry, ...state.history]
            }));
          }
        },

        addHistoryEntries(entries) {
          if (!entries.length) return;
          const existingIds = new Set(get().history.map(h => h.id));
          const deduped = entries.filter(e => !existingIds.has(e.id));
          if (!deduped.length) return;
          set(state => ({
            history: [...deduped, ...state.history]
          }));
        },

        addPendingTransaction(transaction) {
          // Check if transaction already exists
          const exists = get().pendingTransactions.some(item => item.id === transaction.id);
          if (!exists) {
            set(state => ({
              pendingTransactions: [transaction, ...state.pendingTransactions]
            }));
          }
        },

        removePendingTransaction(id) {
          set(state => ({
            pendingTransactions: state.pendingTransactions.filter(tx => tx.id !== id)
          }));
        },

        getPendingTransactions() {
          return get().pendingTransactions;
        },

        getHistoryEntries(direction) {
          const history = get().history;

          if (!direction) {
            // Return all entries sorted by timestamp (newest first)
            return [...history].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          }

          // Return filtered entries sorted by timestamp
          return history
            .filter(entry => entry.direction === direction)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        },

        getCombinedHistory() {
          const history = get().history;
          const pending = get().pendingTransactions;

          // Combine and sort by timestamp (newest first)
          return [...history, ...pending].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        },

        clearHistory() {
          // Clear all history for this user
          set({ history: [], pendingTransactions: [] });
        },

        // Backwards compatibility methods
        getTransactions(pubkey) {
          return get().transactions[pubkey] || [];
        },

        setTransactions(pubkey, transactions) {
          set(state => ({
            transactions: {
              ...state.transactions,
              [pubkey]: transactions
            }
          }));
        },
      }),
      {
        name: `transaction-history-store-${userPubkey}`, // User-specific storage key
        storage: createJSONStorage(() => localStorage),
      },
    ),
  );

  // Cache the store
  userTransactionHistoryStores.set(userPubkey, userStore);

  if (import.meta.env.DEV) {
    bundleLog('userTransactionHistory', `📊 Created user-specific transaction history store for ${userPubkey.slice(0, 8)}...`);
  }

  return userStore;
}
