import { useNostr } from '@/hooks/useNostr';
import { simplePool, getSimplePoolRelays, fetchEvents } from '@/lib/simplePool';

/**
 * Hook to access SimplePool instance and relay configuration
 * 
 * Provides access to the SimplePool singleton and filtered relay list
 * that excludes the Cashu relay, ensuring zero connection overlap.
 * 
 * @returns Object containing simplePool instance, relay list, and fetchEvents helper
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { simplePool, simplePoolRelays, fetchEvents } = useSimplePool();
 *   
 *   // Use fetchEvents (recommended - Jumble pattern)
 *   const events = await fetchEvents(simplePoolRelays, { kinds: [1], limit: 20 });
 *   
 *   // Or use simplePool directly for subscriptions
 *   const sub = simplePool.subscribeMany(simplePoolRelays, [filter], { ... });
 * }
 * ```
 */
export function useSimplePool() {
  const { nostr } = useNostr();
  const relayUrls = Array.from(nostr?.relays?.keys() || []);
  const simplePoolRelays = getSimplePoolRelays(relayUrls);

  return {
    simplePool,
    simplePoolRelays,
    fetchEvents, // Expose fetchEvents helper (Jumble pattern)
  };
}
