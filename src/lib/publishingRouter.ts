import type { NostrEvent } from '@nostrify/nostrify';
import { simplePool, getSimplePoolRelays } from './simplePool';

/**
 * Cashu event kinds that must be published via NPool
 * These events are routed exclusively to the Cashu relay
 */
export const CASHU_KINDS = [7374, 7375, 7376, 17375] as const;

/**
 * Check if an event kind is a Cashu kind
 * 
 * @param kind - Event kind number
 * @returns True if the kind is a Cashu kind
 */
export function isCashuKind(kind: number): boolean {
  return CASHU_KINDS.includes(kind as typeof CASHU_KINDS[number]);
}

/**
 * Determine which pool should handle an event based on its kind
 * 
 * @param kind - Event kind number
 * @returns 'npool' for Cashu events, 'simplepool' for all others
 */
export function getPoolForKind(kind: number): 'npool' | 'simplepool' {
  return isCashuKind(kind) ? 'npool' : 'simplepool';
}

/**
 * Publishing router that directs events to the appropriate pool
 * 
 * Note: This is a helper for routing logic. The actual publishing
 * still happens through useNostrPublish hook which will use this
 * routing information.
 * 
 * @param event - Event to publish
 * @param allRelays - All configured relay URLs
 * @returns Publishing instructions with pool type and relay list
 */
export function getPublishingRoute(
  event: NostrEvent,
  allRelays: string[]
): {
  pool: 'npool' | 'simplepool';
  relays: string[];
  reason: string;
} {
  if (isCashuKind(event.kind)) {
    return {
      pool: 'npool',
      relays: ['wss://relay.chorus.community'],
      reason: `Cashu kind ${event.kind} routed to NPool`,
    };
  }

  return {
    pool: 'simplepool',
    relays: getSimplePoolRelays(allRelays),
    reason: `Social kind ${event.kind} routed to SimplePool`,
  };
}

/**
 * Publish event via SimplePool
 * Used for non-Cashu events (timeline, social, etc.)
 * 
 * @param event - Event to publish
 * @param relays - Relay URLs to publish to
 * @returns Promise that resolves when published
 */
export async function publishViaSimplePool(
  event: NostrEvent,
  relays: string[]
): Promise<void> {
  try {
    // SimplePool expects Event type from nostr-tools
    // Cast NostrEvent to compatible format
    const publishEvent = event as any;
    
    // Publish returns array of promises, wait for at least one to succeed
    const publishPromises = simplePool.publish(relays, publishEvent);
    await Promise.race(publishPromises);
    
    console.log(`[SimplePool] Published kind ${event.kind} to ${relays.length} relays`);
  } catch (error) {
    console.error('[SimplePool] Failed to publish event:', error);
    throw error;
  }
}
