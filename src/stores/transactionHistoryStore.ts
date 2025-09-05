import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SpendingHistoryEntry } from '@/lib/cashu';

// Transaction grouping configuration
const TRANSACTION_GROUP_WINDOW_MS = 30 * 1000; // 30 seconds
const AMOUNT_VARIANCE_THRESHOLD = 0; // Exact amount match for grouping

interface TransactionGroup {
  id: string;
  direction: 'in' | 'out';
  amount: string;
  timestamp: number;
  type: 'nutzap' | 'mint' | 'melt' | 'send' | 'receive';
  count: number; // Number of individual transactions grouped
  events: string[]; // Event IDs that make up this group
  createdTokens?: string[];
  destroyedTokens?: string[];
  redeemedTokens?: string[];
}

/**
 * Groups related transactions to eliminate duplicates
 */
function groupTransactions(
  transactions: (SpendingHistoryEntry & { id: string })[]
): (SpendingHistoryEntry & { id: string })[] {
  if (transactions.length === 0) return [];

  // Sort transactions by timestamp (newest first)
  const sorted = [...transactions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const groups: TransactionGroup[] = [];
  const processed = new Set<string>();

  for (const tx of sorted) {
    if (processed.has(tx.id)) continue;

    // Determine transaction type based on tokens and amount patterns
    const type = determineTransactionType(tx);

    // Find existing group this transaction could belong to
    const existingGroup = groups.find(group =>
      canGroupTransactions(group, tx, type)
    );

    if (existingGroup) {
      // Add to existing group
      existingGroup.count += 1;
      existingGroup.events.push(tx.id);

      // Merge token arrays
      if (tx.createdTokens) {
        existingGroup.createdTokens = [...(existingGroup.createdTokens || []), ...tx.createdTokens];
      }
      if (tx.destroyedTokens) {
        existingGroup.destroyedTokens = [...(existingGroup.destroyedTokens || []), ...tx.destroyedTokens];
      }
      if (tx.redeemedTokens) {
        existingGroup.redeemedTokens = [...(existingGroup.redeemedTokens || []), ...tx.redeemedTokens];
      }

      // Update timestamp to latest
      if ((tx.timestamp || 0) > existingGroup.timestamp) {
        existingGroup.timestamp = tx.timestamp || 0;
      }
    } else {
      // Create new group
      groups.push({
        id: tx.id, // Use first transaction ID as group ID
        direction: tx.direction,
        amount: tx.amount,
        timestamp: tx.timestamp || 0,
        type,
        count: 1,
        events: [tx.id],
        createdTokens: tx.createdTokens ? [...tx.createdTokens] : [],
        destroyedTokens: tx.destroyedTokens ? [...tx.destroyedTokens] : [],
        redeemedTokens: tx.redeemedTokens ? [...tx.redeemedTokens] : []
      });
    }

    processed.add(tx.id);
  }

  // Convert groups back to transaction format
  return groups.map(group => ({
    id: group.id,
    direction: group.direction,
    amount: group.amount,
    timestamp: group.timestamp,
    createdTokens: group.createdTokens,
    destroyedTokens: group.destroyedTokens,
    redeemedTokens: group.redeemedTokens,
    // Add metadata about grouping for debugging
    _grouped: group.count > 1,
    _groupCount: group.count,
    _groupType: group.type
  } as any));
}

/**
 * Determines transaction type based on token patterns
 */
function determineTransactionType(tx: SpendingHistoryEntry): 'nutzap' | 'mint' | 'melt' | 'send' | 'receive' {
  // Nutzap patterns
  if (tx.redeemedTokens && tx.redeemedTokens.length > 0) {
    return 'nutzap';
  }

  // Mint pattern: created tokens with no destroyed tokens
  if (tx.createdTokens && tx.createdTokens.length > 0 &&
      (!tx.destroyedTokens || tx.destroyedTokens.length === 0)) {
    return 'mint';
  }

  // Melt pattern: destroyed tokens with no created tokens
  if (tx.destroyedTokens && tx.destroyedTokens.length > 0 &&
      (!tx.createdTokens || tx.createdTokens.length === 0)) {
    return 'melt';
  }

  // Send/receive patterns
  if (tx.direction === 'out') {
    return 'send';
  } else {
    return 'receive';
  }
}

/**
 * Checks if two transactions can be grouped together
 */
function canGroupTransactions(
  group: TransactionGroup,
  tx: SpendingHistoryEntry & { id: string },
  txType: string
): boolean {
  // Must be same type
  if (group.type !== txType) return false;

  // Must be same direction
  if (group.direction !== tx.direction) return false;

  // Must be same amount (for now - could allow variance for different use cases)
  if (group.amount !== tx.amount) return false;

  // Must be within time window
  const timeDiff = Math.abs((tx.timestamp || 0) - group.timestamp);
  if (timeDiff > TRANSACTION_GROUP_WINDOW_MS / 1000) return false; // Convert to seconds

  // Special grouping rules for nutzaps
  if (txType === 'nutzap') {
    // Group nutzap redemptions that happen close together
    return true;
  }

  return true;
}

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

export const useTransactionHistoryStore = create<TransactionHistoryStore>()(
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

        // Apply transaction grouping to eliminate duplicates
        const groupedHistory = groupTransactions(history);

        if (!direction) {
          // Return all entries sorted by timestamp (newest first)
          return [...groupedHistory].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }

        // Return filtered entries sorted by timestamp
        return groupedHistory
          .filter(entry => entry.direction === direction)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      },

      getCombinedHistory() {
        const history = get().history;
        const pending = get().pendingTransactions;

        // Apply transaction grouping to history before combining
        const groupedHistory = groupTransactions(history);

        // Combine and sort by timestamp (newest first)
        return [...groupedHistory, ...pending].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      },

      clearHistory() {
        // Currently just clear all history
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
    { name: 'cashu-history' },
  ),
)