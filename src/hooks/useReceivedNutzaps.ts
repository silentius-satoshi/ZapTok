import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuStore } from '@/stores/cashuStore';
import { useNutzapStore } from '@/stores/nutzapStore';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';
import type { NostrEvent } from 'nostr-tools';

export interface ReceivedNutzap {
  id: string;
  senderPubkey: string;
  amount: number;
  comment: string;
  mintUrl: string;
  timestamp: number;
  status: 'pending' | 'claimed';
  proofs: any[];
  originalEvent: NostrEvent;
}

interface UseReceivedNutzapsResult {
  nutzaps: ReceivedNutzap[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  unclaimedCount: number;
  totalUnclaimed: number;
}

/**
 * Hook to fetch received nutzaps
 */
export function useReceivedNutzaps(): UseReceivedNutzapsResult {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const cashuStore = useCashuStore();
  const nutzapStore = useNutzapStore();

  const {
    data: nutzaps = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['nutzaps', 'received', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not authenticated');

      // Get our mints to filter relevant nutzaps
      const ourMints = cashuStore.mints.map(m => m.url);
      if (ourMints.length === 0) {
        return [];
      }

      // First check store cache
      const cachedNutzaps = nutzapStore.getReceivedNutzaps(user.pubkey);
      if (cachedNutzaps.length > 0) {
        return cachedNutzaps;
      }

      // Query for nutzaps sent to us
      const events = await nostr.query([
        {
          kinds: [CASHU_EVENT_KINDS.NUTZAP],
          '#p': [user.pubkey],
          '#u': ourMints, // Only nutzaps on mints we support
          limit: 100
        }
      ], { signal });

      // Parse nutzap events
      const receivedNutzaps: ReceivedNutzap[] = [];

      for (const event of events) {
        try {
          // Extract amount
          const amountTag = event.tags.find(tag => tag[0] === 'amount');
          const amount = amountTag ? parseInt(amountTag[1]) : 0;

          // Extract mint URL
          const mintTag = event.tags.find(tag => tag[0] === 'u');
          const mintUrl = mintTag?.[1] || '';

          // Extract proofs
          const proofTags = event.tags.filter(tag => tag[0] === 'proof');
          const proofs = proofTags.map(tag => {
            try {
              return JSON.parse(tag[1]);
            } catch {
              return null;
            }
          }).filter(Boolean);

          // Check if this nutzap has been claimed
          const isClaimedInStore = nutzapStore.isNutzapClaimed(event.id);
          
          const nutzap: ReceivedNutzap = {
            id: event.id,
            senderPubkey: event.pubkey,
            amount,
            comment: event.content,
            mintUrl,
            timestamp: event.created_at * 1000,
            status: isClaimedInStore ? 'claimed' : 'pending',
            proofs,
            originalEvent: event
          };

          receivedNutzaps.push(nutzap);
        } catch (err) {
          console.warn('Failed to parse nutzap event:', event.id, err);
        }
      }

      // Sort by timestamp (newest first)
      receivedNutzaps.sort((a, b) => b.timestamp - a.timestamp);

      // Cache in store
      nutzapStore.setReceivedNutzaps(user.pubkey, receivedNutzaps);

      return receivedNutzaps;
    },
    enabled: !!user && cashuStore.mints.length > 0,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  // Calculate unclaimed stats
  const unclaimedNutzaps = nutzaps.filter(n => n.status === 'pending');
  const unclaimedCount = unclaimedNutzaps.length;
  const totalUnclaimed = unclaimedNutzaps.reduce((sum, n) => sum + n.amount, 0);

  return {
    nutzaps,
    isLoading,
    error,
    refetch,
    unclaimedCount,
    totalUnclaimed
  };
}

/**
 * Hook to get a specific received nutzap by ID
 */
export function useReceivedNutzap(nutzapId?: string) {
  const { nutzaps } = useReceivedNutzaps();
  
  return {
    nutzap: nutzaps.find(n => n.id === nutzapId),
    isLoading: false
  };
}