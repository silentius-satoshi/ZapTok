import DataLoader from 'dataloader';
import type { NostrEvent } from '@nostrify/nostrify';

export interface VideoReactions {
  zaps: number;
  totalSats: number;
  updatedAt?: number;
}

// Type for the Nostr client query function
type NostrQueryFn = (
  filters: any[],
  options?: { signal?: AbortSignal }
) => Promise<NostrEvent[]>;

class VideoReactionsService {
  static instance: VideoReactionsService;
  private reactionsMap = new Map<string, VideoReactions>();
  private subscribers = new Map<string, Set<() => void>>();
  private nostrQueryFn: NostrQueryFn | null = null;

  // DataLoader for batching reaction queries
  // This reduces 14+ concurrent queries to 1-2 batched queries
  private reactionsLoader = new DataLoader<string, VideoReactions>(
    this.batchLoadReactions.bind(this),
    {
      // 50ms batch window (following Jumble's pattern)
      batchScheduleFn: (callback) => setTimeout(callback, 50),
      // Maximum 100 video IDs per batch query
      maxBatchSize: 100,
      // Cache results in reactionsMap instead of DataLoader's cache
      cache: false,
    }
  );

  constructor() {
    if (!VideoReactionsService.instance) {
      VideoReactionsService.instance = this;
    }
    return VideoReactionsService.instance;
  }

  /**
   * Set the Nostr query function (called from hook initialization)
   */
  setNostrQueryFn(queryFn: NostrQueryFn): void {
    this.nostrQueryFn = queryFn;
  }

  /**
   * Batch load function that groups multiple video IDs into a single Nostr query
   * This is the core optimization that reduces relay load
   */
  private async batchLoadReactions(
    videoIds: readonly string[]
  ): Promise<VideoReactions[]> {
    console.log(`[DataLoader] Batching ${videoIds.length} video reaction queries`);

    if (!this.nostrQueryFn) {
      console.error('[DataLoader] Nostr query function not initialized');
      return videoIds.map(() => ({
        zaps: 0,
        totalSats: 0,
      }));
    }

    try {
      // Single batched query for all video IDs
      const filter = {
        kinds: [9735], // Only zaps (removed kind 7 likes - not displayed in UI)
        '#e': Array.from(videoIds), // All video IDs in one query
        limit: 250 * videoIds.length, // Reduced from 500 (only zaps now)
      };

      // Use the nostr client to query
      const events = await this.nostrQueryFn([filter], {
        signal: AbortSignal.timeout(5000),
      });

      // Group events by video ID
      const eventsByVideoId = new Map<string, NostrEvent[]>();
      videoIds.forEach((id) => eventsByVideoId.set(id, []));

      events.forEach((event) => {
        // Find which video this event is for
        const eTag = event.tags.find((tag) => tag[0] === 'e');
        if (eTag && eTag[1]) {
          const videoId = eTag[1];
          const existing = eventsByVideoId.get(videoId);
          if (existing) {
            existing.push(event);
          }
        }
      });

      // Process each video's reactions
      const results = videoIds.map((videoId) => {
        const videoEvents = eventsByVideoId.get(videoId) || [];
        const reactions = this.processReactionEvents(videoEvents);
        
        // Cache in our map
        this.reactionsMap.set(videoId, reactions);
        
        // Notify subscribers
        this.notifySubscribers(videoId);
        
        return reactions;
      });

      return results;
    } catch (error) {
      console.error('[DataLoader] Batch load failed:', error);
      
      // Return empty reactions for all video IDs on error
      return videoIds.map(() => ({
        zaps: 0,
        totalSats: 0,
      }));
    }
  }

  /**
   * Process raw Nostr events into structured VideoReactions
   * Now only processes zap events (kind 9735) - likes (kind 7) removed as they're not displayed in UI
   */
  private processReactionEvents(events: NostrEvent[]): VideoReactions {
    // Calculate zap totals
    let totalSats = 0;
    events.forEach((zapEvent) => {
      const bolt11Tag = zapEvent.tags.find((tag) => tag[0] === 'bolt11');
      if (bolt11Tag && bolt11Tag[1]) {
        try {
          // Extract amount from bolt11 invoice
          const amountMatch = bolt11Tag[1].match(/lnbc(\d+)/);
          if (amountMatch) {
            const millisats = parseInt(amountMatch[1]);
            totalSats += Math.floor(millisats / 1000);
          }
        } catch (error) {
          console.warn('Failed to parse zap amount:', error);
        }
      }
    });

    return {
      zaps: events.length,
      totalSats,
      updatedAt: Date.now(),
    };
  }

  /**
   * Subscribe to reaction updates for a specific video
   * Returns unsubscribe function
   */
  subscribeReactions(videoId: string, callback: () => void): () => void {
    let set = this.subscribers.get(videoId);
    if (!set) {
      set = new Set();
      this.subscribers.set(videoId, set);
    }
    set.add(callback);

    return () => {
      set?.delete(callback);
      if (set?.size === 0) {
        this.subscribers.delete(videoId);
      }
    };
  }

  /**
   * Notify all subscribers for a specific video
   */
  private notifySubscribers(videoId: string): void {
    const set = this.subscribers.get(videoId);
    if (set) {
      set.forEach((cb) => cb());
    }
  }

  /**
   * Get cached reactions for a video (synchronous)
   */
  getReactions(videoId: string): VideoReactions | undefined {
    return this.reactionsMap.get(videoId);
  }

  /**
   * Load reactions for a video (async, uses DataLoader batching)
   */
  async loadReactions(videoId: string): Promise<VideoReactions> {
    // Check cache first
    const cached = this.reactionsMap.get(videoId);
    if (cached && cached.updatedAt) {
      // Cache is valid for 2 minutes
      const age = Date.now() - cached.updatedAt;
      if (age < 2 * 60 * 1000) {
        return cached;
      }
    }

    // Load via DataLoader (will be batched with other concurrent requests)
    return await this.reactionsLoader.load(videoId);
  }

  /**
   * Manually update reactions (e.g., after user likes/zaps)
   */
  updateReactions(videoId: string, reactions: VideoReactions): void {
    this.reactionsMap.set(videoId, reactions);
    this.notifySubscribers(videoId);
  }

  /**
   * Clear cache for a specific video
   */
  clearCache(videoId: string): void {
    this.reactionsMap.delete(videoId);
    this.reactionsLoader.clear(videoId);
    this.notifySubscribers(videoId);
  }

  /**
   * Clear all cached reactions
   */
  clearAllCache(): void {
    this.reactionsMap.clear();
    this.reactionsLoader.clearAll();
  }
}

// Singleton instance
const instance = new VideoReactionsService();
export default instance;
