import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrConnection } from '@/components/NostrProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CASHU_EVENT_KINDS, CashuToken, activateMint, defaultMints } from '@/lib/cashu';
import { NostrEvent, getPublicKey, generateSecretKey } from 'nostr-tools';
import { useCashuStore, Nip60TokenEvent, CashuWalletStruct } from '@/stores/cashuStore';
import { useCashuRelayStore } from '@/stores/cashuRelayStore';
import { Proof } from '@cashu/cashu-ts';
import { getLastEventTimestamp } from '@/lib/nostrTimestamps';
import { NSchema as n } from '@nostrify/nostrify';
import { z } from 'zod';
import { useAppContext } from '@/hooks/useAppContext';

interface WalletData {
  privkey: string;
  mints: string[];
}
import { useNutzaps } from '@/hooks/useNutzaps';
import { hexToBytes } from '@noble/hashes/utils';

/**
 * Hook to fetch and manage the user's Cashu wallet
 */
export function useCashuWallet() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { isAnyRelayConnected } = useNostrConnection();
  const queryClient = useQueryClient();
  const cashuStore = useCashuStore();
  const cashuRelayStore = useCashuRelayStore();
  const { createNutzapInfo } = useNutzaps();
  const { config } = useAppContext();

  // Check if Cashu operations should run in the current context
  const shouldRunCashuOperations = config.relayContext === 'all' || 
    config.relayContext === 'wallet' || 
    config.relayContext === 'cashu-only' || 
    config.relayContext === 'settings-cashu';

  // Fetch wallet information (kind 17375)
  const walletQuery = useQuery({
    queryKey: ['cashu', 'wallet', user?.pubkey, cashuRelayStore.activeRelay],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not logged in');

    if (import.meta.env.DEV) {
      console.log(`useCashuWallet: Starting wallet query with Cashu relay: ${cashuRelayStore.activeRelay}`);
      console.log('useCashuWallet: Query details:', {
        userPubkey: user.pubkey,
        activeRelay: cashuRelayStore.activeRelay,
        kinds: [CASHU_EVENT_KINDS.WALLET],
      });
    }

      // Add timeout to prevent hanging
      const timeoutSignal = AbortSignal.timeout(15000); // 15 second timeout
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

      // Enhanced wallet detection: check for both wallet events AND history events
      const queryFilter = { 
        kinds: [CASHU_EVENT_KINDS.WALLET, CASHU_EVENT_KINDS.HISTORY], 
        authors: [user.pubkey], 
        limit: 10 
      };
      const queryOptions = { 
        signal: combinedSignal,
        relays: [cashuRelayStore.activeRelay]
      };

      if (import.meta.env.DEV) {
        console.log('useCashuWallet: Query filter:', queryFilter);
        console.log('useCashuWallet: Query options:', queryOptions);
        console.log('useCashuWallet: CASHU_EVENT_KINDS.WALLET:', CASHU_EVENT_KINDS.WALLET);
        console.log('useCashuWallet: CASHU_EVENT_KINDS.HISTORY:', CASHU_EVENT_KINDS.HISTORY);
      }

      const events = await nostr.query([queryFilter], queryOptions);

    if (import.meta.env.DEV) {
      console.log(`useCashuWallet: Found ${events.length} wallet/history events`);
      if (events.length === 0) {
        console.log('useCashuWallet: No wallet or history events found - this might be why "Create Wallet" is showing');
        console.log('useCashuWallet: Checking if this is a relay connectivity issue...');
        
        // DEBUG: Also try a broader query to see if ANY events exist for this pubkey
        console.log('useCashuWallet: Trying broader query to check for ANY events by this pubkey...');
        try {
          const broadEvents = await nostr.query([
            { authors: [user.pubkey], limit: 10 }
          ], { 
            signal: AbortSignal.timeout(5000),
            relays: [cashuRelayStore.activeRelay]
          });
          console.log(`useCashuWallet: Found ${broadEvents.length} total events by this pubkey on relay`);
          if (broadEvents.length > 0) {
            console.log('useCashuWallet: Sample event kinds found:', broadEvents.map(e => e.kind));
          }
        } catch (error) {
          console.log('useCashuWallet: Broader query failed:', error);
        }
      } else {
        events.forEach((event, index) => {
          console.log(`useCashuWallet: Event ${index}:`, {
            id: event.id,
            kind: event.kind,
            pubkey: event.pubkey,
            created_at: event.created_at,
            content: event.content.substring(0, 100) + '...',
            tags: event.tags
          });
        });
      }
    }

      // Check if we have either wallet events or history events
      const walletEvents = events.filter(e => e.kind === CASHU_EVENT_KINDS.WALLET);
      const historyEvents = events.filter(e => e.kind === CASHU_EVENT_KINDS.HISTORY);
      
      if (import.meta.env.DEV) {
        console.log(`useCashuWallet: Found ${walletEvents.length} wallet events and ${historyEvents.length} history events`);
      }

      // If we have history events but no wallet events, return null to trigger UI flow
      if (walletEvents.length === 0 && historyEvents.length > 0) {
        if (import.meta.env.DEV) {
          console.log('useCashuWallet: No wallet config but history exists - allowing UI to handle wallet creation');
        }
        
        // Return null so the UI can detect this condition and show the "Recreate Wallet Configuration" flow
        return null;
      }

      if (walletEvents.length === 0) {
        return null;
      }

      const event = walletEvents[0];

      // Decrypt wallet content
      if (!user.signer.nip44) {
        throw new Error('Cashu wallet requires NIP-44 encryption support. Please ensure your Nostr extension has ENCRYPT and DECRYPT permissions enabled, or try reconnecting with a compatible extension like Alby.');
      }

      const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
      const data = n.json().pipe(z.string().array().array()).parse(decrypted);

      const privkey = data.find(([key]) => key === 'privkey')?.[1];

      if (!privkey) {
        throw new Error('Private key not found in wallet data');
      }

      const walletData: WalletData = {
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
    if (import.meta.env.DEV) {
      console.log('useCashuWallet: About to activate mints:', walletData.mints);
    }
      try {
        await Promise.all(walletData.mints.map(async (mint) => {
          const { mintInfo, keysets } = await activateMint(mint);
          
          cashuStore.addMint(mint);
          cashuStore.setMintInfo(mint, mintInfo);
          
          // The keysets object has a 'keysets' property that contains the actual keysets array
          const actualKeysets = (keysets as any).keysets || [];
          
          cashuStore.setKeysets(mint, actualKeysets);
        }));
      } catch (error) {
        console.error('useCashuWallet: Error activating mints:', error);
        throw error;
      }

    if (import.meta.env.DEV) {
      console.log('useCashuWallet: Setting privkey in store');
    }
      cashuStore.setPrivkey(walletData.privkey);

      // Create a complete wallet structure for the store
      const walletForStore: CashuWalletStruct = {
        id: event.id, // Use the event ID as wallet ID
        name: 'Cashu Wallet',
        unit: 'sat',
        mints: walletData.mints,
        balance: 0, // Will be calculated when proofs are added
        proofs: [],
        lastUpdated: Date.now(),
        event: event,
        privkey: walletData.privkey
      };

    if (import.meta.env.DEV) {
      console.log('useCashuWallet: Adding wallet to store:', walletForStore);
    }
      cashuStore.addWallet(walletForStore);

      // if no active mint is set, set the first mint as active
      if (!cashuStore.getActiveMintUrl()) {
      if (import.meta.env.DEV) {
        console.log('useCashuWallet: Setting active mint:', walletData.mints[0]);
      }
        cashuStore.setActiveMintUrl(walletData.mints[0]);
      }

      // log wallet data
      console.log('useCashuWallet: Final wallet data:', walletData);
      
      console.log('useCashuWallet: Returning wallet data successfully');
      return {
        id: event.id,
        wallet: walletData,
        createdAt: event.created_at
      };
    },
    enabled: !!user && isAnyRelayConnected && shouldRunCashuOperations,
    staleTime: 30 * 60 * 1000, // Consider data stale after 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Disable automatic refetching
    retry: 1, // Only retry once on failure
  });

  // Create or update wallet
  const createWalletMutation = useMutation({
    mutationFn: async (walletData: CashuWalletStruct) => {
      if (!user) throw new Error('User not logged in');
      if (!user.signer.nip44) {
        throw new Error('Cashu wallet creation requires NIP-44 encryption support. Please ensure your Nostr extension has ENCRYPT and DECRYPT permissions enabled.');
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
        if (walletData.privkey) {
          await createNutzapInfo({
            mintOverrides: walletData.mints.map(mint => ({
              url: mint,
              units: ['sat']
            })),
            p2pkPubkey: "02" + getPublicKey(hexToBytes(walletData.privkey))
          });
        }
      } catch (error) {
        console.error('Failed to create nutzap informational event:', error);
        // Continue even if nutzap info creation fails
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for event to be published

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashu', 'wallet', user?.pubkey, cashuRelayStore.activeRelay] });
      queryClient.invalidateQueries({ queryKey: ['nutzap', 'info', user?.pubkey] });
    }
  });

  // Fetch token events (kind 7375)
  const getNip60TokensQuery = useQuery({
    queryKey: ['cashu', 'tokens', user?.pubkey, cashuRelayStore.activeRelay],
    queryFn: async ({ signal }) => {
      console.log(`useCashuWallet: Starting NIP60 tokens query with Cashu relay: ${cashuRelayStore.activeRelay}`, { userPubkey: user?.pubkey });
      
      if (!user) throw new Error('User not logged in');

      // Add timeout to prevent hanging
      const timeoutSignal = AbortSignal.timeout(15000); // 15 second timeout
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

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

      console.log('useCashuWallet: Querying for NIP60 tokens with filter:', filter);

      const events = await nostr.query([filter], { 
        signal: combinedSignal,
        relays: [cashuRelayStore.activeRelay]
      });

      console.log('useCashuWallet: Found NIP60 token events:', events.length);

      if (events.length === 0) {
        console.log('useCashuWallet: No token events found, returning empty array');
        return [];
      }

      const nip60TokenEvents: Nip60TokenEvent[] = [];

      for (const event of events) {
        try {
          if (!user.signer.nip44) {
            throw new Error('NIP-44 encryption not supported by your signer');
          }

          const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
          const tokenData = JSON.parse(decrypted) as CashuToken;

          nip60TokenEvents.push({
            id: event.id,
            token: tokenData,
            createdAt: event.created_at
          });
          
          // add proofs to store
          if (tokenData.proofs && tokenData.proofs.length > 0) {
            cashuStore.addProofs(tokenData.proofs, event.id);
          }

        } catch (error) {
          console.error('Failed to decrypt token data:', error);
        }
      }

      console.log(`useCashuWallet: Found ${nip60TokenEvents.length} NIP60 token events`);

      return nip60TokenEvents;
    },
    enabled: !!user && isAnyRelayConnected && shouldRunCashuOperations,
    staleTime: 30 * 60 * 1000, // Consider data stale after 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour  
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: false, // Disable automatic refetching
    retry: 1, // Only retry once on failure
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

        // add proofs to store
        cashuStore.addProofs(newProofs, newTokenEvent?.id || '');

        // publish token event
        try {
          await nostr.event(newTokenEvent);
        } catch (error) {
          console.error('Failed to publish token event:', error);
        }

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

        // remove proofs from store
        const proofsToRemoveFiltered = proofsToRemove.filter(proof => !newProofs.map(p => p.secret).includes(proof.secret));
        cashuStore.removeProofs(proofsToRemoveFiltered);

        // publish deletion event
        try {
          await nostr.event(deletionEvent);
        } catch (error) {
          console.error('Failed to publish deletion event:', error);
        }
      }

      return eventToReturn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashu', 'tokens', user?.pubkey, cashuRelayStore.activeRelay] });
    }
  });

  return {
    wallet: walletQuery.data?.wallet,
    walletId: walletQuery.data?.id,
    tokens: getNip60TokensQuery.data || [],
    isLoading: walletQuery.isLoading || getNip60TokensQuery.isLoading,
    isWalletLoading: walletQuery.isLoading,
    isTokensLoading: getNip60TokensQuery.isLoading,
    walletError: walletQuery.error,
    tokensError: getNip60TokensQuery.error,
    createWallet: createWalletMutation.mutate,
    updateProofs: updateProofsMutation.mutateAsync,
  };
}
