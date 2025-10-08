/**
 * Timeline Cache Manager (Jumble pattern)
 * 
 * Implements Jumble's timeline caching strategy using refs (event ID + timestamp tuples)
 * for efficient pagination and timeline state management.
 * 
 * Key benefits:
 * - Fast pagination using cached [id, created_at] refs
 * - Reduced network requests for timeline navigation
 * - Consistent ordering across page loads
 * 
 * @see https://github.com/CodyTseng/jumble - Reference implementation
 */

import type { Filter } from 'nostr-tools';
import type { Event as NostrEvent } from 'nostr-tools';

/**
 * Timeline reference - lightweight event identifier
 * [eventId, created_at timestamp]
 */
export type TimelineRef = [string, number];

/**
 * Timeline cache entry
 */
export interface TimelineCache {
  /** Ordered refs of events in timeline */
  refs: TimelineRef[];
  /** Original filter used for this timeline */
  filter: Filter;
  /** Relay URLs used for this timeline */
  urls: string[];
}

/**
 * Timeline key generator
 * Creates a deterministic hash from relays + filter for cache lookup
 */
function generateTimelineKey(urls: string[], filter: Filter): string {
  // Stable stringification
  const stableFilter: Record<string, unknown> = {};
  Object.entries(filter)
    .sort()
    .forEach(([key, value]) => {
      if (Array.isArray(value)) {
        stableFilter[key] = [...value].sort();
      } else {
        stableFilter[key] = value;
      }
    });

  const paramsStr = JSON.stringify({
    urls: [...urls].sort(),
    filter: stableFilter,
  });

  // Simple hash (matches Jumble's sha256 approach conceptually)
  let hash = 0;
  for (let i = 0; i < paramsStr.length; i++) {
    const char = paramsStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Timeline Cache Singleton
 * 
 * Manages timeline state with ref-based caching for efficient pagination.
 */
class TimelineCacheManager {
  private static instance: TimelineCacheManager;
  private timelines = new Map<string, TimelineCache>();

  private constructor() {}

  static getInstance(): TimelineCacheManager {
    if (!TimelineCacheManager.instance) {
      TimelineCacheManager.instance = new TimelineCacheManager();
    }
    return TimelineCacheManager.instance;
  }

  /**
   * Store timeline refs
   */
  setTimeline(urls: string[], filter: Filter, events: NostrEvent[]): string {
    const key = generateTimelineKey(urls, filter);
    const refs: TimelineRef[] = events.map((evt) => [evt.id, evt.created_at]);

    this.timelines.set(key, {
      refs,
      filter,
      urls,
    });

    return key;
  }

  /**
   * Get cached timeline refs
   */
  getTimeline(key: string): TimelineCache | undefined {
    return this.timelines.get(key);
  }

  /**
   * Get timeline key without setting
   */
  getTimelineKey(urls: string[], filter: Filter): string {
    return generateTimelineKey(urls, filter);
  }

  /**
   * Update timeline refs (for new events or pagination)
   */
  updateTimeline(key: string, newEvents: NostrEvent[], mode: 'prepend' | 'append' = 'prepend'): void {
    const timeline = this.timelines.get(key);
    if (!timeline) return;

    const newRefs: TimelineRef[] = newEvents.map((evt) => [evt.id, evt.created_at]);

    if (mode === 'prepend') {
      // New events at the top
      const firstRefTimestamp = timeline.refs[0]?.[1] || Number.MAX_SAFE_INTEGER;
      const validNewRefs = newRefs.filter(([, timestamp]) => timestamp > firstRefTimestamp);
      timeline.refs = [...validNewRefs, ...timeline.refs];
    } else {
      // Older events at the bottom
      const lastRefTimestamp = timeline.refs[timeline.refs.length - 1]?.[1] || 0;
      const validNewRefs = newRefs.filter(([, timestamp]) => timestamp < lastRefTimestamp);
      timeline.refs = [...timeline.refs, ...validNewRefs];
    }
  }

  /**
   * Insert new event into timeline (real-time)
   */
  insertEvent(key: string, event: NostrEvent): void {
    const timeline = this.timelines.get(key);
    if (!timeline) return;

    // Find insertion point
    let idx = 0;
    for (const [refId, refTimestamp] of timeline.refs) {
      if (event.created_at > refTimestamp || 
          (event.created_at === refTimestamp && event.id < refId)) {
        break;
      }
      // Event already exists
      if (event.id === refId) return;
      idx++;
    }

    // Insert at correct position
    timeline.refs.splice(idx, 0, [event.id, event.created_at]);
  }

  /**
   * Clear specific timeline
   */
  clearTimeline(key: string): void {
    this.timelines.delete(key);
  }

  /**
   * Clear all timelines
   */
  clearAll(): void {
    this.timelines.clear();
  }

  /**
   * Get event IDs for a page of timeline
   */
  getEventIdsForPage(key: string, offset: number, limit: number): string[] {
    const timeline = this.timelines.get(key);
    if (!timeline) return [];

    return timeline.refs
      .slice(offset, offset + limit)
      .map(([id]) => id);
  }
}

// Export singleton instance
export const timelineCache = TimelineCacheManager.getInstance();
