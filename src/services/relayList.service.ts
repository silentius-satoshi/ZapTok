import { NostrEvent } from '@nostrify/nostrify';

export interface RelayListConfig {
  read: string[];
  write: string[];
}

/**
 * Service for managing NIP-65 relay lists with caching and performance optimization
 */
class RelayListService {
  private cache = new Map<string, RelayListConfig>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Get user's relay list from NIP-65 events with caching
   */
  async getUserRelayList(pubkey: string, nostr: any): Promise<RelayListConfig> {
    // Check cache first
    if (this.cache.has(pubkey) && this.isCacheValid(pubkey)) {
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
      
      return this.getFallbackRelays();
    }
  }

  /**
   * Parse NIP-65 relay list event into read/write arrays
   */
  private parseRelayList(event?: NostrEvent): RelayListConfig {
    if (!event) {
      return this.getFallbackRelays();
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

    // Ensure we have at least some relays
    const result = {
      read: read.length > 0 ? read : this.getFallbackRelays().read,
      write: write.length > 0 ? write : this.getFallbackRelays().write
    };

    return result;
  }

  /**
   * Get fallback relays when no NIP-65 list is available
   */
  private getFallbackRelays(): RelayListConfig {
    const defaultRelays = [
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
      'wss://relay.chorus.community',
      'wss://pyramid.fiatjaf.com',
      'wss://relay.primal.net'
    ];

    return {
      read: defaultRelays,
      write: defaultRelays
    };
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

  /**
   * Pre-warm cache for a list of pubkeys
   */
  async preloadRelayLists(pubkeys: string[], nostr: any): Promise<void> {
    const promises = pubkeys.map(pubkey => 
      this.getUserRelayList(pubkey, nostr).catch(err => {
        console.warn('Failed to preload relay list for', pubkey, err);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Test relay connectivity
   */
  async testRelayConnectivity(relays: string[]): Promise<{ [url: string]: boolean }> {
    const results: { [url: string]: boolean } = {};

    const testPromises = relays.map(async (relay) => {
      try {
        const ws = new WebSocket(relay);
        
        const isConnected = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve(false);
          }, 5000);

          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
          };
        });

        results[relay] = isConnected;
      } catch (error) {
        results[relay] = false;
      }
    });

    await Promise.allSettled(testPromises);
    return results;
  }
}

// Export singleton instance
export const relayListService = new RelayListService();
export default relayListService;