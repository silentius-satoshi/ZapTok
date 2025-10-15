import { SimplePool } from '@nostr/tools/pool';
import type { Filter, Event as NostrToolsEvent } from 'nostr-tools';
import type { EventTemplate, VerifiedEvent } from '@nostr/tools';

/**
 * Singleton SimplePool instance for timeline/feed operations
 * Handles all non-Cashu Nostr queries using @nbd-wtf/nostr-tools
 * 
 * Operates independently from NPool (@nostrify/nostrify) which handles
 * Cashu wallet operations exclusively.
 * 
 * Built-in relay tracking enabled (Jumble pattern) for optimal relay selection
 */
export const simplePool = new SimplePool();

// Enable built-in relay tracking (replaces custom EventRelayTracker)
simplePool.trackRelays = true;

/**
 * Cashu relay URL - used exclusively by NPool
 * This relay is excluded from SimplePool operations
 */
export const CASHU_RELAY = 'wss://relay.chorus.community';

/**
 * Get relays for SimplePool (excluding Cashu relay)
 * Ensures zero connection overlap between NPool and SimplePool
 * 
 * @param allRelays - All configured relay URLs
 * @returns Filtered relay list excluding the Cashu relay
 */
export function getSimplePoolRelays(allRelays: string[]): string[] {
  return allRelays.filter(url => url !== CASHU_RELAY);
}

/**
 * Get relays for NPool (Cashu relay only)
 * 
 * @returns Array containing only the Cashu relay
 */
export function getNPoolRelays(): string[] {
  return [CASHU_RELAY];
}

/**
 * Fetch events from SimplePool (Jumble pattern)
 * 
 * Wraps SimplePool's subscribe() method into a promise-based API
 * following Jumble's implementation pattern.
 * 
 * @param relays - Array of relay URLs to query
 * @param filter - Nostr filter object(s)
 * @param options - Optional configuration
 * @returns Promise resolving to array of events
 * 
 * @example
 * ```ts
 * const events = await fetchEvents(
 *   ['wss://relay.damus.io', 'wss://relay.nostr.band'],
 *   { kinds: [1], limit: 20 }
 * );
 * ```
 */
export async function fetchEvents(
  relays: string[],
  filter: Filter | Filter[],
  options: {
    onevent?: (evt: NostrToolsEvent) => void;
    signal?: AbortSignal;
  } = {}
): Promise<NostrToolsEvent[]> {
  const { onevent, signal } = options;
  
  return new Promise<NostrToolsEvent[]>((resolve, reject) => {
    const events: NostrToolsEvent[] = [];
    const uniqueRelays = Array.from(new Set(relays));
    
    // Normalize filter to array
    const filters: Filter[] = Array.isArray(filter) ? filter : [filter];
    
    // Handle abort signal
    if (signal?.aborted) {
      reject(new DOMException('Query aborted', 'AbortError'));
      return;
    }
    
    const sub = simplePool.subscribeMany(
      uniqueRelays,
      filters,
      {
        onevent: (evt: NostrToolsEvent) => {
          onevent?.(evt);
          events.push(evt);
        },
        oneose: () => {
          sub.close();
          resolve(events);
        },
      }
    );
    
    // Handle abort during subscription
    if (signal) {
      signal.addEventListener('abort', () => {
        sub.close();
        reject(new DOMException('Query aborted', 'AbortError'));
      });
    }
  });
}

/**
 * Cleanup SimplePool connections
 * Call this when the application unmounts
 */
export function cleanupSimplePool(): void {
  // Close all relay connections
  const emptyRelayList: string[] = [];
  simplePool.close(emptyRelayList);
}

/**
 * Get relay hints for an event (Jumble pattern)
 * 
 * Uses SimplePool's built-in relay tracking to find which relays
 * have returned a specific event. Useful for optimizing re-fetches.
 * 
 * @param eventId - Event ID to get relay hints for
 * @returns Array of relay URLs that have seen this event
 * 
 * @example
 * ```ts
 * const relays = getEventHints('event-id-here');
 * // Use these relays first when re-fetching
 * ```
 */
export function getEventHints(eventId: string): string[] {
  const relaySet = simplePool.seenOn.get(eventId);
  if (!relaySet) return [];
  
  return Array.from(relaySet).map(relay => relay.url);
}

