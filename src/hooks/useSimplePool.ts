import { useNostrConnection } from '@/components/NostrProvider';

/**
 * Hook to access SimplePool instance and relays for timeline/feed operations
 * 
 * SimplePool is used for all non-Cashu Nostr operations and excludes the Cashu relay
 * to prevent connection overlap with NPool.
 * 
 * @returns {Object} SimplePool instance and filtered relay list
 * @returns {SimplePool} simplePool - SimplePool singleton instance
 * @returns {string[]} simplePoolRelays - Relay URLs excluding Cashu relay
 * 
 * @example
 * ```tsx
 * import { useSimplePool } from '@/hooks/useSimplePool';
 * 
 * function MyComponent() {
 *   const { simplePool, simplePoolRelays } = useSimplePool();
 *   
 *   // Query events using SimplePool
 *   const events = await simplePool.querySync(simplePoolRelays, {
 *     kinds: [1],
 *     limit: 20
 *   });
 * }
 * ```
 */
export function useSimplePool() {
  const { simplePool, simplePoolRelays } = useNostrConnection();
  
  return {
    simplePool,
    simplePoolRelays,
  };
}
