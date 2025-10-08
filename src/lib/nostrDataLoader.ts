import DataLoader from 'dataloader';
import { SimplePool } from '@nostr/tools/pool';
import type { Filter, Event as NostrEvent } from 'nostr-tools';

/**
 * DataLoader configuration for Nostr event batching
 */
interface NostrDataLoaderOptions {
  batchScheduleFn?: (callback: () => void) => void;
  cache?: boolean;
  maxBatchSize?: number;
}

/**
 * Create a DataLoader for batching Nostr event fetches
 * Combines multiple event ID requests into a single query
 */
export function createEventDataLoader(
  pool: SimplePool,
  relays: string[],
  options: NostrDataLoaderOptions = {}
): DataLoader<string, NostrEvent | null> {
  const {
    batchScheduleFn = (callback) => setTimeout(callback, 50),
    cache = true,
    maxBatchSize = 100,
  } = options;

  return new DataLoader<string, NostrEvent | null>(
    async (eventIds: readonly string[]) => {
      console.log(`[DataLoader] Batching ${eventIds.length} event requests`);

      try {
        // Create a promise that resolves when we have all events
        const eventsPromise = new Promise<NostrEvent[]>((resolve) => {
          const events: NostrEvent[] = [];
          const eventSet = new Set<string>();

          const sub = pool.subscribeMany(
            relays,
            [{ ids: Array.from(eventIds) }] as Filter[],
            {
              onevent(event) {
                // Deduplicate by ID
                if (!eventSet.has(event.id)) {
                  events.push(event);
                  eventSet.add(event.id);
                }
              },
              oneose() {
                sub.close();
                resolve(events);
              },
            }
          );

          // Timeout after 3 seconds
          setTimeout(() => {
            sub.close();
            resolve(events);
          }, 3000);
        });

        const events = await eventsPromise;

        // Create a map for O(1) lookup
        const eventMap = new Map<string, NostrEvent>();
        events.forEach((event) => {
          eventMap.set(event.id, event);
        });

        // Return events in the same order as requested IDs
        return eventIds.map((id) => eventMap.get(id) || null);
      } catch (error) {
        console.error('[DataLoader] Failed to batch events:', error);
        // Return null for all IDs on error
        return eventIds.map(() => null);
      }
    },
    {
      batchScheduleFn,
      cache,
      maxBatchSize,
    }
  );
}

/**
 * Create a DataLoader for batching profile/metadata fetches
 */
export function createProfileDataLoader(
  pool: SimplePool,
  relays: string[],
  options: NostrDataLoaderOptions = {}
): DataLoader<string, NostrEvent | null> {
  const {
    batchScheduleFn = (callback) => setTimeout(callback, 50),
    cache = true,
    maxBatchSize = 50, // Profiles are larger, use smaller batches
  } = options;

  return new DataLoader<string, NostrEvent | null>(
    async (pubkeys: readonly string[]) => {
      console.log(`[DataLoader] Batching ${pubkeys.length} profile requests`);

      try {
        // Create a promise that resolves when we have all profiles
        const profilesPromise = new Promise<NostrEvent[]>((resolve) => {
          const profiles: NostrEvent[] = [];
          const pubkeySet = new Set<string>();

          const sub = pool.subscribeMany(
            relays,
            [{ kinds: [0], authors: Array.from(pubkeys) }] as Filter[],
            {
              onevent(event) {
                // Only keep the latest profile per pubkey
                const existing = profiles.find((p) => p.pubkey === event.pubkey);
                if (!existing) {
                  profiles.push(event);
                  pubkeySet.add(event.pubkey);
                } else if (event.created_at > existing.created_at) {
                  // Replace with newer profile
                  const index = profiles.indexOf(existing);
                  profiles[index] = event;
                }
              },
              oneose() {
                sub.close();
                resolve(profiles);
              },
            }
          );

          // Timeout after 3 seconds
          setTimeout(() => {
            sub.close();
            resolve(profiles);
          }, 3000);
        });

        const profiles = await profilesPromise;

        // Create a map for O(1) lookup
        const profileMap = new Map<string, NostrEvent>();
        profiles.forEach((profile) => {
          profileMap.set(profile.pubkey, profile);
        });

        // Return profiles in the same order as requested pubkeys
        return pubkeys.map((pubkey) => profileMap.get(pubkey) || null);
      } catch (error) {
        console.error('[DataLoader] Failed to batch profiles:', error);
        return pubkeys.map(() => null);
      }
    },
    {
      batchScheduleFn,
      cache,
      maxBatchSize,
    }
  );
}

