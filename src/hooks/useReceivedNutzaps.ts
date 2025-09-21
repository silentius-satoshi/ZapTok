import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useNutzapRedemption } from '@/hooks/useNutzapRedemption';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';

export interface ReceivedNutzap {
  id: string;
  pubkey: string; // Sender's pubkey (for backward compatibility)
  senderPubkey: string; // Sender's pubkey
  createdAt: number;
  timestamp: number; // For backward compatibility
  content: string; // Comment from sender
  comment: string; // For backward compatibility
  amount: number; // Total amount
  proofs: Array<{
    amount: number;
    C: string;
    id: string;
    secret: string;
  }>;
  mintUrl: string;
  zappedEvent?: string; // Event ID being zapped, if any
  redeemed: boolean; // Whether this nutzap has been redeemed
  status: 'pending' | 'redeemed' | 'failed' | 'claimed'; // Status for UI
}

/**
 * Hook to redeem nutzaps
 * STUB IMPLEMENTATION - Following Chorus patterns
 */
export function useRedeemNutzap() {
  const { updateProofs } = useCashuWallet();
  const { createRedemption } = useNutzapRedemption();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (nutzap: ReceivedNutzap) => {
      if (nutzap.redeemed) {
        return; // Already redeemed
      }

      // TODO: Implement actual nutzap redemption
      // This should:
      // 1. Receive the token proofs from the nutzap
      // 2. Update proofs in the wallet
      // 3. Record the redemption

      const { proofs, mintUrl } = nutzap;

      // Update proofs in the wallet
      const tokenEvent = await updateProofs({
        mintUrl,
        proofsToAdd: proofs,
        proofsToRemove: [],
      });

      if (!tokenEvent) {
        throw new Error("Failed to add proofs to wallet");
      }

      // Record the redemption
      await createRedemption({
        nutzapEventIds: [nutzap.id],
        direction: "in",
        amount: proofs.reduce((sum, p) => sum + p.amount, 0).toString(),
        createdTokenEventId: tokenEvent.id,
      });

      // Return the successful redemption
      return {
        nutzapId: nutzap.id,
        amount: proofs.reduce((sum, p) => sum + p.amount, 0),
      };
    },
    onSuccess: () => {
      // Invalidate queries to refresh the nutzap list
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['nutzap', 'received', user.pubkey] });
      }
    },
  });
}

/**
 * Hook to fetch received nutzaps
 * STUB IMPLEMENTATION - Basic structure following Chorus patterns
 */
export function useReceivedNutzaps() {
  const { user } = useCurrentUser();

  const query = useQuery({
    queryKey: ['nutzap', 'received', user?.pubkey],
    queryFn: async (): Promise<ReceivedNutzap[]> => {
      // TODO: Implement actual nutzap fetching using Nostr queries
      // This should query for nutzap events (kind 9321) sent to the user
      return [];
    },
    enabled: !!user,
  });

  // Calculate derived properties
  const nutzaps = query.data || [];
  const unclaimedNutzaps = nutzaps.filter(n => !n.redeemed);
  const unclaimedCount = unclaimedNutzaps.length;
  const totalUnclaimed = unclaimedNutzaps.reduce((sum, n) => sum + n.amount, 0);

  return {
    ...query,
    nutzaps,
    unclaimedCount,
    totalUnclaimed,
  };
}