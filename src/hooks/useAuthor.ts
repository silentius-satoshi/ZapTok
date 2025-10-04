import { type NostrEvent, type NostrMetadata } from '@nostrify/nostrify';
import { useQuery } from '@tanstack/react-query';
import client from '@/services/client.service';

/**
 * Hook to fetch author profile data using DataLoader batching
 * 
 * Follows Jumble's architecture:
 * - Uses centralized client.service.ts with DataLoader
 * - Automatically batches concurrent profile requests (50ms window)
 * - Queries BIG_RELAY_URLS for maximum discoverability
 * - Eliminates rate limiting errors from individual queries
 * 
 * Performance Benefits:
 * - Multiple useAuthor calls within 50ms = 1 batched query
 * - Example: 50 concurrent profile loads → 1 query instead of 50
 * - No more relay rate limiting errors
 * 
 * @param pubkey - Nostr public key (hex format)
 * @returns React Query result with profile data
 */
export function useAuthor(pubkey: string | undefined) {
  return useQuery<{ event?: NostrEvent; metadata?: NostrMetadata }>({
    queryKey: ['author', pubkey ?? ''],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        return {};
      }

      // Fetch profile via DataLoader (auto-batched)
      const profile = await client.fetchProfile(pubkey);

      if (!profile) {
        throw new Error('No event found');
      }

      return {
        metadata: profile.metadata,
        event: profile.event,
      };
    },
    enabled: !!pubkey,
    retry: 3,
    // Optimized cache configuration for single author metadata
    staleTime: 10 * 60 * 1000,    // 10 minutes - metadata is stable
    gcTime: 60 * 60 * 1000,       // 1 hour - keep author profiles longer  
    refetchOnWindowFocus: false,  // Don't refetch on focus
    refetchOnReconnect: false,    // Don't refetch on reconnect
  });
}