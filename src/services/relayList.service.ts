import { NostrEvent } from '@nostrify/nostrify';
import DataLoader from 'dataloader';
import indexedDBService from './indexedDB.service';

export interface RelayListConfig {
  read: string[];
  write: string[];
}

// Default relays for reliable connectivity
const DEFAULT_RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://relay.primal.net',
  'wss://nos.lol'
];

/**
 * Service for managing NIP-65 relay lists with caching and performance optimization
 * Enhanced with DataLoader pattern for batched operations and enterprise-grade architecture
 */
class RelayListService {
  private cache = new Map<string, RelayListConfig>();

  // Default relays for reliable connectivity (production-grade fallback)
  private readonly BIG_RELAY_URLS = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://nostr.mom'
  ];

  // DataLoader for batched relay list fetching - will be created per nostr instance
  private relayListDataLoaders = new Map<any, DataLoader<string, RelayListConfig>>();

  /**
   * Get or create a DataLoader for a specific nostr instance
   */
  private getDataLoader(nostr?: any): DataLoader<string, RelayListConfig> {
    const key = nostr || 'default';
    
    if (!this.relayListDataLoaders.has(key)) {
      const dataLoader = new DataLoader<string, RelayListConfig>(
        async (pubkeys) => {
          return this.batchFetchRelayLists(Array.from(pubkeys), nostr);
        },
        {
          maxBatchSize: 50, // Jumble uses similar batch sizes
          batchScheduleFn: (callback) => setTimeout(callback, 10), // Small delay for batching
          cacheKeyFn: (pubkey) => pubkey,
          cache: false // We handle caching manually with TTL
        }
      );
      this.relayListDataLoaders.set(key, dataLoader);
    }
    
    return this.relayListDataLoaders.get(key)!;
  }

  /**
   * Batch fetch relay lists for multiple users
   * Efficient batching pattern with IndexedDB coordination
   */
  private async batchFetchRelayLists(pubkeys: string[], nostr?: any): Promise<RelayListConfig[]> {
    try {
      // First check IndexedDB for cached entries
      const cachedResults = await Promise.all(
        pubkeys.map(async (pubkey) => {
          const cached = await indexedDBService.getRelayListEvent(pubkey);
          if (cached) {
            return { pubkey, event: cached, fromCache: true };
          }
          return { pubkey, event: null, fromCache: false };
        })
      );

      // Separate cached and uncached pubkeys
      const cachedConfigs = new Map<string, RelayListConfig>();
      const uncachedPubkeys: string[] = [];

      cachedResults.forEach(({ pubkey, event, fromCache }) => {
        if (event && fromCache) {
          const config = this.parseRelayList(event);
          cachedConfigs.set(pubkey, config);
          // Also update memory cache
          this.updateCache(pubkey, config);
        } else {
          uncachedPubkeys.push(pubkey);
        }
      });

      // Fetch uncached entries from nostr if needed
      const freshEventMap = new Map<string, NostrEvent>();
      if (uncachedPubkeys.length > 0) {
        if (!nostr) {
          console.warn('Nostr instance not available for batch fetch, using defaults');
          // Fill remaining with defaults
          uncachedPubkeys.forEach(pubkey => {
            cachedConfigs.set(pubkey, this.getDefaultRelayList());
          });
        } else {
          const events = await nostr.query([{
            kinds: [10002], // NIP-65 relay list
            authors: uncachedPubkeys,
            limit: uncachedPubkeys.length
          }], { signal: AbortSignal.timeout(8000) });

          // Create map of pubkey -> latest event
          events.forEach((event: NostrEvent) => {
            const existing = freshEventMap.get(event.pubkey);
            if (!existing || event.created_at > existing.created_at) {
              freshEventMap.set(event.pubkey, event);
            }
          });

          // Cache fresh events in IndexedDB
          await Promise.all(
            Array.from(freshEventMap.values()).map(event =>
              indexedDBService.putRelayListEvent(event)
            )
          );

          // Parse fresh events and update caches
          freshEventMap.forEach((event, pubkey) => {
            const relayList = this.parseRelayList(event);
            cachedConfigs.set(pubkey, relayList);
            this.updateCache(pubkey, relayList);
          });

          // Fill missing with defaults
          uncachedPubkeys.forEach(pubkey => {
            if (!cachedConfigs.has(pubkey)) {
              const defaultList = this.getDefaultRelayList();
              cachedConfigs.set(pubkey, defaultList);
            }
          });
        }
      }

      // Return relay lists in same order as requested pubkeys
      return pubkeys.map(pubkey => cachedConfigs.get(pubkey)!);
    } catch (error) {
      console.error('Batch fetch relay lists failed:', error);

      // Return fallbacks for all requested pubkeys
      return pubkeys.map(pubkey => {
        // Try cache first
        if (this.cache.has(pubkey) && this.isCacheValid(pubkey)) {
          return this.cache.get(pubkey)!;
        }
        return this.getDefaultRelayList();
      });
    }
  }

  /**
   * Validates relay list with production-grade logic
   * Falls back to default relays if too many configured (>8)
   */
  validateRelayList(read: string[], write: string[]): RelayListConfig {
    // Production validation: fallback if too many relays (>8)
    if (read.length > 8 || write.length > 8) {
      console.warn('Too many relays configured, falling back to defaults');
      return {
        read: DEFAULT_RELAY_URLS,
        write: DEFAULT_RELAY_URLS
      };
    }

    return {
      read: read.length > 0 ? read : this.BIG_RELAY_URLS,
      write: write.length > 0 ? write : this.BIG_RELAY_URLS
    };
  }

  /**
   * Creates default relay list for new users
   */
  getDefaultRelayList(): RelayListConfig {
    return {
      read: this.BIG_RELAY_URLS,
      write: this.BIG_RELAY_URLS
    };
  }

  /**
   * Get user's relay list from NIP-65 events with caching and batching
   * @param pubkey User's public key
   * @param nostr Nostr instance for querying (optional, will use global if not provided)
   * @param forceRefresh Force refresh from relays, bypassing cache
   */
  async getUserRelayList(pubkey: string, nostr?: any, forceRefresh: boolean = false): Promise<RelayListConfig> {
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && this.cache.has(pubkey) && this.isCacheValid(pubkey)) {
      return this.cache.get(pubkey)!;
    }

    try {
      // Use DataLoader for efficient batched fetching
      if (forceRefresh) {
        // Clear cache and DataLoader cache for this pubkey
        this.clearCache(pubkey);
        const dataLoader = this.getDataLoader(nostr);
        dataLoader.clear(pubkey);
      }

      return await this.getDataLoader(nostr).load(pubkey);
    } catch (error) {
      console.error('Failed to fetch relay list for', pubkey, error);

      // Return cached data if available, otherwise fallback
      if (this.cache.has(pubkey)) {
        return this.cache.get(pubkey)!;
      }

      return this.getDefaultRelayList();
    }
  }

  /**
   * Batch fetch relay lists for multiple users efficiently
   * Optimized pattern for handling multiple user queries
   */
  async getUserRelayLists(pubkeys: string[], nostr?: any, forceRefresh: boolean = false): Promise<RelayListConfig[]> {
    if (forceRefresh) {
      // Clear caches for all requested pubkeys
      const dataLoader = this.getDataLoader(nostr);
      pubkeys.forEach(pubkey => {
        this.clearCache(pubkey);
        dataLoader.clear(pubkey);
      });
    }

    try {
      const results = await this.getDataLoader(nostr).loadMany(pubkeys);

      // Handle potential errors in DataLoader results
      return results.map((result, index) => {
        if (result instanceof Error) {
          console.error('Failed to fetch relay list for', pubkeys[index], result);

          // Try cache fallback
          const pubkey = pubkeys[index];
          if (this.cache.has(pubkey) && this.isCacheValid(pubkey)) {
            return this.cache.get(pubkey)!;
          }
          return this.getDefaultRelayList();
        }
        return result;
      });
    } catch (error) {
      console.error('Failed to batch fetch relay lists:', error);

      // Return individual fallbacks
      return pubkeys.map(pubkey => {
        if (this.cache.has(pubkey) && this.isCacheValid(pubkey)) {
          return this.cache.get(pubkey)!;
        }
        return this.getDefaultRelayList();
      });
    }
  }

  /**
   * Parse NIP-65 relay list event into read/write arrays
   */
  private parseRelayList(event?: NostrEvent): RelayListConfig {
    if (!event) {
      return this.getDefaultRelayList();
    }

    const read: string[] = [];
    const write: string[] = [];

    event.tags.forEach(tag => {
      if (tag[0] === 'r' && tag[1]) {
        const url = tag[1];
        const scope = tag[2];

        // NIP-65: no marker means both read and write
        if (!scope) {
          read.push(url);
          write.push(url);
        } else if (scope === 'read') {
          read.push(url);
        } else if (scope === 'write') {
          write.push(url);
        }
      }
    });

    // Validate relay counts with production-grade approach
    return this.validateRelayList(read, write);
  }

  /**
   * Warm relay list cache on service initialization
   */
  private async warmRelayListCache(): Promise<void> {
    try {
      const storedEvents = await indexedDBService.getAllRelayListEvents();
      storedEvents.forEach(({ pubkey, event }) => {
        const relayList = this.parseRelayList(event);
        this.cache.set(pubkey, relayList);
      });
    } catch (error) {
      console.warn('Failed to warm relay list cache:', error);
    }
  }

  /**
   * Update cache (no expiry, event-driven invalidation)
   */
  private updateCache(pubkey: string, relayList: RelayListConfig): void {
    this.cache.set(pubkey, relayList);
  }

  /**
   * Update cache when newer NIP-65 event is received (event-driven pattern)
   */
  async updateRelayListFromEvent(event: NostrEvent): Promise<void> {
    const existing = this.cache.get(event.pubkey);
    const cachedEvent = await indexedDBService.getRelayListEvent(event.pubkey);

    // Only update if this event is newer (production compareEvents logic)
    if (!cachedEvent || event.created_at > cachedEvent.created_at) {
      const relayList = this.parseRelayList(event);
      this.updateCache(event.pubkey, relayList);
      await indexedDBService.putRelayListEvent(event);
      
      // Prime all DataLoaders that might be interested in this pubkey
      this.relayListDataLoaders.forEach(dataLoader => {
        dataLoader.prime(event.pubkey, relayList);
      });
    }
  }

  /**
   * Subscribe to new relay list events for automatic cache updates
   */
  subscribeToRelayListUpdates(nostr: any): void {
    // Listen for NIP-65 events and update cache automatically
    nostr.subscribe([{ kinds: [10002] }], {
      onevent: (event: NostrEvent) => {
        this.updateRelayListFromEvent(event);
      }
    });
  }

  /**
   * Add progressive fallback strategy for better error handling
   */
  private async fetchWithFallback(pubkeys: string[]): Promise<NostrEvent[]> {
    try {
      // Try user's write relays first
      const userRelays = await this.getUserWriteRelays(pubkeys);
      return await this.queryRelays(userRelays, { authors: pubkeys, kinds: [10002] });
    } catch (error) {
      console.warn('User relays failed, falling back to big relays');
      // Fallback to big relays like production systems
      return await this.queryRelays(this.BIG_RELAY_URLS, { authors: pubkeys, kinds: [10002] });
    }
  }

  /**
   * Check if cached data is still valid (event-driven, no TTL)
   */
  private isCacheValid(pubkey: string): boolean {
    // Cache is valid until explicitly invalidated
    return this.cache.has(pubkey);
  }

  /**
   * Clear cache for specific user or all users
   * Enhanced to also clear DataLoader cache
   */
  clearCache(pubkey?: string): void {
    if (pubkey) {
      this.cache.delete(pubkey);
      // Clear from all DataLoaders
      this.relayListDataLoaders.forEach(dataLoader => {
        dataLoader.clear(pubkey);
      });
      // Clear from IndexedDB as well
      indexedDBService.deleteRelayListEvent(pubkey).catch(console.warn);
    } else {
      this.cache.clear();
      // Clear all DataLoaders
      this.relayListDataLoaders.forEach(dataLoader => {
        dataLoader.clearAll();
      });
      // Clear all relay lists from IndexedDB
      indexedDBService.clearRelayLists().catch(console.warn);
    }
  }

  /**
   * Get write relays for users (helper for fallback strategy)
   */
  private async getUserWriteRelays(pubkeys: string[]): Promise<string[]> {
    const relayLists = await this.getUserRelayLists(pubkeys);
    const writeRelays = new Set<string>();

    relayLists.forEach(config => {
      config.write.forEach(url => writeRelays.add(url));
    });

    return Array.from(writeRelays);
  }

  /**
   * Query relays with filter (helper for fallback strategy)
   */
  private async queryRelays(relayUrls: string[], filter: any): Promise<NostrEvent[]> {
    const { useNostr } = await import('@/hooks/useNostr');
    const nostr = (useNostr as any)()?.nostr;

    if (!nostr) {
      throw new Error('Nostr instance not available');
    }

    return await nostr.query([filter], { signal: AbortSignal.timeout(8000) });
  }

  /**
   * Prime cache with known relay list data
   * Useful for avoiding redundant fetches
   */
  primeCache(pubkey: string, relayList: RelayListConfig): void {
    this.updateCache(pubkey, relayList);
    // Prime all DataLoaders
    this.relayListDataLoaders.forEach(dataLoader => {
      dataLoader.prime(pubkey, relayList);
    });
  }
}

// Singleton instance
const relayListService = new RelayListService();
export default relayListService;