/**
 * Get the best relay hint for an event
 * 
 * @param eventId - Event ID to get relay hint for
 * @returns Single relay URL or undefined
 */
export function getEventHint(eventId: string): string | undefined {
  const relays = getEventHints(eventId);
  return relays[0];
}

/**
 * Signer interface matching NIP-07 pattern
 * Used for NIP-42 AUTH event signing
 */
export interface Signer {
  signEvent(event: EventTemplate): Promise<VerifiedEvent>;
  getPublicKey(): Promise<string>;
}

/**
 * Publish event with automatic NIP-42 AUTH handling (Jumble pattern)
 * 
 * Implements inline error-catching pattern from Jumble:
 * 1. Attempt to publish event
 * 2. If "auth-required" error occurs, authenticate using relay.auth()
 * 3. Retry publish after successful authentication
 * 
 * SimplePool's relay.auth() method handles the entire AUTH flow:
 * - Receives challenge from relay
 * - Creates kind 22242 AUTH event
 * - Signs event with provided signer
 * - Sends AUTH response to relay
 * 
 * @param relayUrl - Single relay URL to publish to
 * @param event - Event to publish
 * @param signer - Signer for AUTH events (optional, required for protected relays)
 * @returns Promise resolving when event is published
 * 
 * @example
 * ```ts
 * const { user } = useCurrentUser();
 * await publishWithAuth(
 *   'wss://relay.example.com',
 *   myEvent,
 *   user.signer
 * );
 * ```
 */
export async function publishWithAuth(
  relayUrl: string,
  event: NostrToolsEvent,
  signer?: Signer
): Promise<void> {
  const relay = await simplePool.ensureRelay(relayUrl);
  
  try {
    // First attempt: publish without AUTH
    await relay.publish(event);
  } catch (error) {
    // Check if error is auth-required
    const isAuthRequired = 
      error instanceof Error && 
      error.message.toLowerCase().includes('auth-required');
    
    if (isAuthRequired && signer) {
      // Authenticate using relay's built-in auth() method
      // This handles the entire NIP-42 flow automatically
      await relay.auth((authEvent: EventTemplate) => signer.signEvent(authEvent));
      
      // Retry publish after successful authentication
      await relay.publish(event);
    } else {
      // Re-throw if not auth-required or no signer available
      throw error;
    }
  }
}

/**
 * Query events with automatic NIP-42 AUTH handling (Jumble pattern)
 * 
 * Implements the same inline error-catching pattern as publishWithAuth:
 * 1. Attempt to query events
 * 2. If "auth-required" error occurs, authenticate using relay.auth()
 * 3. Retry query after successful authentication
 * 
 * @param relayUrl - Single relay URL to query
 * @param filters - Nostr filter object(s)
 * @param signer - Signer for AUTH events (optional, required for protected relays)
 * @param opts - Optional query options (signal for abort)
 * @returns Promise resolving to array of events
 * 
 * @example
 * ```ts
 * const { user } = useCurrentUser();
 * const events = await queryWithAuth(
 *   'wss://relay.example.com',
 *   [{ kinds: [1], limit: 20 }],
 *   user.signer,
 *   { signal: AbortSignal.timeout(3000) }
 * );
 * ```
 */
export async function queryWithAuth(
  relayUrl: string,
  filters: Filter[],
  signer?: Signer,
  opts?: { signal?: AbortSignal }
): Promise<NostrToolsEvent[]> {
  try {
    // First attempt: query without AUTH
    const events = await fetchEvents([relayUrl], filters, opts);
    return events;
  } catch (error) {
    // Check if error is auth-required
    const isAuthRequired = 
      error instanceof Error && 
      error.message.toLowerCase().includes('auth-required');
    
    if (isAuthRequired && signer) {
      const relay = await simplePool.ensureRelay(relayUrl);
      
      // Authenticate using relay's built-in auth() method
      await relay.auth((authEvent: EventTemplate) => signer.signEvent(authEvent));
      
      // Retry query after successful authentication
      const events = await fetchEvents([relayUrl], filters, opts);
      return events;
    } else {
      // Re-throw if not auth-required or no signer available
      throw error;
    }
  }
}
