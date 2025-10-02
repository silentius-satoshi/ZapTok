import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useAuthor(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: ['author', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return {};
      }

      // Improved signal handling
      const timeoutSignal = AbortSignal.timeout(3000);
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

      const filter = { kinds: [0], authors: [pubkey!], limit: 1 };

      const [event] = await nostr.query(
        [filter],
        { signal: combinedSignal },
      );

      if (!event) {
        throw new Error('No event found');
      }

      try {
        const metadata = n.json().pipe(n.metadata()).parse(event.content);
        return { metadata, event };
      } catch (error) {
        console.warn('[useAuthor] Failed to parse metadata JSON:', error);
        return { event };
      }
    },
    enabled: !!pubkey,
    retry: 3,
    // Optimized cache configuration for single author metadata
    staleTime: 10 * 60 * 1000,    // 10 minutes - metadata is stable
    gcTime: 60 * 60 * 1000,      // 1 hour - keep author profiles longer  
    refetchOnWindowFocus: false,  // Don't refetch on focus
    refetchOnReconnect: false,    // Don't refetch on reconnect
  });
}
