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
 * @param pubkey - Optional: Current user's public key (if not provided, uses current user)
 * @param followings - Optional: Array of pubkeys being followed (if not provided, fetches from useFollowing)
 * 
 * @example
 * ```tsx
 * // Auto mode: uses current user and their following list
 * const { data: relays, isLoading } = useFollowingFavoriteRelays();
 * 
 * // Manual mode: specify pubkey and followings (useful for feed optimization)
 * const { data: relays } = useFollowingFavoriteRelays(userPubkey, followingPubkeys);
 * 
 * relays?.forEach(([relayUrl, pubkeys]) => {
 *   console.log(`${relayUrl} - favorited by ${pubkeys.length} users`);
 * });
 * ```
 */
export function useFollowingFavoriteRelays(
  pubkey?: string,
  followings?: string[]
) {
  // Auto mode: get current user and following list
  const { user } = useCurrentUser();
  const { data: followingData } = useFollowing(user?.pubkey || '');

  // Use provided values or fall back to auto mode
  const targetPubkey = pubkey || user?.pubkey;
  const targetFollowings = followings || followingData?.pubkeys || [];

  return useQuery({
    queryKey: ['following-favorite-relays', targetPubkey, targetFollowings.join(',')],
    queryFn: async () => {
      if (!targetPubkey || targetFollowings.length === 0) {
        return [];
      }

      return followingFavoriteRelaysService.fetchFollowingFavoriteRelays(
        targetPubkey,
        targetFollowings
      );
    },
    enabled: !!targetPubkey && targetFollowings.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes (matches LRU cache TTL)
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
}
