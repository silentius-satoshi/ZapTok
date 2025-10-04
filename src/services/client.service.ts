/**
 * Centralized Nostr client service following Jumble's architecture
 * 
 * This service provides DataLoader-based batching for efficient profile queries
 * and other Nostr operations. Follows Jumble's exact implementation pattern.
 * 
 * Key Features:
 * - Profile batching via DataLoader (50ms window, max 500 per batch)
 * - Queries BIG_RELAY_URLS for maximum discoverability
 * - Singleton pattern for app-wide coordination
 * - Compatible with @nostrify/nostrify types
 */

import { NostrEvent, NostrFilter, NSchema as n } from '@nostrify/nostrify';
import type { Event as NostrToolsEvent, Filter } from 'nostr-tools';
import DataLoader from 'dataloader';
import { simplePool } from '@/lib/simplePool';
import { BIG_RELAY_URLS } from '@/constants';

export interface AuthorProfile {
  pubkey: string;
  metadata?: {
    name?: string;
    display_name?: string;
    about?: string;
    picture?: string;
    banner?: string;
    nip05?: string;
    lud06?: string;
    lud16?: string;
    website?: string;
  };
  event?: NostrEvent;
}

/**
 * ClientService - Centralized Nostr operations (Jumble architecture)
 * 
 * Following Jumble's pattern:
 * - DataLoader for batched profile queries
 * - BIG_RELAY_URLS for major relay coverage
 * - Singleton instance for app-wide use
 */
class ClientService {
  private static instance: ClientService;
  
  // Placeholder signer - in real usage this would come from @nostrify/react context
  signer: any = null;

  /**
   * Profile DataLoader - batches profile queries following Jumble's pattern
   * 
   * Configuration matches Jumble:
   * - 50ms batch window
   * - Max 500 profiles per batch
   * - Queries BIG_RELAY_URLS for maximum coverage
   */
  private profileDataLoader = new DataLoader<string, AuthorProfile | null>(
    this.batchLoadProfiles.bind(this),
    {
      batchScheduleFn: (callback) => setTimeout(callback, 50),
      maxBatchSize: 500,
      cacheKeyFn: (pubkey) => pubkey,
    }
  );

  private constructor() {
    // Private constructor enforces singleton pattern
  }

  public static getInstance(): ClientService {
    if (!ClientService.instance) {
      ClientService.instance = new ClientService();
    }
    return ClientService.instance;
  }

  /**
   * Batch load profiles from BIG_RELAY_URLS (Jumble pattern)
   * 
   * Queries multiple pubkeys in a single relay request for efficiency.
   * Matches Jumble's replaceableEventFromBigRelaysBatchLoadFn implementation.
   */
  private async batchLoadProfiles(
    pubkeys: readonly string[]
  ): Promise<(AuthorProfile | null)[]> {
    console.log(`[ProfileBatching] Loading ${pubkeys.length} profiles in batch`);

    try {
      // Query all profiles in a single request to BIG_RELAY_URLS
      const events = await simplePool.querySync(BIG_RELAY_URLS, {
        kinds: [0],
        authors: Array.from(pubkeys),
      });

      // Create a map of pubkey -> latest profile event
      const eventMap = new Map<string, NostrToolsEvent>();
      
      for (const event of events) {
        const existing = eventMap.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          eventMap.set(event.pubkey, event);
        }
      }

      // Return profiles in the same order as requested pubkeys
      return pubkeys.map((pubkey) => {
        const event = eventMap.get(pubkey);
        if (!event) {
          return null;
        }

        try {
          const metadata = n.json().pipe(n.metadata()).parse(event.content);
          return {
            pubkey,
            metadata,
            event: event as NostrEvent,
          };
        } catch (error) {
          console.warn(`[ProfileBatching] Failed to parse metadata for ${pubkey}:`, error);
          return {
            pubkey,
            event: event as NostrEvent,
          };
        }
      });
    } catch (error) {
      console.error('[ProfileBatching] Batch load failed:', error);
      // Return null for all pubkeys on error
      return pubkeys.map(() => null);
    }
  }

  /**
   * Fetch a single profile (auto-batched via DataLoader)
   * 
   * This is the public API that components should use.
   * Multiple concurrent calls within 50ms will be batched automatically.
   * 
   * @param pubkey - Nostr public key (hex format)
   * @param skipCache - If true, bypasses DataLoader cache
   * @returns Profile data or null if not found
   */
  async fetchProfile(pubkey: string, skipCache: boolean = false): Promise<AuthorProfile | null> {
    if (skipCache) {
      this.profileDataLoader.clear(pubkey);
    }
    return this.profileDataLoader.load(pubkey);
  }

  /**
   * Clear profile cache for a specific pubkey
   */
  clearProfileCache(pubkey: string): void {
    this.profileDataLoader.clear(pubkey);
  }

  /**
   * Clear all cached profiles
   */
  clearAllProfileCache(): void {
    this.profileDataLoader.clearAll();
  }

  async fetchRelayList(pubkey: string): Promise<{ read: string[]; write: string[] }> {
    // This would typically fetch NIP-65 relay list events
    // For now, return default relays
    console.log('fetchRelayList called for:', pubkey);
    return {
      read: ['wss://relay.nostr.band', 'wss://nos.lol'],
      write: ['wss://relay.nostr.band', 'wss://nos.lol'],
    };
  }

  async fetchEvents(relays: string[], filter: NostrFilter): Promise<NostrEvent[]> {
    // This would typically use the @nostrify/react query system
    console.log('fetchEvents called with filter:', filter);
    return [];
  }

  subscribe(
    relays: string[],
    filter: NostrFilter,
    handlers: { onevent: (event: NostrEvent) => void }
  ): { close: () => void } {
    // This would typically use the @nostrify/react subscription system
    console.log('subscribe called with filter:', filter);
    return {
      close: () => {
        console.log('subscription closed');
      },
    };
  }
}

// Export singleton instance (following Jumble's pattern)
const client = ClientService.getInstance();
export default client;