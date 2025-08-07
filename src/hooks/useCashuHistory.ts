import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrConnection } from '@/components/NostrProvider';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';
import { useTransactionHistoryStore } from '@/stores/transactionHistoryStore';
import { useCashuRelayStore } from '@/stores/cashuRelayStore';
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
  const { isAnyRelayConnected } = useNostrConnection();
  const historyStore = useTransactionHistoryStore();
  const cashuRelayStore = useCashuRelayStore();
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

      // Publish to the dedicated Cashu relay
      await nostr.event(event, { relays: [cashuRelayStore.activeRelay] });
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

      console.log(`useCashuHistory: Starting query with Cashu relay: ${cashuRelayStore.activeRelay}`);

      // Check if we have cached transactions
      const cachedTransactions = historyStore.getTransactions(user.pubkey);
      if (cachedTransactions.length > 0) {
        console.log('useCashuHistory: Returning cached transactions');
        return cachedTransactions;
      }

      console.log('useCashuHistory: Fetching fresh transaction history from Cashu relay');

      // Add timeout to prevent hanging
      const timeoutSignal = AbortSignal.timeout(15000); // 15 second timeout
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

      // Fetch transaction history from NIP-60 token events and history events using dedicated Cashu relay
      const [tokenEvents, historyEvents] = await Promise.all([
        nostr.query([
          {
            kinds: [CASHU_EVENT_KINDS.TOKEN], // NIP-60 token events (received transactions)
            authors: [user.pubkey],
            limit: 100
          }
        ], { 
          signal: combinedSignal,
          relays: [cashuRelayStore.activeRelay] // Use dedicated Cashu relay
        }),
        nostr.query([
          {
            kinds: [CASHU_EVENT_KINDS.HISTORY], // NIP-60 history events (sent transactions)
            authors: [user.pubkey],
            limit: 100
          }
        ], { 
          signal: combinedSignal,
          relays: [cashuRelayStore.activeRelay] // Use dedicated Cashu relay
        })
      ]);

      // Parse NIP-60 token events into transaction history (received transactions)
      const parsedTransactions: CashuTransaction[] = [];

      for (const event of tokenEvents) {
        try {
          // Decrypt the token content (NIP-60 token events are encrypted)
          let tokenData;
          try {
            if (!user.signer.nip44) {
              console.warn('NIP-44 encryption not supported by your signer');
              continue;
            }
            
            const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
            tokenData = JSON.parse(decrypted);
          } catch (decryptError) {
            console.warn('Failed to decrypt token event:', event.id, decryptError);
            // Try parsing as plain text (fallback for unencrypted events)
            try {
              tokenData = JSON.parse(event.content);
            } catch (parseError) {
              console.warn('Failed to parse token event as plain text:', event.id, parseError);
              continue;
            }
          }
          
          // Extract mint URL from token data or tags
          const mintUrl = tokenData.mint || 
                          event.tags.find(tag => tag[0] === 'mint')?.[1] || 
                          'Unknown mint';

          // Calculate total amount from proofs
          let totalAmount = 0;
          if (tokenData.token) {
            // Multiple mint tokens
            totalAmount = tokenData.token.reduce((sum: number, t: any) => {
              return sum + (t.proofs?.reduce((pSum: number, proof: any) => pSum + proof.amount, 0) || 0);
            }, 0);
          } else if (tokenData.proofs) {
            // Single mint token
            totalAmount = tokenData.proofs.reduce((sum: number, proof: any) => sum + proof.amount, 0);
          }

          // Skip tokens with no value
          if (totalAmount <= 0) {
            console.warn('Skipping token event with no value:', { id: event.id, totalAmount });
            continue;
          }

          // Check if this is a nutzap by looking for 'p' tag
          const pTag = event.tags.find(tag => tag[0] === 'p');
          const isNutzap = !!pTag;
          const counterparty = pTag?.[1];

          const transaction: CashuTransaction = {
            id: event.id,
            type: isNutzap ? 'nutzap_receive' : 'receive',
            amount: totalAmount,
            mintUrl,
            timestamp: event.created_at * 1000,
            status: 'completed',
            description: isNutzap 
              ? `Received nutzap of ${totalAmount} sats`
              : `Received ${totalAmount} sats`,
            counterparty,
            originalEvent: event
          };

          parsedTransactions.push(transaction);
        } catch (err) {
          console.warn('Failed to parse token event:', event.id, err);
        }
      }

      // Parse history events (sent transactions, melts, mints)
      for (const event of historyEvents) {
        try {
          // Decrypt the history content (NIP-60 history events may be encrypted)
          let historyData;
          try {
            if (!user.signer.nip44) {
              console.warn('NIP-44 encryption not supported by your signer');
              continue;
            }
            
            const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
            historyData = JSON.parse(decrypted);
          } catch (decryptError) {
            console.warn('Failed to decrypt history event:', event.id, decryptError);
            // Try parsing as plain text (fallback for unencrypted events)
            try {
              historyData = JSON.parse(event.content);
            } catch (parseError) {
              console.warn('Failed to parse history event as plain text:', event.id, parseError);
              continue;
            }
          }
          
          // Extract details from history event
          // Handle both object format and tag array format
          let direction: string | undefined;
          let amountString: string | number | undefined;
          
          if (Array.isArray(historyData)) {
            // historyData is an array of tag arrays: [["direction","out"],["amount","8"]]
            direction = event.tags.find(tag => tag[0] === 'direction')?.[1] || 
                       historyData.find(tag => tag[0] === 'direction')?.[1];
            amountString = event.tags.find(tag => tag[0] === 'amount')?.[1] || 
                          historyData.find(tag => tag[0] === 'amount')?.[1];
          } else {
            // historyData is an object format
            direction = event.tags.find(tag => tag[0] === 'direction')?.[1] || historyData.direction;
            amountString = event.tags.find(tag => tag[0] === 'amount')?.[1] || historyData.amount;
          }
          
          // Parse amount from string or number
          let amount = 0;
          if (typeof amountString === 'number') {
            amount = amountString;
          } else if (typeof amountString === 'string') {
            amount = parseInt(amountString, 10) || 0;
          }
          
          const mintUrl = event.tags.find(tag => tag[0] === 'mint')?.[1] || 'Unknown mint';
          
          // Skip transactions with no amount
          if (amount <= 0) {
            console.warn('Skipping history event with invalid amount:', { 
              id: event.id, 
              amountString, 
              amount, 
              direction,
              historyDataType: Array.isArray(historyData) ? 'Array' : typeof historyData,
              historyDataLength: Array.isArray(historyData) ? historyData.length : 'N/A'
            });
            continue;
          }
          
          // Determine transaction type based on direction and data
          let type: CashuTransaction['type'] = 'send';
          let description = '';
          
          if (direction === 'out') {
            // Check historyData for transaction type (both object and array formats)
            let historyType: string | undefined;
            if (Array.isArray(historyData)) {
              historyType = historyData.find(tag => tag[0] === 'type')?.[1];
            } else {
              historyType = historyData.type;
            }
            
            if (historyType === 'melt') {
              type = 'melt';
              description = `Melted ${amount} sats to Lightning`;
            } else if (historyType === 'nutzap') {
              type = 'nutzap_send';
              description = `Sent nutzap of ${amount} sats`;
            } else {
              type = 'send';
              description = `Sent ${amount} sats`;
            }
          } else if (direction === 'in') {
            // Check historyData for transaction type (both object and array formats)
            let historyType: string | undefined;
            if (Array.isArray(historyData)) {
              historyType = historyData.find(tag => tag[0] === 'type')?.[1];
            } else {
              historyType = historyData.type;
            }
            
            if (historyType === 'mint') {
              type = 'mint';
              description = `Minted ${amount} sats from Lightning`;
            } else {
              // This would be a duplicate of token events, so skip
              continue;
            }
          }

          const transaction: CashuTransaction = {
            id: event.id,
            type,
            amount,
            mintUrl,
            timestamp: event.created_at * 1000,
            status: 'completed',
            description,
            originalEvent: event
          };

          parsedTransactions.push(transaction);
        } catch (err) {
          console.warn('Failed to parse history event:', event.id, err);
        }
      }

      // Sort by timestamp (newest first)
      parsedTransactions.sort((a, b) => b.timestamp - a.timestamp);

      // Cache the transactions
      historyStore.setTransactions(user.pubkey, parsedTransactions);

      console.log(`useCashuHistory: Parsed ${parsedTransactions.length} transactions from ${tokenEvents.length} token events and ${historyEvents.length} history events`);

      return parsedTransactions;
    },
    enabled: !!user && isAnyRelayConnected,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 2, // Only retry twice on failure
  });

  console.log(`useCashuHistory hook state: { 
    isLoading: ${isLoading}, 
    transactionsLength: ${transactions?.length || 0}, 
    userPubkey: ${user?.pubkey || 'none'}, 
    cashuRelay: ${cashuRelayStore.activeRelay},
    isAnyRelayConnected: ${isAnyRelayConnected},
    error: ${error ? error.message : 'none'}
  }`);

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