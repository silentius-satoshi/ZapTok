import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrConnection } from '@/components/NostrProvider';
import { CASHU_EVENT_KINDS, SpendingHistoryEntry as CashuSpendingHistoryEntry } from '@/lib/cashu';
import { useTransactionHistoryStore } from '@/stores/transactionHistoryStore';
import { useCashuRelayStore } from '@/stores/cashuRelayStore';
import type { NostrEvent } from 'nostr-tools';
import { useEffect, useRef } from 'react';

// Local interface for older usage
export interface SpendingHistoryEntry {
  direction: 'in' | 'out';
  amount: string;
  timestamp?: number;
}

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

interface CreateHistoryArgs {
  direction: 'in' | 'out';
  amount: string; // sats
  createdTokens?: string[];    // token event ids created (encrypted markers: created)
  destroyedTokens?: string[];  // token event ids destroyed (encrypted markers: destroyed)
  redeemedTokens?: string[];   // token event ids redeemed (unencrypted tags: redeemed)
}

interface UseCashuHistoryResult {
  history: (CashuSpendingHistoryEntry & { id: string })[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  createHistory: (args: CreateHistoryArgs) => Promise<NostrEvent>;
  isCreating: boolean;
  fetchedNewCount: number;
}

/**
 * Hook to fetch and manage Cashu transaction history
 */
const QUERY_DEBOUNCE_MS = 400;
const FETCH_TIMEOUT_MS = 1500;

function loadProcessedIds(pubkey: string) {
  try {
    const raw = sessionStorage.getItem(`cashu_history_ids:${pubkey}`);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function persistProcessedIds(pubkey: string, setIds: Set<string>) {
  try {
    sessionStorage.setItem(
      `cashu_history_ids:${pubkey}`,
      JSON.stringify(Array.from(setIds))
    );
  } catch {
    /* ignore */
  }
}

export function useCashuHistory(): UseCashuHistoryResult {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { isAnyRelayConnected } = useNostrConnection();
  const historyStore = useTransactionHistoryStore();
  const cashuRelayStore = useCashuRelayStore();
  const queryClient = useQueryClient();
  const processedIdsRef = useRef<Set<string>>(new Set());
  const lastContextChangeRef = useRef<number>(Date.now());
  const lastStableStartRef = useRef<number>(0);

  // Load previously processed IDs when user changes
  useEffect(() => {
    if (user?.pubkey) {
      processedIdsRef.current = loadProcessedIds(user.pubkey);
    }
  }, [user?.pubkey]);

  // Track relay context stabilization
  useEffect(() => {
    if (!isAnyRelayConnected) return;
    lastContextChangeRef.current = Date.now();
  }, [isAnyRelayConnected]);

  const waitForStableContext = () => {
    if (!isAnyRelayConnected) return false;
    const msSince = Date.now() - lastContextChangeRef.current;
    return msSince >= QUERY_DEBOUNCE_MS;
  };

  const createHistoryMutation = useMutation({
    mutationFn: async ({
      direction,
      amount,
      createdTokens = [],
      destroyedTokens = [],
      redeemedTokens = []
    }: CreateHistoryArgs) => {
      if (!user) throw new Error('User not authenticated');
      if (!user.signer.nip44) throw new Error('Cashu history requires NIP-44 encryption support. Please ensure your Nostr extension has ENCRYPT and DECRYPT permissions enabled.');

      // Build encrypted content data (array form for forward compatibility)
      const contentData: Array<string[]> = [
        ['direction', direction],
        ['amount', amount],
        ...createdTokens.map(id => ['e', id, '', 'created']),
        ...destroyedTokens.map(id => ['e', id, '', 'destroyed'])
      ];

      const encrypted = await user.signer.nip44.encrypt(user.pubkey, JSON.stringify(contentData));

      const event = await user.signer.signEvent({
        kind: CASHU_EVENT_KINDS.HISTORY,
        content: encrypted,
        tags: redeemedTokens.map(id => ['e', id, '', 'redeemed']),
        created_at: Math.floor(Date.now() / 1000)
      });

      await nostr.event(event, { relays: [cashuRelayStore.activeRelay] });

      // Optimistic add (store timestamp in seconds like chorus)
      historyStore.addHistoryEntries([
        {
          id: event.id,
          direction,
          amount,
          timestamp: event.created_at,
          createdTokens,
            destroyedTokens,
            redeemedTokens
        } as any
      ]);
      processedIdsRef.current.add(event.id);
      if (user?.pubkey) persistProcessedIds(user.pubkey, processedIdsRef.current);
      return event;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cashu', 'history', user?.pubkey] })
  });

  const {
    data: fetchedNewCount = 0,
    isLoading,
    error,
    refetch
  } = useQuery<number>({
    queryKey: ['cashu', 'history', user?.pubkey],
    enabled: !!user && waitForStableContext(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    notifyOnChangeProps: ['status', 'data', 'error'],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not authenticated');

      const now = Date.now();
      if (now - lastStableStartRef.current < QUERY_DEBOUNCE_MS) {
        return 0;
      }
      lastStableStartRef.current = now;

      // Timeout wrapper
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);
      const combinedSignal = (AbortSignal as any).any
        ? (AbortSignal as any).any([signal, abortController.signal])
        : abortController.signal;

      // Fetch only HISTORY events (chorus parity)
      let historyEvents: NostrEvent[] = [];
      try {
        historyEvents = await nostr.query([
          { kinds: [CASHU_EVENT_KINDS.HISTORY], authors: [user.pubkey], limit: 100 }
        ], { signal: combinedSignal, relays: [cashuRelayStore.activeRelay] });
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          clearTimeout(timeout);
          return 0;
        }
        clearTimeout(timeout);
        throw e;
      }
      clearTimeout(timeout);

      const batch: (CashuSpendingHistoryEntry & { id: string })[] = [];

      for (const event of historyEvents) {
        if (processedIdsRef.current.has(event.id)) continue;
        try {
          if (!user.signer.nip44) continue;
          const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
          const contentData = JSON.parse(decrypted) as Array<string[]>;

          const entry: CashuSpendingHistoryEntry & { id: string } = {
            id: event.id,
            direction: 'out',
            amount: '0',
            timestamp: event.created_at, // seconds
            createdTokens: [],
            destroyedTokens: [],
            redeemedTokens: []
          } as any;

          for (const item of contentData) {
            const [k, v, , marker] = item;
            if (k === 'direction') entry.direction = v as 'in' | 'out';
            else if (k === 'amount') entry.amount = String(v);
            else if (k === 'e' && marker === 'created') entry.createdTokens?.push(v);
            else if (k === 'e' && marker === 'destroyed') entry.destroyedTokens?.push(v);
          }

          // unencrypted redeemed tags
          for (const tag of event.tags) {
            if (tag[0] === 'e' && tag[3] === 'redeemed') {
              entry.redeemedTokens?.push(tag[1]);
            }
          }

          const amountNum = parseInt(entry.amount, 10) || 0;
          if (amountNum <= 0) continue;

          batch.push(entry);
          processedIdsRef.current.add(event.id);
        } catch {
          // ignore
        }
      }

      if (batch.length) {
        historyStore.addHistoryEntries(batch as any);
        if (user?.pubkey) persistProcessedIds(user.pubkey, processedIdsRef.current);
      }

      return batch.length;
    },
    select: (count) => count,
  });

  const history = historyStore.getHistoryEntries();

  return {
    history,
    isLoading,
    error: (error as any) ?? null,
    refetch,
    createHistory: createHistoryMutation.mutateAsync,
    isCreating: createHistoryMutation.isPending,
    fetchedNewCount,
  };
}

/**
 * Hook to get transaction statistics
 */
export function useCashuStats() {
  const { history } = useCashuHistory();

  const stats = {
    totalSent: history
      .filter(t => t.direction === 'out')
      .reduce((sum, t) => sum + (parseInt(t.amount, 10) || 0), 0),

    totalReceived: history
      .filter(t => t.direction === 'in')
      .reduce((sum, t) => sum + (parseInt(t.amount, 10) || 0), 0),

    totalMinted: 0,
    totalMelted: 0,
    transactionCount: history.length,
    recentTransactions: history.slice(0, 5),
  };

  return stats;
}