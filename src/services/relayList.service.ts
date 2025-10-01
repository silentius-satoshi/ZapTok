import { NostrEvent } from '@nostrify/nostrify';

export interface RelayListConfig {
  read: string[];
  write: string[];
}

// Default relays following Jumble's BIG_RELAY_URLS pattern
const DEFAULT_RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://relay.primal.net',
  'wss://nos.lol'
];

/**
 * Service for managing NIP-65 relay lists with caching and performance optimization
 */
class RelayListService {
  private cache = new Map<string, RelayListConfig>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Validates relay list following Jumble's logic
   * Falls back to default relays if too many configured (>8)
   */
  validateRelayList(read: string[], write: string[]): RelayListConfig {
    // Jumble's validation: fallback if too many relays (>8)
    if (read.length > 8 || write.length > 8) {
      console.warn('Too many relays configured, falling back to defaults');
      return {
        read: DEFAULT_RELAY_URLS,
        write: DEFAULT_RELAY_URLS
      };
    }
    
    return {
      read: read.length > 0 ? read : DEFAULT_RELAY_URLS,
      write: write.length > 0 ? write : DEFAULT_RELAY_URLS
    };
  }

  /**
   * Creates default relay list for new users
   */
  getDefaultRelayList(): RelayListConfig {
    return {
      read: DEFAULT_RELAY_URLS,
      write: DEFAULT_RELAY_URLS
    };
  }

  /**
   * Get user's relay list from NIP-65 events with caching
   * @param pubkey User's public key
   * @param nostr Nostr instance for querying
   * @param forceRefresh Force refresh from relays, bypassing cache
   */
  async getUserRelayList(pubkey: string, nostr: any, forceRefresh: boolean = false): Promise<RelayListConfig> {
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh && this.cache.has(pubkey) && this.isCacheValid(pubkey)) {
      return this.cache.get(pubkey)!;
    }

    try {
      const events = await nostr.query([{
        kinds: [10002], // NIP-65 relay list
        authors: [pubkey],
        limit: 1
      }], { signal: AbortSignal.timeout(5000) });

      const relayList = this.parseRelayList(events[0]);
      this.updateCache(pubkey, relayList);
      
      return relayList;
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

    // Validate relay counts following Jumble's approach
    return this.validateRelayList(read, write);
  }

  /**
   * Update cache with expiry
   */
  private updateCache(pubkey: string, relayList: RelayListConfig): void {
    this.cache.set(pubkey, relayList);
    this.cacheExpiry.set(pubkey, Date.now() + this.CACHE_TTL);
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(pubkey: string): boolean {
    const expiry = this.cacheExpiry.get(pubkey);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Clear cache for specific user or all users
   */
  clearCache(pubkey?: string): void {
    if (pubkey) {
      this.cache.delete(pubkey);
      this.cacheExpiry.delete(pubkey);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }
}

// Singleton instance
const relayListService = new RelayListService();
export default relayListService;