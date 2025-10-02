import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { NPool, NRelay1 } from '@nostrify/nostrify';

export function useFollowing(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['following', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return { count: 0, pubkeys: [], event: null };

      console.log('📊 [useFollowing] Fetching following list for pubkey:', pubkey);

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // Try first with the main nostr instance
      let events = await nostr.query([
        {
          kinds: [3],
          authors: [pubkey],
          limit: 1,
        }
      ], { signal });

      console.log('📊 [useFollowing] Found contact list events from main pool:', events.length);

      // If no events found, try with a broader set of relays
      if (events.length === 0) {
        console.log('📊 [useFollowing] No events from main pool, trying with broader relay set...');

        // Create a temporary pool with more relays specifically for contact list lookup
        const tempPool = new NPool({
          open(url: string) {
            return new NRelay1(url);
          },
          reqRouter(filters) {
            const relayMap = new Map();
            // Use all these relays for contact list lookup
            const broadRelays = [
              'wss://relay.primal.net',
              'wss://relay.nostr.band',
              'wss://relay.damus.io',
              'wss://nos.lol',
              'wss://pyramid.fiatjaf.com',
              'wss://relay.snort.social',
              'wss://offchain.pub',
              'wss://relay.current.fyi'
            ];

            for (const relay of broadRelays) {
              relayMap.set(relay, filters);
            }
            return relayMap;
          },
          eventRouter() {
            return [];
          },
        });

        try {
          events = await tempPool.query([
            {
              kinds: [3],
              authors: [pubkey],
              limit: 1,
            }
          ], { signal });

          console.log('📊 [useFollowing] Found contact list events from broad search:', events.length);
        } finally {
          // Clean up the temporary pool
          tempPool.close();
        }
      }

      if (events.length === 0) {
        console.log('📊 [useFollowing] No contact list found even with broad search - returning 0 following');
        return { count: 0, pubkeys: [], event: null };
      }

      // Get the most recent contact list event
      const contactEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
      console.log('📊 [useFollowing] Contact event details:', {
        id: contactEvent.id,
        created_at: contactEvent.created_at,
        tags: contactEvent.tags.length,
        content: contactEvent.content?.slice(0, 100) + (contactEvent.content?.length > 100 ? '...' : ''),
      });

      // Extract pubkeys from 'p' tags
      const followingPubkeys = contactEvent.tags
        .filter(([tagName]) => tagName === 'p')
        .map(([, pubkey]) => pubkey)
        .filter(Boolean);

      console.log('📊 [useFollowing] Extracted following pubkeys count:', followingPubkeys.length);
      if (followingPubkeys.length > 0) {
        console.log('📊 [useFollowing] First 5 following pubkeys:', followingPubkeys.slice(0, 5));
      }

      return {
        count: followingPubkeys.length,
        pubkeys: followingPubkeys,
        event: contactEvent,
      };
    },
    enabled: !!pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry failed requests
    retryDelay: 1000, // 1 second between retries
  });
}
