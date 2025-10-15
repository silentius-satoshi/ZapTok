import type { NostrEvent } from '@nostrify/nostrify';
import { validateVideoEvent, type VideoEvent } from '@/lib/validateVideoEvent';
import { bundleLog } from '@/lib/logBundler';

/**
 * Content filter types for Phase 3 enhanced filtering
 */
export interface ContentFilter {
  id: string;
  name: string;
  enabled: boolean;
  type: 'tag' | 'content' | 'author' | 'engagement' | 'custom';
  config: FilterConfig;
}

export interface FilterConfig {
  // Tag-based filtering
  includeHashtags?: string[];
  excludeHashtags?: string[];

  // Content filtering
  minLength?: number;
  maxLength?: number;
  requireMedia?: boolean;
  languagePreferences?: string[];

  // Author filtering
  blockedAuthors?: string[];
  preferredAuthors?: string[];
  minFollowers?: number;

  // Engagement filtering
  minLikes?: number;
  minReposts?: number;
  minComments?: number;

  // Custom filtering function
  customFilter?: (event: NostrEvent) => boolean;
}

export interface FilterStats {
  totalProcessed: number;
  filtered: number;
  passed: number;
  filterBreakdown: Record<string, number>;
}

/**
 * Timeline Filter Service - Phase 3 Enhancement
 *
 * Provides advanced content filtering capabilities for timeline feeds
 * Following Jumble's proven patterns for content curation
 */
class TimelineFilterService {
  private filters: Map<string, ContentFilter> = new Map();
  private stats: FilterStats = {
    totalProcessed: 0,
    filtered: 0,
    passed: 0,
    filterBreakdown: {},
  };

  /**
   * Register a new content filter
   */
  registerFilter(filter: ContentFilter): void {
    this.filters.set(filter.id, filter);
    bundleLog('timelineFilter', `📄 Registered filter: ${filter.name} (${filter.type})`);
  }

  /**
   * Remove a content filter
   */
  removeFilter(filterId: string): void {
    const filter = this.filters.get(filterId);
    if (filter) {
      this.filters.delete(filterId);
      bundleLog('timelineFilter', `📄 Removed filter: ${filter.name}`);
    }
  }

  /**
   * Enable/disable a filter
   */
  toggleFilter(filterId: string, enabled: boolean): void {
    const filter = this.filters.get(filterId);
    if (filter) {
      filter.enabled = enabled;
      bundleLog('timelineFilter', `📄 ${enabled ? 'Enabled' : 'Disabled'} filter: ${filter.name}`);
    }
  }

  /**
   * Get all registered filters
   */
  getFilters(): ContentFilter[] {
    return Array.from(this.filters.values());
  }

  /**
   * Get filter statistics
   */
  getStats(): FilterStats {
    return { ...this.stats };
  }

  /**
   * Reset filter statistics
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      filtered: 0,
      passed: 0,
      filterBreakdown: {},
    };
  }

  /**
   * Apply all enabled filters to a batch of events
   */
  filterEvents(events: NostrEvent[]): NostrEvent[] {
    const enabledFilters = Array.from(this.filters.values()).filter(f => f.enabled);

    if (enabledFilters.length === 0) {
      return events; // No filtering needed
    }

    const startTime = Date.now();
    const filteredEvents = events.filter(event => this.passesAllFilters(event, enabledFilters));
    const duration = Date.now() - startTime;

    // Update statistics
    this.stats.totalProcessed += events.length;
    this.stats.passed += filteredEvents.length;
    this.stats.filtered += (events.length - filteredEvents.length);

    bundleLog('timelineFilter',
      `📄 Filtered ${events.length} events → ${filteredEvents.length} passed (${duration}ms)`
    );

    return filteredEvents;
  }

  /**
   * Check if an event passes all enabled filters
   */
  private passesAllFilters(event: NostrEvent, filters: ContentFilter[]): boolean {
    for (const filter of filters) {
      if (!this.passesFilter(event, filter)) {
        // Update filter-specific stats
        this.stats.filterBreakdown[filter.id] = (this.stats.filterBreakdown[filter.id] || 0) + 1;
        return false;
      }
    }
    return true;
  }