/**
 * Create a DataLoader for batching relay list fetches (NIP-65)
 */
export function createRelayListDataLoader(
  pool: SimplePool,
  relays: string[],
  options: NostrDataLoaderOptions = {}
): DataLoader<string, string[]> {
  const {
    batchScheduleFn = (callback) => setTimeout(callback, 50),
    cache = true,
    maxBatchSize = 50,
  } = options;

  return new DataLoader<string, string[]>(
    async (pubkeys: readonly string[]) => {
      console.log(`[DataLoader] Batching ${pubkeys.length} relay list requests`);

      try {
        // Create a promise that resolves when we have all relay lists
        const relayListsPromise = new Promise<NostrEvent[]>((resolve) => {
          const relayLists: NostrEvent[] = [];

          const sub = pool.subscribeMany(
            relays,
            [{ kinds: [10002], authors: Array.from(pubkeys) }] as Filter[],
            {
              onevent(event) {
                // Only keep the latest relay list per pubkey
                const existing = relayLists.find((r) => r.pubkey === event.pubkey);
                if (!existing) {
                  relayLists.push(event);
                } else if (event.created_at > existing.created_at) {
                  const index = relayLists.indexOf(existing);
                  relayLists[index] = event;
                }
              },
              oneose() {
                sub.close();
                resolve(relayLists);
              },
            }
          );

          // Timeout after 3 seconds
          setTimeout(() => {
            sub.close();
            resolve(relayLists);
          }, 3000);
        });

        const relayLists = await relayListsPromise;

        // Create a map for O(1) lookup
        const relayMap = new Map<string, string[]>();
        relayLists.forEach((relayList) => {
          const userRelays = relayList.tags
            .filter((tag) => tag[0] === 'r')
            .map((tag) => tag[1])
            .filter(Boolean);
          relayMap.set(relayList.pubkey, userRelays);
        });

        // Return relay lists in the same order as requested pubkeys
        return pubkeys.map((pubkey) => relayMap.get(pubkey) || []);
      } catch (error) {
        console.error('[DataLoader] Failed to batch relay lists:', error);
        return pubkeys.map(() => []);
      }
    },
    {
      batchScheduleFn,
      cache,
      maxBatchSize,
    }
  );
}

/**
 * Create a DataLoader for batching contact list fetches (kind 3)
 */
export function createContactListDataLoader(
  pool: SimplePool,
  relays: string[],
  options: NostrDataLoaderOptions = {}
): DataLoader<string, string[]> {
  const {
    batchScheduleFn = (callback) => setTimeout(callback, 50),
    cache = true,
    maxBatchSize = 50,
  } = options;

  return new DataLoader<string, string[]>(
    async (pubkeys: readonly string[]) => {
      console.log(`[DataLoader] Batching ${pubkeys.length} contact list requests`);

      try {
        // Create a promise that resolves when we have all contact lists
        const contactListsPromise = new Promise<NostrEvent[]>((resolve) => {
          const contactLists: NostrEvent[] = [];

          const sub = pool.subscribeMany(
            relays,
            [{ kinds: [3], authors: Array.from(pubkeys) }] as Filter[],
            {
              onevent(event) {
                // Only keep the latest contact list per pubkey
                const existing = contactLists.find((c) => c.pubkey === event.pubkey);
                if (!existing) {
                  contactLists.push(event);
                } else if (event.created_at > existing.created_at) {
                  const index = contactLists.indexOf(existing);
                  contactLists[index] = event;
                }
              },
              oneose() {
                sub.close();
                resolve(contactLists);
              },
            }
          );

          // Timeout after 3 seconds
          setTimeout(() => {
            sub.close();
            resolve(contactLists);
          }, 3000);
        });

        const contactLists = await contactListsPromise;

        // Create a map for O(1) lookup
        const contactMap = new Map<string, string[]>();
        contactLists.forEach((list) => {
          const contacts = list.tags
            .filter((tag) => tag[0] === 'p')
            .map((tag) => tag[1])
            .filter(Boolean);
          contactMap.set(list.pubkey, contacts);
        });

        // Return contact lists in the same order as requested pubkeys
        return pubkeys.map((pubkey) => contactMap.get(pubkey) || []);
      } catch (error) {
        console.error('[DataLoader] Failed to batch contact lists:', error);
        return pubkeys.map(() => []);
      }
    },
    {
      batchScheduleFn,
      cache,
      maxBatchSize,
    }
  );
}
