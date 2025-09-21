import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';
import { useCashuStore } from '@/stores/cashuStore';
import { useCashuToken } from '@/hooks/useCashuToken';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useTransactionHistoryStore } from '@/stores/transactionHistoryStore';
import { Proof } from '@cashu/cashu-ts';

/**
 * Hook to send nutzaps (social payments) to other users
 */
export function useSendNutzap() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { sendToken } = useCashuToken();
  const { createHistory } = useCashuHistory();
  const cashuStore = useCashuStore();

  return useMutation({
    mutationFn: async ({
      recipientPubkey,
      amount,
      note,
      groupId
    }: {
      recipientPubkey: string;
      amount: number;
      note?: string;
      groupId?: string;
    }) => {
      if (!user) throw new Error('User not logged in');
      if (!cashuStore.activeMintUrl) throw new Error('No active mint selected');

      // Send token with P2PK lock to recipient
      const result = await sendToken(amount, {
        isNutzap: true,
        recipientPubkey,
        groupId,
        publicNote: note
      });

      // Create nutzap event
      const tags = [
        ['p', recipientPubkey],
        ['amount', amount.toString()],
        ['mint', cashuStore.activeMintUrl]
      ];

      if (groupId) {
        tags.push(['g', groupId]);
      }

      // Add proof references
      result.proofs.forEach(proof => {
        tags.push(['proof', proof.secret]);
      });

      const event = await user.signer.signEvent({
        kind: CASHU_EVENT_KINDS.ZAP,
        content: note || '',
        tags,
        created_at: Math.floor(Date.now() / 1000)
      });

      // Publish nutzap event
      await nostr.event(event);

      return { event, proofs: result.proofs, token: result.token };
    }
  });
}

/**
 * Hook to fetch received nutzaps
 */
export function useReceivedNutzaps() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['received-nutzaps', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not logged in');

      const events = await nostr.query([{
        kinds: [CASHU_EVENT_KINDS.ZAP],
        '#p': [user.pubkey],
        limit: 100
      }], { signal });

      return events.map(event => {
        const amount = event.tags.find(tag => tag[0] === 'amount')?.[1];
        const mint = event.tags.find(tag => tag[0] === 'mint')?.[1];
        const groupId = event.tags.find(tag => tag[0] === 'g')?.[1];
        const senderPubkey = event.pubkey;
        const proofSecrets = event.tags.filter(tag => tag[0] === 'proof').map(tag => tag[1]);

        return {
          id: event.id,
          senderPubkey,
          amount: parseInt(amount || '0'),
          note: event.content,
          mint: mint || '',
          groupId,
          proofSecrets,
          timestamp: event.created_at,
          redeemed: false // TODO: Check if already redeemed
        };
      }).sort((a, b) => b.timestamp - a.timestamp);
    },
    enabled: !!user
  });
}

/**
 * Hook to redeem a received nutzap
 */
export function useRedeemNutzap() {
  const { receiveToken } = useCashuToken();
  const { createHistory } = useCashuHistory();
  const transactionHistoryStore = useTransactionHistoryStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nutzap: {
      id: string;
      senderPubkey: string;
      amount: number;
      proofSecrets: string[];
      mint: string;
      groupId?: string;
    }) => {
      // TODO: Reconstruct token from proof secrets and redeem
      // This is a simplified version - in practice you'd need to reconstruct the full token

      // Create basic history entry for official cashu tracking
      createHistory.mutate({
        direction: 'in',
        amount: nutzap.amount.toString(),
      });

      // Add social context to local store (custom ZapTok feature)
      transactionHistoryStore.addHistoryEntry({
        id: `nutzap-${Date.now()}`,
        direction: 'in',
        amount: nutzap.amount.toString(),
        timestamp: Date.now(),
        recipientPubkey: nutzap.senderPubkey,
        groupId: nutzap.groupId,
        isNutzap: true,
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-nutzaps'] });
      queryClient.invalidateQueries({ queryKey: ['cashu', 'history'] });
    }
  });
}

/**
 * Hook to fetch group nutzaps for community features
 */
export function useGroupNutzaps(groupId?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['group-nutzaps', groupId],
    queryFn: async ({ signal }) => {
      if (!groupId) return [];

      const events = await nostr.query([{
        kinds: [CASHU_EVENT_KINDS.ZAP],
        '#g': [groupId],
        limit: 100
      }], { signal });

      return events.map(event => {
        const amount = event.tags.find(tag => tag[0] === 'amount')?.[1];
        const recipientPubkey = event.tags.find(tag => tag[0] === 'p')?.[1];

        return {
          id: event.id,
          senderPubkey: event.pubkey,
          recipientPubkey: recipientPubkey || '',
          amount: parseInt(amount || '0'),
          note: event.content,
          timestamp: event.created_at
        };
      }).sort((a, b) => b.timestamp - a.timestamp);
    },
    enabled: !!groupId
  });
}

/**
 * Hook to get total nutzap amount for a group
 */
export function useGroupNutzapTotal(groupId?: string) {
  const { data: nutzaps } = useGroupNutzaps(groupId);

  return nutzaps?.reduce((total, nutzap) => total + nutzap.amount, 0) || 0;
}