  /**
   * Check if an event passes a specific filter
   */
  private passesFilter(event: NostrEvent, filter: ContentFilter): boolean {
    const { type, config } = filter;

    switch (type) {
      case 'tag':
        return this.passesTagFilter(event, config);
      case 'content':
        return this.passesContentFilter(event, config);
      case 'author':
        return this.passesAuthorFilter(event, config);
      case 'engagement':
        return this.passesEngagementFilter(event, config);
      case 'custom':
        return config.customFilter ? config.customFilter(event) : true;
      default:
        return true;
    }
  }

  /**
   * Apply tag-based filtering
   */
  private passesTagFilter(event: NostrEvent, config: FilterConfig): boolean {
    const eventTags = event.tags
      .filter(([tagName]) => tagName === 't')
      .map(([, value]) => value?.toLowerCase())
      .filter(Boolean);

    // Check excluded hashtags
    if (config.excludeHashtags?.length) {
      const excludedTags = config.excludeHashtags.map(tag => tag.toLowerCase());
      if (eventTags.some(tag => excludedTags.includes(tag))) {
        return false;
      }
    }

    // Check included hashtags (if specified, event must have at least one)
    if (config.includeHashtags?.length) {
      const includedTags = config.includeHashtags.map(tag => tag.toLowerCase());
      if (!eventTags.some(tag => includedTags.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Apply content-based filtering
   */
  private passesContentFilter(event: NostrEvent, config: FilterConfig): boolean {
    const content = event.content || '';

    // Length filtering
    if (config.minLength && content.length < config.minLength) {
      return false;
    }
    if (config.maxLength && content.length > config.maxLength) {
      return false;
    }

    // Media requirement
    if (config.requireMedia) {
      const hasMedia = validateVideoEvent(event);
      if (!hasMedia) {
        return false;
      }
    }

    return true;
  }

  /**
   * Apply author-based filtering
   */
  private passesAuthorFilter(event: NostrEvent, config: FilterConfig): boolean {
    // Blocked authors
    if (config.blockedAuthors?.includes(event.pubkey)) {
      return false;
    }

    // Preferred authors (if specified, event must be from preferred author)
    if (config.preferredAuthors?.length && !config.preferredAuthors.includes(event.pubkey)) {
      return false;
    }

    // TODO: Implement follower count filtering when profile data is available
    // This would require integration with profile caching service

    return true;
  }

  /**
   * Apply engagement-based filtering
   */
  private passesEngagementFilter(event: NostrEvent, config: FilterConfig): boolean {
    // TODO: Implement engagement filtering when reaction data is available
    // This would require integration with engagement caching service

    // For now, just return true as engagement data needs to be fetched separately
    return true;
  }

  /**
   * Create preset filters for common use cases
   */
  createPresetFilters(): ContentFilter[] {
    return [
      {
        id: 'video-only',
        name: 'Video Content Only',
        enabled: false,
        type: 'content',
        config: {
          requireMedia: true,
        },
      },
      {
        id: 'no-spam',
        name: 'No Spam Content',
        enabled: true,
        type: 'content',
        config: {
          minLength: 10,
          maxLength: 2000,
        },
      },
      {
        id: 'exclude-nsfw',
        name: 'Exclude NSFW Content',
        enabled: false,
        type: 'tag',
        config: {
          excludeHashtags: ['nsfw', 'adult', 'porn', '18+'],
        },
      },
      {
        id: 'bitcoin-only',
        name: 'Bitcoin Content Only',
        enabled: false,
        type: 'tag',
        config: {
          includeHashtags: ['bitcoin', 'btc', 'lightning', 'nostr', 'crypto'],
        },
      },
    ];
  }
}

// Export singleton instance
export const timelineFilterService = new TimelineFilterService();