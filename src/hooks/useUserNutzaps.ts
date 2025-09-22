import { useNostr } from '@/hooks/useNostr';
import { useQuery } from '@tanstack/react-query';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';


/**
 * Hook to fetch nutzaps for a specific user
 */
export function useUserNutzaps(userPubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nutzaps', 'user', userPubkey],
    queryFn: async ({ signal }) => {
      if (!userPubkey) throw new Error('User pubkey is required');

      // Query for nutzap events that have a p-tag matching the user pubkey
      const events = await nostr.query([
        { 
          kinds: [CASHU_EVENT_KINDS.ZAP], 
          '#p': [userPubkey],
          limit: 50 
        }
      ], { signal });

      // Sort by created_at in descending order (newest first)
      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!nostr && !!userPubkey
  });
}

/**
 * Hook to get the total amount of nutzaps for a user
 */
export function useUserNutzapTotal(userPubkey?: string) {
  const { data: nutzaps, isLoading, error } = useUserNutzaps(userPubkey);

  // Calculate total amount from all nutzaps
  const total = nutzaps?.reduce((acc, event) => {
    // Extract amount from proofs
    let eventTotal = 0;
    for (const tag of event.tags) {
      if (tag[0] === 'proof') {
        try {
          const proof = JSON.parse(tag[1]);
          eventTotal += proof.amount || 0;
        } catch (e) {
          console.error('Error parsing proof:', e);
        }
      }
    }
    return acc + eventTotal;
  }, 0) || 0;

  return {
    total,
    nutzaps,
    isLoading,
    error
  };
}