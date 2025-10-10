import { useNostr } from '@/hooks/useNostr';
import { useQuery } from '@tanstack/react-query';
import { getZapInfoFromEvent } from '@/lib/event-metadata';

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
  });
}

/**
 * Hook to get the total amount of Lightning zaps received by a user
 */
export function useUserReceivedZapsTotal(userPubkey?: string) {
  const { data: zaps, isLoading, error } = useUserReceivedZaps(userPubkey);

  // Calculate total sats received
  const total = zaps?.reduce((acc, zap) => acc + zap.amount, 0) || 0;

  return {
    total,
    count: zaps?.length || 0,
    zaps,
    isLoading,
    error,
  };
}
