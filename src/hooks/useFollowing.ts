import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';

export function useFollowing(pubkey: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['following', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return { count: 0, pubkeys: [], event: null };

      console.log('📊 [useFollowing] Fetching following list for pubkey:', pubkey);

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query for the user's contact list (kind 3)
      const events = await nostr.query([
        {
          kinds: [3],
          authors: [pubkey],
          limit: 1,
        }
      ], { signal });

      console.log('📊 [useFollowing] Found contact list events:', events.length);

      if (events.length === 0) {
        console.log('📊 [useFollowing] No contact list found - returning 0 following');
        return { count: 0, pubkeys: [], event: null };
      }

      // Get the most recent contact list event
      const contactEvent = events[0];
      console.log('📊 [useFollowing] Contact event details:', {
        id: contactEvent.id,
        created_at: contactEvent.created_at,
        tags: contactEvent.tags.length,
        content: contactEvent.content,
      });
      
      // Extract pubkeys from 'p' tags
      const followingPubkeys = contactEvent.tags
        .filter(([tagName]) => tagName === 'p')
        .map(([, pubkey]) => pubkey)
        .filter(Boolean);

      console.log('📊 [useFollowing] Extracted following pubkeys:', followingPubkeys);
      console.log('📊 [useFollowing] Following count:', followingPubkeys.length);

      return {
        count: followingPubkeys.length,
        pubkeys: followingPubkeys,
        event: contactEvent,
      };
    },
    enabled: !!pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
