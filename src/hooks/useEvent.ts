import { useNostr } from '@/hooks/useNostr';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to fetch a specific event by its ID
 */
export function useEvent(eventId?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async ({ signal }) => {
      if (!eventId) return null;
      
      const events = await nostr.query(
        [{ ids: [eventId] }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]) }
      );
      
      return events[0] || null;
    },
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
