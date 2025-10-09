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
 * - Phase 6.1: IndexedDB profile caching + FlexSearch local search
 */

import { NostrEvent, NostrFilter, NSchema as n } from '@nostrify/nostrify';
import type { Event as NostrToolsEvent, Filter } from 'nostr-tools';
import DataLoader from 'dataloader';
import FlexSearch from 'flexsearch';
import { simplePool } from '@/lib/simplePool';
import { BIG_RELAY_URLS } from '@/constants';
import { logInfo, logWarning, logError } from '@/lib/logger';
import indexedDBService from './indexedDB.service';

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
 * - Phase 6.1: FlexSearch for instant local profile search
 */
class ClientService {
  private static instance: ClientService;
  
  // Placeholder signer - in real usage this would come from @nostrify/react context
  signer: any = null;

  /**
   * Phase 6.1: FlexSearch index for local profile search (Jumble pattern)
   * Enables <100ms instant search without network calls
   */
  private userIndex = new FlexSearch.Index({
    tokenize: 'forward'
  });

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
    // Initialize FlexSearch index from IndexedDB
    this.init();
  }

  /**
   * Phase 6.1: Initialize FlexSearch index from cached profiles (Jumble pattern)
   * Rebuilds search index from IndexedDB on app load for instant offline search
   */
  private async init() {
    try {
      logInfo('[ClientService] Initializing FlexSearch index from IndexedDB...');
      
      let count = 0;
      await indexedDBService.iterateProfileEvents(async (profileEvent) => {
        try {
          await this.addUsernameToIndex(profileEvent);
          count++;
        } catch (err) {
          logError('[ClientService] Error indexing profile:', err);
        }
      });
      
      logInfo(`[ClientService] FlexSearch index ready with ${count} profiles`);
    } catch (error) {
      logError('[ClientService] Failed to initialize FlexSearch index:', error);
    }
  }

  /**
   * Phase 6.1: Add profile to search index (Jumble pattern)
   * Indexes display_name, name, and nip05 for full-text search
   */
  private async addUsernameToIndex(profileEvent: NostrEvent): Promise<void> {
    try {
      const profileObj = JSON.parse(profileEvent.content);
      const text = [
        profileObj.display_name?.trim() ?? '',
        profileObj.name?.trim() ?? '',
        profileObj.nip05?.split('@').map((s: string) => s.trim()).join(' ') ?? ''
      ].join(' ');
      
      if (!text) return;

      await this.userIndex.addAsync(profileEvent.pubkey, text);
    } catch {
      // Silently fail - don't break on malformed profiles
      return;
    }
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
   * Phase 6.1: Caches results in IndexedDB and indexes for search
   */
  private async batchLoadProfiles(
    pubkeys: readonly string[]
  ): Promise<(AuthorProfile | null)[]> {
    logInfo(`[ProfileBatching] Loading ${pubkeys.length} profiles in batch`);

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
          const profile = {
            pubkey,
            metadata,
            event: event as NostrEvent,
          };
          
          // Phase 6.1: Cache in IndexedDB for offline access
          indexedDBService.putProfileEvent(event as NostrEvent).catch((err) => 
            logWarning('[ProfileBatching] Failed to cache profile:', err)
          );
          
          // Phase 6.1: Index for local search
          this.addUsernameToIndex(event as NostrEvent).catch((err) =>
            logWarning('[ProfileBatching] Failed to index profile:', err)
          );
          
          return profile;
        } catch (error) {
          logWarning(`[ProfileBatching] Failed to parse metadata for ${pubkey}:`, error);
          return {
            pubkey,
            event: event as NostrEvent,
          };
        }
      });
    } catch (error) {
      logError('[ProfileBatching] Batch load failed:', error);
      // Return null for all pubkeys on error
      return pubkeys.map(() => null);
    }
  }

  /**
   * Fetch a single profile (auto-batched via DataLoader)
   * 
   * Phase 6.1: Offline-first architecture (Jumble pattern)
   * 1. Check DataLoader cache (in-memory, fastest)
   * 2. Check IndexedDB (persistent, <50ms)
   * 3. Fetch from network (300-500ms)
   * 4. Cache results for future use
   * 
   * @param pubkey - Nostr public key (hex format)
   * @param skipCache - If true, bypasses all caches
   * @returns Profile data or null if not found
   */
  async fetchProfile(pubkey: string, skipCache: boolean = false): Promise<AuthorProfile | null> {
    const startTime = performance.now();
    
    // 1. Check DataLoader cache (existing behavior)
    if (!skipCache) {
      // Note: DataLoader.load() checks its internal cache first
      // We only proceed if we want to check IndexedDB before network
    }

    // 2. Phase 6.1: Check IndexedDB cache (offline-capable)
    if (!skipCache) {
      try {
        const localProfile = await indexedDBService.getProfileEvent(pubkey);
        if (localProfile) {
          const duration = performance.now() - startTime;
          logInfo(`[Profile] Cache HIT for ${pubkey.slice(0, 8)} (${duration.toFixed(1)}ms)`);
          
          // Index for search if not already indexed
          await this.addUsernameToIndex(localProfile);
          
          // Parse and return
          try {
            const metadata = n.json().pipe(n.metadata()).parse(localProfile.content);
            return {
              pubkey,
              metadata,
              event: localProfile,
            };
          } catch {
            return {
              pubkey,
              event: localProfile,
            };
          }
        }
      } catch (error) {
        logWarning('[Profile] IndexedDB lookup failed:', error);
        // Continue to network fetch
      }
    }

    // 3. Fetch from network via DataLoader (existing logic)
    if (skipCache) {
      this.profileDataLoader.clear(pubkey);
    }
    
    const profile = await this.profileDataLoader.load(pubkey);
    const duration = performance.now() - startTime;
    
    if (profile) {
      logInfo(`[Profile] Network fetch for ${pubkey.slice(0, 8)} (${duration.toFixed(1)}ms)`);
      
      // 4. Phase 6.1: Cache in IndexedDB for next time
      if (profile.event) {
        indexedDBService.putProfileEvent(profile.event).catch((err) =>
          logWarning('[Profile] Failed to cache profile:', err)
        );
        
        this.addUsernameToIndex(profile.event).catch((err) =>
          logWarning('[Profile] Failed to index profile:', err)
        );
      }
    } else {
      logInfo(`[Profile] Not found for ${pubkey.slice(0, 8)} (${duration.toFixed(1)}ms)`);
    }
    
    return profile;
  }

  /**
   * Phase 6.1: Search profiles locally (instant, offline-capable)
   * Uses FlexSearch for <100ms local search without network calls
   * 
   * @param query - Search query (searches name, display_name, nip05)
   * @param limit - Maximum number of results (default: 100)
   * @returns Array of pubkeys matching the query
   */
  async searchNpubsFromLocal(query: string, limit: number = 100): Promise<string[]> {
    try {
      const result = await this.userIndex.searchAsync(query, { limit });
      return result.map((pubkey) => pubkey as string);
    } catch (error) {
      logError('[Search] Local search failed:', error);
      return [];
    }
  }

  /**
   * Phase 6.1: Search profiles with full data (Jumble pattern)
   * Performs instant local search, then loads full profile data
   * 
   * @param query - Search query
   * @param limit - Maximum number of results
   * @returns Array of profiles matching the query
   */
  async searchProfilesFromLocal(query: string, limit: number = 100): Promise<AuthorProfile[]> {
    try {
      const pubkeys = await this.searchNpubsFromLocal(query, limit);
      const profiles = await Promise.all(pubkeys.map((pubkey) => this.fetchProfile(pubkey)));
      return profiles.filter((profile) => !!profile) as AuthorProfile[];
    } catch (error) {
      logError('[Search] Profile search failed:', error);
      return [];
    }
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