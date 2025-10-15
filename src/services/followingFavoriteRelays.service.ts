import { LRUCache } from 'lru-cache';
import { getSimplePoolRelays, fetchEvents } from '@/lib/simplePool';
import { normalizeURL } from 'nostr-tools/utils';

// Default relays to use when no configuration is available
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine',
];

/**
 * Service for aggregating favorite relays from users you follow.
 * 
 * Based on Jumble's implementation pattern:
 * - Fetches NIP-65 relay lists (kind 10002) from following list
 * - Fetches relay set events (kind 30002) from following list  
 * - Aggregates and sorts by popularity (most favorited first)
 * - Returns [relayUrl, [pubkeys who favorited it]][]
 * 
 * Cache Strategy:
 * - LRU cache: 10 aggregate results max
 * - TTL: 10 minutes (aligned with Jumble's aggregate cache)
 * - No IndexedDB persistence in this simplified version
 */
class FollowingFavoriteRelaysService {
  private static instance: FollowingFavoriteRelaysService;

  private aggregateCache = new LRUCache<string, Promise<[string, string[]][]>>({
    max: 10,
    ttl: 1000 * 60 * 10, // 10 minutes
    fetchMethod: this._fetchFollowingFavoriteRelays.bind(this),
  });

  private constructor() {}

  public static getInstance(): FollowingFavoriteRelaysService {
    if (!FollowingFavoriteRelaysService.instance) {
      FollowingFavoriteRelaysService.instance = new FollowingFavoriteRelaysService();
    }
    return FollowingFavoriteRelaysService.instance;
  }

  /**
   * Fetch and aggregate favorite relays from users you follow.
   * 
   * @param pubkey - The pubkey whose following list to analyze
   * @param followings - Array of pubkeys this user follows
   * @returns Array of [relayUrl, [pubkeys who favorited it]][] sorted by popularity
   */
  async fetchFollowingFavoriteRelays(
    pubkey: string,
    followings: string[]
  ): Promise<[string, string[]][]> {
    const cacheKey = `${pubkey}:${followings.join(',')}`;
    const result = await this.aggregateCache.fetch(cacheKey, { signal: AbortSignal.timeout(5000) });
    return result || [];
  }

  /**
   * Internal method to fetch and aggregate relay data.
   * Called by LRU cache's fetchMethod.
   */
  private async _fetchFollowingFavoriteRelays(
    cacheKey: string,
    _staleValue: undefined | [string, string[]][],
    { signal }: { signal: AbortSignal }
  ): Promise<[string, string[]][]> {
    // Extract followings from cache key
    const followings = cacheKey.split(':')[1]?.split(',') || [];
    
    if (followings.length === 0) {
      return [];
    }

    try {
      // Fetch NIP-65 relay lists (kind 10002) from following users
      // Limit to first 5 relays for performance (Jumble pattern)
      const relayUrls = getSimplePoolRelays(DEFAULT_RELAYS).slice(0, 5);
      
      const events = await fetchEvents(
        relayUrls,
        {
          kinds: [10002], // NIP-65 relay list
          authors: followings,
          limit: 1000,
        },
        { signal }
      );

      // Track latest event per author (replaceable event)
      const latestEventPerAuthor = new Map<string, typeof events[0]>();
      
      events.forEach((event) => {
        const existing = latestEventPerAuthor.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          latestEventPerAuthor.set(event.pubkey, event);
        }
      });

      // Aggregate relays and track which users favorited them
      const relayMap = new Map<string, Set<string>>();

      latestEventPerAuthor.forEach((event) => {
        event.tags.forEach(([tagName, tagValue]) => {
          if (tagName === 'r' && tagValue) {
            try {
              const normalizedUrl = normalizeURL(tagValue);
              if (!relayMap.has(normalizedUrl)) {
                relayMap.set(normalizedUrl, new Set());
              }
              relayMap.get(normalizedUrl)!.add(event.pubkey);
            } catch {
              // Skip invalid URLs
            }
          }
        });
      });

      // Sort by popularity (most favorited first)
      const relayMapEntries = Array.from(relayMap.entries())
        .sort((a, b) => b[1].size - a[1].size)
        .map(([url, pubkeys]) => [url, Array.from(pubkeys)] as [string, string[]]);

      return relayMapEntries;
    } catch (error) {
      console.error('Error fetching following favorite relays:', error);
      return [];
    }
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.aggregateCache.clear();
  }
}

export default FollowingFavoriteRelaysService.getInstance();
