import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';
import { NostrEvent } from 'nostr-tools';
import { Proof } from '@cashu/cashu-ts';
import { useNutzapStore, NutzapInformationalEvent } from '@/stores/nutzapStore';
import { useCashuStore } from '@/stores/cashuStore';

/**
 * Hook to verify mint compatibility between sender and recipient
 * Checks if recipient accepts tokens from sender's active mint
 * If not, tries to find a compatible mint from sender's mints list
 */
export function useVerifyMintCompatibility() {
  const cashuStore = useCashuStore();

  const verifyMintCompatibility = (recipientInfo: NutzapInformationalEvent): string => {
    const activeMintUrl = cashuStore.activeMintUrl || '';
    const recipientMints = recipientInfo.mints.map(mint => mint.url);

    // Check if recipient accepts the active mint
    if (activeMintUrl && recipientMints.includes(activeMintUrl)) {
      return activeMintUrl;
    }

    // If not, try to find a compatible mint
    const compatibleMint = recipientMints.find(mintUrl =>
      cashuStore.mints.map(m => m.url).includes(mintUrl)
    );

    if (compatibleMint) {
      // Update the active mint to the compatible one
      cashuStore.setActiveMintUrl(compatibleMint);
      return compatibleMint;
    }

    // If no compatible mint found, throw an error
    throw new Error(
      `No compatible mint found. Recipient accepts: ${recipientMints.join(', ')}. ` +
      `You have: ${cashuStore.mints.map(m => m.url).join(', ')}`
    );
  };

  return { verifyMintCompatibility };
}

/**
 * Hook to fetch a recipient's nutzap information
 */
export function useFetchNutzapInfo() {
  const { nostr } = useNostr();
  const nutzapStore = useNutzapStore();

  // Mutation to fetch and store nutzap info
  const fetchNutzapInfoMutation = useMutation({
    mutationFn: async (recipientPubkey: string): Promise<NutzapInformationalEvent> => {
      // First check if we have it in the store
      const storedInfo = nutzapStore.getNutzapInfo(recipientPubkey);
      if (storedInfo) {
        return storedInfo;
      }

      // Otherwise fetch it from the network
      const events = await nostr.query([
        { kinds: [CASHU_EVENT_KINDS.ZAPINFO], authors: [recipientPubkey], limit: 1 }
      ], { signal: AbortSignal.timeout(5000) });

      if (events.length === 0) {
        throw new Error('Recipient has no nutzap informational event');
      }

      const event = events[0];

      // Parse the nutzap informational event
      const relays = event.tags
        .filter(tag => tag[0] === 'relay')
        .map(tag => tag[1]);

      const mints = event.tags
        .filter(tag => tag[0] === 'mint')
        .map(tag => ({
          url: tag[1],
          units: tag.slice(2)
        }));

      const p2pkPubkey = event.tags
        .find(tag => tag[0] === 'pubkey')?.[1] || '';

      const nutzapInfo: NutzapInformationalEvent = {
        event,
        relays,
        mints,
        p2pkPubkey
      };

      // Store it for future use
      nutzapStore.setNutzapInfo(recipientPubkey, nutzapInfo);

      return nutzapInfo;
    }
  });

  return {
    fetchNutzapInfo: fetchNutzapInfoMutation.mutateAsync,
    isFetching: fetchNutzapInfoMutation.isPending,
  };
}

/**
 * Hook to create and send nutzap events
 */
export function useSendNutzap() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { verifyMintCompatibility } = useVerifyMintCompatibility();
  const queryClient = useQueryClient();

  // Mutation to create and send a nutzap event
  const sendNutzapMutation = useMutation({
    mutationFn: async ({
      recipientInfo,
      comment = '',
      proofs,
      mintUrl,
      eventId,
      relayHint
    }: {
      recipientInfo: NutzapInformationalEvent;
      comment?: string;
      proofs: Proof[];
      mintUrl: string;
      eventId?: string; // Event being nutzapped (optional)
      relayHint?: string; // Hint for relay where the event can be found
    }) => {
      if (!user) throw new Error('User not logged in');

      // Verify mint compatibility and get the compatible mint URL
      const compatibleMintUrl = verifyMintCompatibility(recipientInfo);

      // If mintUrl is different from compatibleMintUrl, we should use the compatible one
      // but this requires generating new proofs with the compatible mint
      if (mintUrl !== compatibleMintUrl) {
        mintUrl = compatibleMintUrl;
      }

      // Create tags for the nutzap event
      const tags = [
        // Add proofs
        ...proofs.map(proof => ['proof', JSON.stringify(proof)]),

        // Add mint URL
        ['u', mintUrl],

        // Add recipient pubkey
        ['p', recipientInfo.event.pubkey],
      ];

      // Add event tag if specified
      if (eventId) {
        tags.push(['e', eventId, relayHint || '']);
      }

      // Create the nutzap event
      const event = await user.signer.signEvent({
        kind: CASHU_EVENT_KINDS.ZAP,
        content: comment,
        tags,
        created_at: Math.floor(Date.now() / 1000)
      });

      // Publish the event to the recipient's relays
      await nostr.event(event);

      // Invalidate relevant queries
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ['nutzaps', eventId] });
      }

      // Also invalidate recipient's received nutzaps
      queryClient.invalidateQueries({
        queryKey: ['nutzap', 'received', recipientInfo.event.pubkey]
      });

      // Return the event
      return {
        event,
        recipientInfo
      };
    }
  });

  return {
    sendNutzap: sendNutzapMutation.mutateAsync,
    isSending: sendNutzapMutation.isPending,
    error: sendNutzapMutation.error
  };
}