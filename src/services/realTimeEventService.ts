import type { NostrEvent } from '@nostrify/nostrify';
import { validateVideoEvent, type VideoEvent } from '@/lib/validateVideoEvent';
import { bundleLog } from '@/lib/logBundler';

/**
 * Real-time event processing configuration
 */
export interface RealTimeConfig {
  bufferSize: number;
  flushInterval: number; // milliseconds
  deduplication: boolean;
  sortEvents: boolean;
  maxAge: number; // seconds - ignore events older than this
}

/**
 * Event processing statistics
 */
export interface EventProcessingStats {
  totalReceived: number;
  totalProcessed: number;
  duplicatesFiltered: number;
  staleFiltered: number;
  bufferFlushes: number;
  averageProcessingTime: number;
}

/**
 * Callback for processed events
 */
export type EventProcessor = (events: NostrEvent[], source: 'buffer' | 'realtime') => void;

/**
 * Real-time Event Processing Service - Phase 3 Enhancement
 *
 * Handles efficient batching, deduplication, and real-time processing
 * of incoming Nostr events following Jumble's proven patterns
 */
class RealTimeEventService {
  private config: RealTimeConfig;
  private eventBuffer: NostrEvent[] = [];
  private seenEventIds = new Set<string>();
  private flushTimer: NodeJS.Timeout | null = null;
  private processors: EventProcessor[] = [];
  private stats: EventProcessingStats = {
    totalReceived: 0,
    totalProcessed: 0,
    duplicatesFiltered: 0,
    staleFiltered: 0,
    bufferFlushes: 0,
    averageProcessingTime: 0,
  };

  constructor(config: Partial<RealTimeConfig> = {}) {
    this.config = {
      bufferSize: 50,
      flushInterval: 1000, // 1 second
      deduplication: true,
      sortEvents: true,
      maxAge: 3600, // 1 hour
      ...config,
    };

    bundleLog('realTimeEvents', `🔄 Real-time event service initialized`);
    bundleLog('realTimeEvents', `Config: bufferSize=${this.config.bufferSize}, flushInterval=${this.config.flushInterval}ms`);
  }

  /**
   * Register an event processor
   */
  addProcessor(processor: EventProcessor): void {
    this.processors.push(processor);
    bundleLog('realTimeEvents', `🔄 Added event processor (total: ${this.processors.length})`);
  }

  /**
   * Remove an event processor
   */
  removeProcessor(processor: EventProcessor): void {
    const index = this.processors.indexOf(processor);
    if (index > -1) {
      this.processors.splice(index, 1);
      bundleLog('realTimeEvents', `🔄 Removed event processor (remaining: ${this.processors.length})`);
    }
  }

  /**
   * Process a single incoming event
   */
  processEvent(event: NostrEvent): void {
    const startTime = Date.now();
    this.stats.totalReceived++;

    // Check for stale events
    if (this.isStaleEvent(event)) {
      this.stats.staleFiltered++;
      return;
    }

    // Check for duplicates
    if (this.config.deduplication && this.seenEventIds.has(event.id)) {
      this.stats.duplicatesFiltered++;
      return;
    }

    // Add to seen set if deduplication is enabled
    if (this.config.deduplication) {
      this.seenEventIds.add(event.id);
    }

    // Add to buffer
    this.eventBuffer.push(event);

    // Update processing time stats
    const processingTime = Date.now() - startTime;
    this.updateProcessingTime(processingTime);

    // Check if buffer should be flushed
    if (this.eventBuffer.length >= this.config.bufferSize) {
      this.flushBuffer('buffer-full');
    } else if (!this.flushTimer) {
      // Start flush timer if not already running
      this.scheduleFlush();
    }

    bundleLog('realTimeEvents', `🔄 Processed event ${event.id.slice(0, 8)} (buffer: ${this.eventBuffer.length})`);
  }

