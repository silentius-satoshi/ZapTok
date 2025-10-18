import { useSimplePool } from '@/hooks/useSimplePool';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { fetchEvents } from '@/lib/simplePool';

/**
 * Hook to fetch a specific event by its ID
 * 
 * Uses SimplePool for social events (not Cashu operations).
 * Part of dual-pool architecture where SimplePool handles all social features.
 * 
 * Updated to use async fetchEvents instead of querySync to properly fetch
 * events from relays rather than only checking cache.
 */
export function useEvent(eventId?: string) {
  const { simplePoolRelays } = useSimplePool();

  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      
      // Use fetchEvents to actually query relays (not just cache)
      const events = await fetchEvents(simplePoolRelays, { ids: [eventId] });
      
      return events[0] || null;
    },
    enabled: !!eventId && simplePoolRelays.length > 0,
    // Snort-inspired cache configuration for events
    staleTime: 30 * 60 * 1000,    // 30 minutes - events are immutable
    gcTime: 2 * 60 * 60 * 1000,  // 2 hours - keep events longer
    refetchOnWindowFocus: false,  // Events never change, no need to refetch
    refetchOnReconnect: false,    // Events are immutable
  });
}