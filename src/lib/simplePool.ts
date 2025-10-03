import { SimplePool } from '@nostr/tools/pool';

/**
 * Singleton SimplePool instance for timeline/feed operations
 * Handles all non-Cashu Nostr queries using @nbd-wtf/nostr-tools
 * 
 * Operates independently from NPool (@nostrify/nostrify) which handles
 * Cashu wallet operations exclusively.
 */
export const simplePool = new SimplePool();

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
 * Cleanup SimplePool connections
 * Call this when the application unmounts
 */
export function cleanupSimplePool(): void {
  // Close all relay connections
  const emptyRelayList: string[] = [];
  simplePool.close(emptyRelayList);
}
