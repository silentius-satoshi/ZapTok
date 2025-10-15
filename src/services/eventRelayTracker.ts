import type { Event as NostrEvent } from 'nostr-tools';

interface EventRelayData {
  eventId: string;
  relays: string[];
  firstSeen: number;
  lastSeen: number;
}

/**
 * Event-Relay Association Tracker
 * 
 * @deprecated Use SimplePool's built-in relay tracking instead.
 * SimplePool.trackRelays = true provides the same functionality.
 * Use getEventHints(eventId) from '@/lib/simplePool' to get relay hints.
 * 
 * Tracks which relays have returned which events for optimal re-fetching.
 * Maintains an in-memory map of event IDs to relay URLs with frequency counting.
 * 
 * This is a Phase 5 optimization that allows the system to remember which relays
 * successfully returned specific events, enabling smarter relay selection for
 * subsequent queries.
 */
class EventRelayTrackerService {
  private eventRelays: Map<string, EventRelayData>;
  private maxEntries = 10000; // Limit memory usage

  constructor() {
    this.eventRelays = new Map();
  }

  /**
   * Track that an event was seen on a specific relay
   */
  trackEvent(event: NostrEvent, relayUrl: string): void {
    const eventId = event.id;
    const now = Date.now();

    const existing = this.eventRelays.get(eventId);
    
    if (existing) {
      // Add relay if not already tracked
      if (!existing.relays.includes(relayUrl)) {
        existing.relays.push(relayUrl);
      }
      existing.lastSeen = now;
    } else {
      // Create new entry
      this.eventRelays.set(eventId, {
        eventId,
        relays: [relayUrl],
        firstSeen: now,
        lastSeen: now,
      });

      // Clean up old entries if we exceed max
      if (this.eventRelays.size > this.maxEntries) {
        this.cleanup();
      }
    }
  }

  /**
   * Get relay hints for an event
   */
  getRelayHints(eventId: string): string[] {
    return this.eventRelays.get(eventId)?.relays || [];
  }

  /**
   * Get optimal relays for re-fetching multiple events
   */
  getOptimalRelays(eventIds: string[]): string[] {
    const relayFrequency = new Map<string, number>();

    eventIds.forEach((eventId) => {
      const relays = this.getRelayHints(eventId);
      relays.forEach((relay) => {
        relayFrequency.set(relay, (relayFrequency.get(relay) || 0) + 1);
      });
    });

    // Sort relays by frequency (most events → highest priority)
    return Array.from(relayFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([relay]) => relay);
  }

  /**
   * Clean up old entries (LRU eviction)
   */
  private cleanup(): void {
    const entries = Array.from(this.eventRelays.entries());
    
    // Sort by lastSeen (oldest first)
    entries.sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    
    // Remove oldest 10%
    const toRemove = Math.floor(entries.length * 0.1);
    entries.slice(0, toRemove).forEach(([eventId]) => {
      this.eventRelays.delete(eventId);
    });
  }

  /**
   * Clear all tracked data
   */
  clear(): void {
    this.eventRelays.clear();
  }

  /**
   * Get stats about tracked events
   */
  getStats(): { totalEvents: number; totalRelays: number } {
    const relaySet = new Set<string>();
    this.eventRelays.forEach((data) => {
      data.relays.forEach((relay) => relaySet.add(relay));
    });

    return {
      totalEvents: this.eventRelays.size,
      totalRelays: relaySet.size,
    };
  }
}

// Export singleton instance
export const eventRelayTracker = new EventRelayTrackerService();
