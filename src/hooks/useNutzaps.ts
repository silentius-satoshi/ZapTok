import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuStore } from '@/stores/cashuStore';
import { useNutzapStore } from '@/stores/nutzapStore';
import { CASHU_EVENT_KINDS } from '@/lib/cashu';
import type { NostrEvent } from 'nostr-tools';

export interface NutzapInformationalEvent {
  event: NostrEvent;
  relays: string[];
  mints: Array<{
    url: string;
    units?: string[];
  }>;
  p2pkPubkey: string;
}

interface UseNutzapsResult {
  createNutzapInfo: (params: {
    relays?: string[];
    mintOverrides?: Array<{ url: string, units?: string[] }>;
    p2pkPubkey: string;
  }) => void;
  isCreatingNutzapInfo: boolean;
}

/**
 * Hook to fetch a nutzap informational event for a specific pubkey
 */
export function useNutzapInfo(pubkey?: string) {
  const { nostr } = useNostr();
  const nutzapStore = useNutzapStore();

  return useQuery({
    queryKey: ['nutzap', 'info', pubkey],
    queryFn: async ({ signal }) => {
      if (!pubkey) throw new Error('Pubkey required');

      // First check if we have it in the store
      const storedInfo = nutzapStore.getNutzapInfo(pubkey);
      if (storedInfo) {
        return storedInfo;
      }

      // Otherwise fetch it from the network
      const events = await nostr.query([
        { kinds: [CASHU_EVENT_KINDS.ZAPINFO], authors: [pubkey], limit: 1 }
      ], { signal });

      if (events.length === 0) {
        throw new Error('No nutzap info found for this pubkey');
      }

      const event = events[0];

      // Parse the nutzap informational event
      const relays = event.tags
        .filter(tag => tag[0] === 'relay')
        .map(tag => tag[1]);

      const mints = event.tags
        .filter(tag => tag[0] === 'mint')
        .map(tag => {
          const [, url, units] = tag;
          return {
            url,
            units: units ? units.split(',') : ['sat']
          };
        });

      const p2pkPubkeyTag = event.tags.find(tag => tag[0] === 'pubkey');
      if (!p2pkPubkeyTag) {
        throw new Error('No P2PK pubkey found in nutzap info');
      }

      const p2pkPubkey = p2pkPubkeyTag[1];

      const nutzapInfo: NutzapInformationalEvent = {
        event,
        relays,
        mints,
        p2pkPubkey
      };

      // Store the info for future use
      nutzapStore.setNutzapInfo(pubkey, nutzapInfo);

      return nutzapInfo;
    },
    enabled: !!pubkey
  });
}

/**
 * Hook to manage Nutzap informational events (NIP-61)
 */
export function useNutzaps(): UseNutzapsResult {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const nutzapStore = useNutzapStore();
  const cashuStore = useCashuStore();

  // Create or update nutzap informational event
  const createNutzapInfoMutation = useMutation({
    mutationFn: async ({
      relays,
      mintOverrides,
      p2pkPubkey
    }: {
      relays?: string[];
      mintOverrides?: Array<{ url: string, units?: string[] }>;
      p2pkPubkey: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Get mints from store or override
      const mintsToUse = mintOverrides || cashuStore.mints.map(mint => ({
        url: mint.url,
        units: ['sat']
      }));

      console.log('[createNutzapInfo] Debug info:', {
        mintsToUse,
        relays,
        p2pkPubkey,
        cashuStoreMints: cashuStore.mints,
        mintOverrides
      });

      // Create tags for the new event
      const newTags = [
        ...(relays || []).map(relay => ['relay', relay]),
        ...mintsToUse.map(mint => {
          const units = mint.units?.join(',') || 'sat';
          return ['mint', mint.url, units];
        }),
        ['pubkey', p2pkPubkey]
      ];

      console.log('[createNutzapInfo] Generated tags:', newTags);

      // Check if we already have a nutzap info event with the same content
      try {
        const existingEvents = await nostr.query([
          { kinds: [CASHU_EVENT_KINDS.ZAPINFO], authors: [user.pubkey], limit: 1 }
        ], { signal: AbortSignal.timeout(5000) });

        if (existingEvents.length > 0) {
          const existingEvent = existingEvents[0];
          
          // Compare tags to see if content has changed
          const existingTagsString = JSON.stringify(existingEvent.tags.sort());
          const newTagsString = JSON.stringify(newTags.sort());
          
          if (existingTagsString === newTagsString) {
            console.log('[createNutzapInfo] Existing nutzap info is up to date, skipping creation');
            
            // Store the existing event in local store and return
            const nutzapInfo: NutzapInformationalEvent = {
              event: existingEvent,
              relays: relays || [],
              mints: mintsToUse,
              p2pkPubkey
            };
            
            nutzapStore.setNutzapInfo(user.pubkey, nutzapInfo);
            return existingEvent;
          }
          
          console.log('[createNutzapInfo] Nutzap info content has changed, updating...');
        }
      } catch (error) {
        console.log('[createNutzapInfo] Could not fetch existing nutzap info, creating new one:', error);
      }

      // Create nutzap info event (only if no existing event or content changed)
      const event = await user.signer.signEvent({
        kind: CASHU_EVENT_KINDS.ZAPINFO,
        content: '',
        tags: newTags,
        created_at: Math.floor(Date.now() / 1000)
      });

      // Publish event
      await nostr.event(event);

      // Store in local store
      const nutzapInfo: NutzapInformationalEvent = {
        event,
        relays: relays || [],
        mints: mintsToUse,
        p2pkPubkey
      };

      nutzapStore.setNutzapInfo(user.pubkey, nutzapInfo);

      return event;
    },
    onSuccess: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['nutzap', 'info', user.pubkey] });
      }
    }
  });

  return {
    createNutzapInfo: createNutzapInfoMutation.mutate,
    isCreatingNutzapInfo: createNutzapInfoMutation.isPending,
  };
}