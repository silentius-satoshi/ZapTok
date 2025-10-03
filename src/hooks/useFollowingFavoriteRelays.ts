import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from './useCurrentUser';
import { useFollowing } from './useFollowing';
import followingFavoriteRelaysService from '@/services/followingFavoriteRelays.service';

/**
 * Hook to fetch and display favorite relays from users you follow.
 * 
 * Returns aggregated relay data sorted by popularity, where each entry
 * contains the relay URL and an array of pubkeys who favorited it.
 * 
 * Uses LRU caching with 10-minute TTL for optimal performance.
 * 
 * @example
 * ```tsx
 * const { data: relays, isLoading } = useFollowingFavoriteRelays();
 * 
 * relays?.forEach(([relayUrl, pubkeys]) => {
 *   console.log(`${relayUrl} - favorited by ${pubkeys.length} users`);
 * });
 * ```
 */
export function useFollowingFavoriteRelays() {
  const { user } = useCurrentUser();
  const { data: followingData } = useFollowing(user?.pubkey || '');

  return useQuery({
    queryKey: ['following-favorite-relays', user?.pubkey, followingData?.pubkeys],
    queryFn: async () => {
      if (!user?.pubkey || !followingData?.pubkeys || followingData.pubkeys.length === 0) {
        return [];
      }

      return followingFavoriteRelaysService.fetchFollowingFavoriteRelays(
        user.pubkey,
        followingData.pubkeys
      );
    },
    enabled: !!user?.pubkey && !!followingData?.pubkeys && followingData.pubkeys.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes (matches LRU cache TTL)
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}
