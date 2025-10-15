import { useNostr } from '@/hooks/useNostr';
import { useQuery } from '@tanstack/react-query';
import { getZapInfoFromEvent } from '@/lib/event-metadata';
import { usePrimalFollowerCount } from '@/hooks/usePrimalFollowerCount';

/**
 * Hook to fetch all Lightning zaps received by a user across all their content
 * Queries kind 9735 zap receipt events where the user is the recipient (p tag)
 */
export function useUserReceivedZaps(userPubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['zaps', 'received', userPubkey],
    queryFn: async ({ signal }) => {
      if (!userPubkey) throw new Error('User pubkey is required');

      // Query for zap receipt events where user is the recipient
      const events = await nostr.query([
        { 
          kinds: [9735],      // Zap receipt events
          '#p': [userPubkey], // Filter by recipient (lowercase p)
          limit: 1000,        // Get up to 1000 zap receipts
        }
      ], { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) });

      // Parse zap receipts to extract sender, amount, etc.
      const zaps = events
        .map(event => {
          const zapInfo = getZapInfoFromEvent(event);
          // Skip invalid zaps (no zapInfo, no amount, or amount is 0 from parse error)
          if (!zapInfo || !zapInfo.amount || zapInfo.amount === 0) return null;
          
          return {
            id: event.id,
            senderPubkey: zapInfo.senderPubkey,
            recipientPubkey: zapInfo.recipientPubkey,
            amount: zapInfo.amount,
            comment: zapInfo.comment,
            invoice: zapInfo.invoice,
            eventId: zapInfo.originalEventId || zapInfo.eventId,
            createdAt: event.created_at,
          };
        })
        .filter((zap): zap is NonNullable<typeof zap> => zap !== null)
        .sort((a, b) => b.createdAt - a.createdAt); // Newest first

      return zaps;
    },
    enabled: !!nostr && !!userPubkey,
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

/**
 * Hook to get the total amount of Lightning zaps received by a user
 * Uses Primal's aggregated data for consistent, accurate totals
 */
export function useUserReceivedZapsTotal(userPubkey?: string) {
  const { profile, isLoading: primalLoading } = usePrimalFollowerCount(userPubkey);

  // Use Primal's aggregated data for consistent totals
  const total = profile?.total_satszapped || 0;
  const count = profile?.total_zap_count || 0;

  return {
    total,
    count,
    isLoading: primalLoading,
    error: null,
  };
}
