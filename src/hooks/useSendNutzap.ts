import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';
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
 * Hook to send nutzaps
 */
export function useSendNutzap() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { verifyMintCompatibility } = useVerifyMintCompatibility();
  const queryClient = useQueryClient();
  const nutzapStore = useNutzapStore();

  const sendNutzapMutation = useMutation({
    mutationFn: async ({
      recipientPubkey,
      comment = '',
      proofs,
      mintUrl,
      eventId,
      relayHint
    }: {
      recipientPubkey: string;
      comment?: string;
      proofs: Proof[];
      mintUrl: string;
      eventId?: string;
      relayHint?: string;
    }) => {
      if (!user) throw new Error('User not logged in');

      // Get recipient info
      const recipientInfo = nutzapStore.getNutzapInfo(recipientPubkey);
      if (!recipientInfo) {
        throw new Error('Recipient has no Cashu wallet');
      }

      // Verify mint compatibility
      const compatibleMintUrl = verifyMintCompatibility(recipientInfo);

      // Use the compatible mint URL
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
        ['p', recipientPubkey],
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

      // Publish the event
      await nostr.event(event);

      // Invalidate relevant queries
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: ['nutzaps', eventId] });
      }

      queryClient.invalidateQueries({
        queryKey: ['nutzap', 'received', recipientPubkey]
      });

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