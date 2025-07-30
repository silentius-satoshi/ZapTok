import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';
import { useTransactionHistoryStore } from '@/stores/transactionHistoryStore';
import type { NostrEvent } from 'nostr-tools';

export interface SpendingHistoryEntry {
  direction: 'in' | 'out';
  amount: string;
  timestamp?: number;
}

export interface CashuTransaction {
  id: string;
  type: 'mint' | 'melt' | 'send' | 'receive' | 'nutzap_send' | 'nutzap_receive';
  amount: number;
  mintUrl: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  counterparty?: string; // pubkey for nutzaps
  originalEvent?: NostrEvent;
}

interface UseCashuHistoryResult {
  transactions: CashuTransaction[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  createHistory: (historyEntry: SpendingHistoryEntry) => Promise<NostrEvent>;
  isCreating: boolean;
}

/**
 * Hook to fetch and manage Cashu transaction history
 */
export function useCashuHistory(): UseCashuHistoryResult {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const historyStore = useTransactionHistoryStore();
  const queryClient = useQueryClient();

  const createHistoryMutation = useMutation({
    mutationFn: async (historyEntry: SpendingHistoryEntry) => {
      if (!user) throw new Error('User not authenticated');

      const event = await user.signer.signEvent({
        kind: CASHU_EVENT_KINDS.HISTORY,
        content: JSON.stringify(historyEntry),
        tags: [
          ['direction', historyEntry.direction],
          ['amount', historyEntry.amount],
        ],
        created_at: Math.floor(Date.now() / 1000),
      });

      await nostr.event(event);
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashu', 'history'] });
    },
  });

  const {
    data: transactions = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['cashu', 'history', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not authenticated');

      // Check if we have cached transactions
      const cachedTransactions = historyStore.getTransactions(user.pubkey);
      if (cachedTransactions.length > 0) {
        return cachedTransactions;
      }

      // Fetch transaction history events from Nostr
      const events = await nostr.query([
        {
          kinds: [CASHU_EVENT_KINDS.TRANSACTION],
          authors: [user.pubkey],
          limit: 100
        }
      ], { signal });

      // Parse transaction events
      const parsedTransactions: CashuTransaction[] = [];

      for (const event of events) {
        try {
          const content = JSON.parse(event.content);
          
          // Extract mint URL from tags
          const mintTag = event.tags.find(tag => tag[0] === 'mint');
          const mintUrl = mintTag?.[1] || '';

          // Extract counterparty from tags (for nutzaps)
          const pTag = event.tags.find(tag => tag[0] === 'p');
          const counterparty = pTag?.[1];

          const transaction: CashuTransaction = {
            id: event.id,
            type: content.type || 'send',
            amount: parseInt(content.amount) || 0,
            mintUrl,
            timestamp: event.created_at * 1000,
            status: content.status || 'completed',
            description: content.description,
            counterparty,
            originalEvent: event
          };

          parsedTransactions.push(transaction);
        } catch (err) {
          console.warn('Failed to parse transaction event:', event.id, err);
        }
      }

      // Sort by timestamp (newest first)
      parsedTransactions.sort((a, b) => b.timestamp - a.timestamp);

      // Cache the transactions
      historyStore.setTransactions(user.pubkey, parsedTransactions);

      return parsedTransactions;
    },
    enabled: !!user,
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  return {
    transactions,
    isLoading,
    error,
    refetch,
    createHistory: createHistoryMutation.mutateAsync,
    isCreating: createHistoryMutation.isPending,
  };
}

/**
 * Hook to get transaction statistics
 */
export function useCashuStats() {
  const { transactions } = useCashuHistory();

  const stats = {
    totalSent: transactions
      .filter(t => ['send', 'nutzap_send'].includes(t.type) && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    
    totalReceived: transactions
      .filter(t => ['receive', 'nutzap_receive'].includes(t.type) && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    
    totalMinted: transactions
      .filter(t => t.type === 'mint' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    
    totalMelted: transactions
      .filter(t => t.type === 'melt' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    
    transactionCount: transactions.filter(t => t.status === 'completed').length,
    
    recentTransactions: transactions.slice(0, 5),
  };

  return stats;
}