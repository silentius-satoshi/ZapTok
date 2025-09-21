import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CASHU_EVENT_KINDS, SpendingHistoryEntry } from '@/lib/cashu';

/**
 * Hook to fetch and manage the user's Cashu spending history with social features
 */
export function useCashuHistory() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Create spending history event with social context
  const createHistoryMutation = useMutation({
    mutationFn: async ({
      direction,
      amount,
      groupId,
      recipientPubkey,
      isNutzap,
      createdTokens = [],
      destroyedTokens = [],
      redeemedTokens = []
    }: {
      direction: 'in' | 'out';
      amount: string;
      groupId?: string;
      recipientPubkey?: string;
      isNutzap?: boolean;
      createdTokens?: string[];
      destroyedTokens?: string[];
      redeemedTokens?: string[];
    }) => {
      if (!user) throw new Error('User not logged in');
      if (!user.signer.nip44) {
        throw new Error('NIP-44 encryption not supported by your signer');
      }

      // Prepare content data with social context
      const contentData = [
        ['direction', direction],
        ['amount', amount],
        ...createdTokens.map(id => ['e', id, '', 'created']),
        ...destroyedTokens.map(id => ['e', id, '', 'destroyed'])
      ];

      // Add social context to encrypted content
      if (groupId) contentData.push(['group_id', groupId]);
      if (isNutzap) contentData.push(['type', 'nutzap']);

      // Encrypt content
      const content = await user.signer.nip44.encrypt(
        user.pubkey,
        JSON.stringify(contentData)
      );

      // Prepare tags for social features
      const tags = [
        ...redeemedTokens.map(id => ['e', id, '', 'redeemed'])
      ];

      // Add recipient pubkey for social payments
      if (recipientPubkey) {
        tags.push(['p', recipientPubkey]);
      }

      // Add group tag for community payments
      if (groupId) {
        tags.push(['g', groupId]);
      }

      // Create history event
      const event = await user.signer.signEvent({
        kind: CASHU_EVENT_KINDS.HISTORY,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000)
      });

      // Publish event
      await nostr.event(event);

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashu', 'history', user?.pubkey] });
    }
  });

  const historyQuery = useQuery({
    queryKey: ['cashu', 'history', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not logged in');
      if (!user.signer.nip44) {
        throw new Error('NIP-44 encryption not supported by your signer');
      }

      const events = await nostr.query([{
        kinds: [CASHU_EVENT_KINDS.HISTORY],
        authors: [user.pubkey],
        limit: 100
      }], { signal });

      const history: (SpendingHistoryEntry & {
        id: string;
        groupId?: string;
        recipientPubkey?: string;
        isNutzap?: boolean;
      })[] = [];

      for (const event of events) {
        try {
          // Decrypt content
          const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
          const contentData = JSON.parse(decrypted) as Array<string[]>;

          // Extract basic data
          const entry = {
            id: event.id,
            direction: 'in' as 'in' | 'out',
            amount: '0',
            timestamp: event.created_at,
            createdTokens: [] as string[],
            destroyedTokens: [] as string[],
            redeemedTokens: [] as string[],
            groupId: undefined as string | undefined,
            recipientPubkey: undefined as string | undefined,
            isNutzap: false
          };

          // Process encrypted content
          for (const item of contentData) {
            const [key, value, , marker] = item;

            if (key === 'direction') {
              entry.direction = value as 'in' | 'out';
            } else if (key === 'amount') {
              entry.amount = value;
            } else if (key === 'group_id') {
              entry.groupId = value;
            } else if (key === 'type' && value === 'nutzap') {
              entry.isNutzap = true;
            } else if (key === 'e' && marker === 'created') {
              entry.createdTokens.push(value);
            } else if (key === 'e' && marker === 'destroyed') {
              entry.destroyedTokens.push(value);
            }
          }

          // Process unencrypted tags
          for (const tag of event.tags) {
            if (tag[0] === 'e' && tag[3] === 'redeemed') {
              entry.redeemedTokens.push(tag[1]);
            } else if (tag[0] === 'p') {
              entry.recipientPubkey = tag[1];
            } else if (tag[0] === 'g') {
              entry.groupId = tag[1];
            }
          }

          history.push(entry);
        } catch (error) {
          console.error('Failed to decrypt history data:', error);
        }
      }

      // Sort by timestamp (newest first)
      return history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    },
    enabled: !!user && !!user.signer.nip44
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    createHistory: createHistoryMutation,
    refetch: historyQuery.refetch
  };
}