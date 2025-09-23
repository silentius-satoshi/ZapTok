import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CASHU_EVENT_KINDS, CashuWalletStruct, CashuToken, activateMint, updateMintKeys, defaultMints } from '@/lib/cashu';
import { NostrEvent, getPublicKey } from 'nostr-tools';
import { useCashuStore, Nip60TokenEvent } from '@/stores/cashuStore';
import { Proof } from '@cashu/cashu-ts';
import { getLastEventTimestamp } from '@/lib/nostrTimestamps';
import { NSchema as n } from '@nostrify/nostrify';
import { z } from 'zod';
import { useNutzaps } from '@/hooks/useNutzaps';
import { hexToBytes } from '@noble/hashes/utils';
import { deriveP2PKPubkey } from '@/lib/p2pk';

/**
 * Hook to fetch and manage the user's Cashu wallet
 */
export function useCashuWallet() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const cashuStore = useCashuStore();
  const { createNutzapInfo } = useNutzaps();

  // Subscribe to balance changes for reactive updates
  const currentBalance = useCashuStore((state) => state.getTotalBalance());

  // Fetch wallet information (kind 17375)
  const walletQuery = useQuery({
    queryKey: ['cashu', 'wallet', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not logged in');

      const events = await nostr.query([
        { kinds: [CASHU_EVENT_KINDS.WALLET], authors: [user.pubkey], limit: 1 }
      ], { signal });

      if (events.length === 0) {
        return null;
      }

      const event = events[0];

      try {
        // Decrypt wallet content
        if (!user.signer.nip44) {
          throw new Error('NIP-44 encryption not supported by your signer');
        }

        const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
        const data = n.json().pipe(z.string().array().array()).parse(decrypted);

        const privkey = data.find(([key]) => key === 'privkey')?.[1];

        if (!privkey) {
          throw new Error('Private key not found in wallet data');
        }

        const walletData: CashuWalletStruct = {
          privkey,
          mints: data
            .filter(([key]) => key === 'mint')
            .map(([, mint]) => mint)
        };

        // if the default mint is not in the wallet, add it
        for (const mint of defaultMints) {
          if (!walletData.mints.includes(mint)) {
            walletData.mints.push(mint);
          }
        }

        // remove trailing slashes from mints
        walletData.mints = walletData.mints.map(mint => mint.replace(/\/$/, ''));
        // reduce mints to unique values
        walletData.mints = [...new Set(walletData.mints)];

        // fetch the mint info and keysets for each mint
        await Promise.all(walletData.mints.map(async (mint) => {
          const { mintInfo, keysets } = await activateMint(mint);
          cashuStore.addMint(mint);
          cashuStore.setMintInfo(mint, mintInfo);
          cashuStore.setKeysets(mint, keysets);
          const { keys } = await updateMintKeys(mint, keysets);
          cashuStore.setKeys(mint, keys);
        }));

        cashuStore.setPrivkey(walletData.privkey);

        // call getNip60TokensQuery
        await getNip60TokensQuery.refetch();
        return {
          id: event.id,
          wallet: walletData,
          createdAt: event.created_at
        };
      } catch (error) {
        console.error('Failed to decrypt wallet data:', error);
        return null;
      }
    },
    enabled: !!user
  });

  // Create or update wallet
  const createWalletMutation = useMutation({
    mutationFn: async (walletData: CashuWalletStruct) => {
      if (!user) throw new Error('User not logged in');
      if (!user.signer.nip44) {
        throw new Error('NIP-44 encryption not supported by your signer');
      }

      // remove trailing slashes from mints
      walletData.mints = walletData.mints.map(mint => mint.replace(/\/$/, ''));
      // reduce mints to unique values
      walletData.mints = [...new Set(walletData.mints)];

      const tags = [
        ['privkey', walletData.privkey],
        ...walletData.mints.map(mint => ['mint', mint])
      ]

      // Encrypt wallet data
      const content = await user.signer.nip44.encrypt(
        user.pubkey,
        JSON.stringify(tags)
      );

      // Create wallet event
      const event = await user.signer.signEvent({
        kind: CASHU_EVENT_KINDS.WALLET,
        content,
        tags: [],
        created_at: Math.floor(Date.now() / 1000)
      });

      // Publish event
      await nostr.event(event);

      // Also create or update the nutzap informational event
      try {
        await createNutzapInfo({
          mintOverrides: walletData.mints.map(mint => ({
            url: mint,
            units: ['sat']
          })),
          p2pkPubkey: deriveP2PKPubkey(walletData.privkey)
        });
      } catch (error) {
        console.error('Failed to create nutzap informational event:', error);
        // Continue even if nutzap info creation fails
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for event to be published

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashu', 'wallet', user?.pubkey] });
      queryClient.invalidateQueries({ queryKey: ['nutzap', 'info', user?.pubkey] });
    }
  });

  // Fetch token events (kind 7375)
  const getNip60TokensQuery = useQuery({
    queryKey: ['cashu', 'tokens', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not logged in');
      if (!user.signer.nip44) {
        throw new Error('NIP-44 encryption not supported by your signer');
      }

      // Get the last stored timestamp for the TOKEN event kind
      const lastTimestamp = getLastEventTimestamp(user.pubkey, CASHU_EVENT_KINDS.TOKEN);

      // Create the filter with 'since' if a timestamp exists
      const filter = {
        kinds: [CASHU_EVENT_KINDS.TOKEN],
        authors: [user.pubkey],
        limit: 100
      };

      // Add the 'since' property if we have a previous timestamp
      if (lastTimestamp) {
        Object.assign(filter, { since: lastTimestamp + 1 });
      }

      const events = await nostr.query([filter], { signal });

      console.debug(`Retrieved ${events.length} token events for decryption`, {
        userPubkey: user.pubkey,
        eventIds: events.map(e => e.id),
        eventSample: events.slice(0, 2).map(e => ({
          id: e.id,
          contentLength: e.content?.length || 0,
          contentEmpty: !e.content || e.content.trim() === '',
          created_at: e.created_at
        }))
      });

      if (events.length === 0) {
        return [];
      }

      const nip60TokenEvents: Nip60TokenEvent[] = [];

      for (const event of events) {
        try {
          // Validate event content before decryption
          if (!event.content || event.content.trim() === '') {
            console.warn(`Skipping token event ${event.id}: empty content`);
            continue;
          }

          if (!user.signer.nip44) {
            throw new Error('NIP-44 encryption not supported by your signer');
          }

          // Debug: Log event and signer details
          console.debug(`Attempting to decrypt token event ${event.id}`, {
            contentLength: event.content.length,
            contentPreview: event.content.substring(0, 50) + '...',
            signerType: user.signer?.constructor?.name,
            hasNip44: !!user.signer.nip44,
            userPubkey: user.pubkey,
            nip44Methods: user.signer.nip44 ? Object.keys(user.signer.nip44) : 'no nip44'
          });

          // Decrypt content with enhanced error handling
          let decrypted;
          try {
          console.debug(`Calling decrypt with params:`, {
            recipientPubkey: user.pubkey,
            contentType: typeof event.content,
            contentLength: event.content.length,
            isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(event.content),
            contentSample: event.content.substring(0, 50) + '...',
            eventId: event.id,
            eventKind: event.kind,
            eventAuthor: event.pubkey,
            currentUser: user.pubkey,
            isSelfEncrypted: event.pubkey === user.pubkey,
            decryptMethodExists: typeof user.signer.nip44.decrypt,
            signerMethods: Object.getOwnPropertyNames(user.signer.nip44)
          });            // Log the exact function call before making it
            console.debug(`About to call:`, `user.signer.nip44.decrypt("${user.pubkey}", "${event.content.substring(0, 20)}...")`);

          // Try the decryption with additional error checking
          const decryptResult = await user.signer.nip44.decrypt(user.pubkey, event.content);

          console.debug(`Raw decrypt result:`, {
            result: decryptResult,
            type: typeof decryptResult,
            isUndefined: decryptResult === undefined,
            isNull: decryptResult === null,
            isEmptyString: decryptResult === '',
            length: decryptResult?.length,
            constructor: decryptResult?.constructor?.name
          });

          // Check if result is valid before assigning
          if (decryptResult === undefined || decryptResult === null) {
            console.debug(`Primary decrypt failed, trying nostr-tools fallback...`);

            // Try using nostr-tools nip44 directly as fallback
            try {
              const { nip44 } = await import('nostr-tools');

              // For nsec signers, try to get private key if available
              let fallbackResult: string | null = null;

              if ((user.signer as any).getPrivateKey) {
                try {
                  const privateKey = await (user.signer as any).getPrivateKey();
                  fallbackResult = nip44.decrypt(event.content, privateKey);
                } catch (privKeyError) {
                  console.debug(`Private key access failed:`, privKeyError);
                }
              }

              console.debug(`Nostr-tools fallback result:`, {
                result: fallbackResult,
                type: typeof fallbackResult,
                isValid: typeof fallbackResult === 'string' && fallbackResult.length > 0
              });

              if (typeof fallbackResult === 'string' && fallbackResult.length > 0) {
                decrypted = fallbackResult;
                console.debug(`✅ Nostr-tools fallback successful for event ${event.id}`);
              } else {
                throw new Error(`Nostr-tools fallback also returned invalid result: ${fallbackResult}`);
              }
            } catch (fallbackError) {
              console.debug(`Nostr-tools fallback failed:`, fallbackError);

              // Final attempt: try alternative parameter order for self-encrypted events
              if (event.pubkey === user.pubkey) {
                console.debug(`Final attempt: alternative parameter order for self-encrypted event...`);
                try {
                  const finalResult = await user.signer.nip44.decrypt(event.pubkey, event.content);
                  if (typeof finalResult === 'string' && finalResult.length > 0) {
                    decrypted = finalResult;
                    console.debug(`✅ Alternative parameter order successful for event ${event.id}`);
                  } else {
                    throw new Error(`All decryption attempts failed. Library may be incompatible.`);
                  }
                } catch (finalError) {
                  throw new Error(`All decryption methods failed: Primary=${decryptResult}, Fallback=${fallbackError.message}, Final=${finalError.message}`);
                }
              } else {
                throw new Error(`Primary decrypt returned ${decryptResult}, nostr-tools fallback failed: ${fallbackError.message}`);
              }
            }
          } else {
            decrypted = decryptResult;
          }            console.debug(`Decrypt result:`, {
              resultType: typeof decrypted,
              resultValue: decrypted,
              isNull: decrypted === null,
              isUndefined: decrypted === undefined,
              length: decrypted?.length
            });
          } catch (decryptError) {
            console.error(`Raw decryption error for token event ${event.id}:`, {
              error: decryptError,
              errorMessage: decryptError.message,
              errorStack: decryptError.stack,
              signerInfo: {
                hasNip44: !!user.signer.nip44,
                nip44Type: typeof user.signer.nip44,
                methods: user.signer.nip44 ? Object.getOwnPropertyNames(user.signer.nip44) : 'none'
              }
            });
            throw decryptError;
          }

          // Validate decryption result
          if (!decrypted || typeof decrypted !== 'string') {
            console.warn(`Skipping token event ${event.id}: decryption returned invalid result:`, {
              decrypted,
              type: typeof decrypted,
              length: decrypted?.length
            });
            continue;
          }

          console.debug(`Successfully decrypted token event ${event.id}`, {
            decryptedLength: decrypted.length,
            decryptedPreview: decrypted.substring(0, 100) + '...'
          });

          const tokenData = JSON.parse(decrypted) as CashuToken;

          nip60TokenEvents.push({
            id: event.id,
            token: tokenData,
            createdAt: event.created_at
          });
          // add proofs to store
          cashuStore.addProofs(tokenData.proofs, event.id);

        } catch (error) {
          console.error('Failed to decrypt token data:', error);
        }
      }

      return nip60TokenEvents;
    },
    enabled: !!user
  });

  const updateProofsMutation = useMutation({
    mutationFn: async ({ mintUrl, proofsToAdd, proofsToRemove }: { mintUrl: string, proofsToAdd: Proof[], proofsToRemove: Proof[] }): Promise<NostrEvent | null> => {
      if (!user) throw new Error('User not logged in');
      if (!user.signer.nip44) {
        throw new Error('NIP-44 encryption not supported by your signer');
      }

      // get all event IDs of proofsToRemove
      const eventIdsToRemoveUnfiltered = proofsToRemove.map(proof => cashuStore.getProofEventId(proof));
      const eventIdsToRemove = [...new Set(eventIdsToRemoveUnfiltered.filter(id => id !== undefined) as string[])];

      // get all proofs with eventIdsToRemove
      const allProofsWithEventIds = eventIdsToRemove.map(id => cashuStore.getProofsByEventId(id)).flat();

      // and filter out those that we want to keep to roll them over to a new event
      const proofsToKeepWithEventIds = allProofsWithEventIds.filter(proof => !proofsToRemove.includes(proof));

      // combine proofsToAdd and proofsToKeepWithEventIds
      const newProofs = [...proofsToAdd, ...proofsToKeepWithEventIds];

      let eventToReturn: NostrEvent | null = null;

      if (newProofs.length) {
        // generate a new token event
        const newToken: CashuToken = {
          mint: mintUrl,
          proofs: newProofs,
          del: eventIdsToRemove
        }

        // encrypt token event
        const newTokenEventContent = await user.signer.nip44.encrypt(
          user.pubkey,
          JSON.stringify(newToken)
        );

        // create token event
        const newTokenEvent = await user.signer.signEvent({
          kind: CASHU_EVENT_KINDS.TOKEN,
          content: newTokenEventContent,
          tags: [],
          created_at: Math.floor(Date.now() / 1000)
        });

        // publish token event
        await nostr.event(newTokenEvent);

        // update local event IDs on all newProofs
        newProofs.forEach(proof => {
          cashuStore.setProofEventId(proof, newTokenEvent.id);
        });

        eventToReturn = newTokenEvent;
      }

      // delete nostr events
      if (eventIdsToRemove.length) {
        // create deletion event
        const deletionEvent = await user.signer.signEvent({
          kind: 5,
          content: 'Deleted token event',
          tags: eventIdsToRemove.map(id => ['e', id]),
          created_at: Math.floor(Date.now() / 1000)
        });

        // publish deletion event
        try {
          await nostr.event(deletionEvent);
        } catch (error) {
          console.error('Failed to publish deletion event:', error);
        }
      }

      // remove proofs from store
      const proofsToRemoveFiltered = proofsToRemove.filter(proof => !newProofs.includes(proof));
      cashuStore.removeProofs(proofsToRemoveFiltered);

      // add proofs to store
      cashuStore.addProofs(newProofs, eventToReturn?.id || '');

      return eventToReturn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashu', 'tokens', user?.pubkey] });
    }
  });

  // Helper function to get total balance
  const getTotalBalanceHelper = () => {
    return currentBalance;
  };

  return {
    wallet: walletQuery.data?.wallet,
    walletId: walletQuery.data?.id,
    tokens: getNip60TokensQuery.data || [],
    isLoading: walletQuery.isFetching || getNip60TokensQuery.isFetching,
    createWallet: createWalletMutation.mutate,
    createWalletAsync: createWalletMutation.mutateAsync,
    updateProofs: updateProofsMutation.mutateAsync,
    getTotalBalance: getTotalBalanceHelper,
    totalBalance: currentBalance, // Reactive balance value

    // Legacy compatibility properties
    mints: walletQuery.data?.wallet?.mints || [],
    addMint: (mintUrl: string) => {
      const currentWallet = walletQuery.data?.wallet;
      if (currentWallet && !currentWallet.mints.includes(mintUrl)) {
        createWalletMutation.mutate({
          ...currentWallet,
          mints: [...currentWallet.mints, mintUrl]
        });
      }
    },
    setActiveMintUrl: (mintUrl: string) => {
      cashuStore.setActiveMintUrl(mintUrl);
    },

    // Additional legacy properties for lightning components
    isWalletLoading: walletQuery.isFetching,
    isTokensLoading: getNip60TokensQuery.isFetching,
    walletError: walletQuery.error,
    tokensError: getNip60TokensQuery.error,
  };
}