  /**
   * Process multiple events at once
   */
  processEvents(events: NostrEvent[]): void {
    const startTime = Date.now();

    for (const event of events) {
      this.processEvent(event);
    }

    const duration = Date.now() - startTime;
    bundleLog('realTimeEvents', `🔄 Batch processed ${events.length} events in ${duration}ms`);
  }

  /**
   * Force flush the current buffer
   */
  flushBuffer(reason: string = 'manual'): void {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    this.stats.bufferFlushes++;

    // Clear flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Sort events if configured
    if (this.config.sortEvents) {
      events.sort((a, b) => b.created_at - a.created_at);
    }

    // Process events through all registered processors
    for (const processor of this.processors) {
      try {
        processor(events, 'buffer');
      } catch (error) {
        bundleLog('realTimeEvents', `❌ Error in event processor: ${error}`);
      }
    }

    this.stats.totalProcessed += events.length;
    bundleLog('realTimeEvents', `🔄 Flushed ${events.length} events (reason: ${reason})`);
  }

  /**
   * Get current processing statistics
   */
  getStats(): EventProcessingStats {
    return { ...this.stats };
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.eventBuffer.length;
  }

  /**
   * Reset processing statistics
   */
  resetStats(): void {
    this.stats = {
      totalReceived: 0,
      totalProcessed: 0,
      duplicatesFiltered: 0,
      staleFiltered: 0,
      bufferFlushes: 0,
      averageProcessingTime: 0,
    };
    bundleLog('realTimeEvents', '🔄 Reset processing statistics');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RealTimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    bundleLog('realTimeEvents', `🔄 Updated configuration: ${Object.keys(newConfig).join(', ')}`);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining events
    this.flushBuffer('destroy');

    // Clear processors
    this.processors = [];

    // Clear seen events cache
    this.seenEventIds.clear();

    bundleLog('realTimeEvents', '🔄 Real-time event service destroyed');
  }

  /**
   * Schedule a buffer flush
   */
  private scheduleFlush(): void {
    this.flushTimer = setTimeout(() => {
      this.flushBuffer('timer');
    }, this.config.flushInterval);
  }

  /**
   * Check if an event is too old to process
   */
  private isStaleEvent(event: NostrEvent): boolean {
    const now = Math.floor(Date.now() / 1000);
    const eventAge = now - event.created_at;
    return eventAge > this.config.maxAge;
  }

  /**
   * Update average processing time statistics
   */
  private updateProcessingTime(processingTime: number): void {
    if (this.stats.totalReceived === 1) {
      this.stats.averageProcessingTime = processingTime;
    } else {
      // Calculate rolling average
      const weight = 0.1; // Weight for new measurement
      this.stats.averageProcessingTime =
        (1 - weight) * this.stats.averageProcessingTime + weight * processingTime;
    }
  }
}

/**
 * Video-specific real-time event service
 * Optimized for processing video events with enhanced validation
 */
export class VideoRealTimeService extends RealTimeEventService {
  constructor(config: Partial<RealTimeConfig> = {}) {
    super({
      bufferSize: 20, // Smaller buffer for video events
      flushInterval: 500, // Faster flush for real-time video feeds
      deduplication: true,
      sortEvents: true,
      maxAge: 1800, // 30 minutes for video content
      ...config,
    });
  }

  /**
   * Process event with video validation
   */
  processEvent(event: NostrEvent): void {
    // Only process valid video events
    if (validateVideoEvent(event)) {
      super.processEvent(event);
    } else {
      bundleLog('realTimeEvents', `🔄 Skipped non-video event ${event.id.slice(0, 8)}`);
    }
  }

  /**
   * Process video events and notify processors
   */
  processVideoEvents(events: VideoEvent[]): void {
    this.processEvents(events);
  }
}

// Export singleton instances
export const realTimeEventService = new RealTimeEventService();
export const videoRealTimeService = new VideoRealTimeService();