import { useSimplePool } from '@/hooks/useSimplePool';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to fetch a specific event by its ID
 * 
 * Uses SimplePool for social events (not Cashu operations).
 * Part of dual-pool architecture where SimplePool handles all social features.
 */
export function useEvent(eventId?: string) {
  const { simplePool, simplePoolRelays } = useSimplePool();

  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      const events = simplePool.querySync(simplePoolRelays, { ids: [eventId] });
      
      return events[0] || null;
    },
    enabled: !!eventId,
    // Snort-inspired cache configuration for events
    staleTime: 30 * 60 * 1000,    // 30 minutes - events are immutable
    gcTime: 2 * 60 * 60 * 1000,  // 2 hours - keep events longer
    refetchOnWindowFocus: false,  // Events never change, no need to refetch
    refetchOnReconnect: false,    // Events are immutable
  });
}