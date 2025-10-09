/**
 * Video Nutzaps Service
 * 
 * Singleton service using DataLoader pattern to batch nutzap queries (kind 7376).
 * 
 * **CRITICAL: Uses separate NPool instance for Cashu relay isolation**
 * - Creates dedicated NPool connecting ONLY to Cashu relay (wss://relay.chorus.community)
 * - 100% isolated from SimplePool (general relays)
 * - Prevents Cashu event leakage to general relays
 * - Maintains dual-pool architecture integrity
 * 
 * Architecture:
 * - Singleton pattern for global state management
 * - Dedicated NPool instance (not shared with reactions/comments/reposts)
 * - DataLoader for batching with 50ms window
 * - useSyncExternalStore integration for React components
 * - In-memory cache with 2-minute TTL
 */

import DataLoader from 'dataloader';
import type { NostrEvent } from '@nostrify/nostrify';
import { NPool, NRelay1 } from '@nostrify/nostrify';
import { isValidZapForVideo } from '@/lib/videoAnalyticsValidators';
import { logInfo, logWarning, logError } from '@/lib/logger';
import { CASHU_RELAY } from '@/lib/simplePool';

export interface VideoNutzaps {
  totalAmount: number;
  count: number;
  nutzaps: NostrEvent[];
  updatedAt?: number;
}

type Subscriber = () => void;

/**
 * Singleton service for managing video nutzaps with DataLoader batching
 * Uses dedicated NPool for Cashu relay isolation
 */
class VideoNutzapsService {
  private static instance: VideoNutzapsService | null = null;
  private cashuPool: NPool | null = null;
  private cache = new Map<string, VideoNutzaps>();
  private subscribers = new Set<Subscriber>();
  private dataLoader: DataLoader<string, VideoNutzaps>;
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  private constructor() {
    // Initialize dedicated NPool for Cashu relay ONLY
    this.initializeCashuPool();

    // Initialize DataLoader with batching configuration
    this.dataLoader = new DataLoader<string, VideoNutzaps>(
      (videoIds) => this.batchLoadNutzaps(videoIds),
      {
        // Batch requests within 50ms window
        batchScheduleFn: (callback) => setTimeout(callback, 50),
        maxBatchSize: 100,
        cache: false, // We manage our own cache
      }
    );
  }

  /**
   * Initialize dedicated NPool instance for Cashu relay
   * This pool is completely separate from the main SimplePool
   */
  private initializeCashuPool(): void {
    this.cashuPool = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // Always route to Cashu relay only
        const relayMap = new Map<string, typeof filters>();
        relayMap.set(CASHU_RELAY, filters);
        return relayMap;
      },
      eventRouter() {
        // All nutzap events go to Cashu relay only
        return [CASHU_RELAY];
      },
    });

    logInfo(`[VideoNutzapsService] Initialized dedicated NPool for Cashu relay: ${CASHU_RELAY}`);
  }

  static getInstance(): VideoNutzapsService {
    if (!VideoNutzapsService.instance) {
      VideoNutzapsService.instance = new VideoNutzapsService();
    }
    return VideoNutzapsService.instance;
  }

  /**
   * Get nutzaps for a specific video (uses DataLoader batching)
   */
  async getNutzaps(videoId: string): Promise<VideoNutzaps> {
    if (!this.cashuPool) {
      logWarning('[VideoNutzapsService] Cashu pool not initialized, returning empty nutzaps');
      return { totalAmount: 0, count: 0, nutzaps: [] };
    }

    // Check cache first
    const cached = this.cache.get(videoId);
    if (cached && cached.updatedAt && Date.now() - cached.updatedAt < this.CACHE_TTL) {
      return cached;
    }

    // Use DataLoader (will batch with other concurrent requests)
    return this.dataLoader.load(videoId);
  }

  /**
   * Batch load nutzaps for multiple videos
   * This is called by DataLoader with all pending requests
   * 
   * **Routes to Cashu relay ONLY via dedicated NPool**
   */
  private async batchLoadNutzaps(videoIds: readonly string[]): Promise<VideoNutzaps[]> {
    if (!this.cashuPool) {
      return videoIds.map(() => ({ totalAmount: 0, count: 0, nutzaps: [] }));
    }

    try {
      logInfo(`[DataLoader] Batching ${videoIds.length} video nutzap queries → Cashu relay ONLY`);
      
      const signal = AbortSignal.timeout(5000);
      
      // Single batched query for all video IDs
      // Kind 7376 is the Cashu nutzap event kind
      const filter = {
        kinds: [7376], // Cashu nutzap kind
        '#e': Array.from(videoIds),
        limit: 50 * videoIds.length, // Accommodate multiple videos
      };

      // Query via dedicated Cashu pool (isolated from general relays)
      const events = await this.cashuPool.query([filter], { signal });

      logInfo(`[VideoNutzaps] 📊 Received ${events.length} nutzap events for ${videoIds.length} videos`);

      // Group nutzaps by video ID
      const nutzapsByVideo = new Map<string, NostrEvent[]>();
      
      events.forEach((event) => {
        // Find which video this nutzap references
        const eTags = event.tags.filter(([name]) => name === 'e');
        eTags.forEach(([_, eventId]) => {
          if (videoIds.includes(eventId)) {
            if (!nutzapsByVideo.has(eventId)) {
              nutzapsByVideo.set(eventId, []);
            }
            nutzapsByVideo.get(eventId)!.push(event);
          }
        });
      });

      // Process nutzaps for each video
      const results = Array.from(videoIds).map((videoId) => {
        const videoNutzaps = nutzapsByVideo.get(videoId) || [];
        
        // Calculate total amount from nutzap events
        const totalAmount = videoNutzaps.reduce((sum, zapEvent) => {
          try {
            const amountTag = zapEvent.tags.find(tag => tag[0] === 'amount');
            if (amountTag && amountTag[1]) {
              const amount = parseInt(amountTag[1], 10);
              return sum + (isNaN(amount) ? 0 : amount);
            }
          } catch (error) {
            logError('[VideoNutzapsService] Error parsing nutzap amount:', error);
          }
          return sum;
        }, 0);

        const result: VideoNutzaps = {
          totalAmount,
          count: videoNutzaps.length,
          nutzaps: videoNutzaps,
          updatedAt: Date.now(),
        };

        // Update cache
        this.cache.set(videoId, result);
        
        return result;
      });

      // Notify subscribers of cache update
      this.notifySubscribers();

      return results;
    } catch (error) {
      logError('[VideoNutzapsService] Batch query failed:', error);
      // Return empty results for all videos on error
      return videoIds.map(() => ({ totalAmount: 0, count: 0, nutzaps: [] }));
    }
  }

  /**
   * Subscribe to cache updates (for useSyncExternalStore)
   */
  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get snapshot of cached nutzaps (for useSyncExternalStore)
   */
  getSnapshot(videoId: string): VideoNutzaps | null {
    return this.cache.get(videoId) || null;
  }

  /**
   * Notify all subscribers of cache updates
   */
  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  /**
   * Clear cache for a specific video or all videos
   */
  clearCache(videoId?: string): void {
    if (videoId) {
      this.cache.delete(videoId);
      this.dataLoader.clear(videoId);
    } else {
      this.cache.clear();
      this.dataLoader.clearAll();
    }
    this.notifySubscribers();
  }

  /**
   * Prefetch nutzaps for multiple videos (single batched query)
   */
  async prefetch(videoIds: string[]): Promise<void> {
    await Promise.all(videoIds.map((id) => this.dataLoader.load(id)));
  }

  /**
   * Prefetch nutzaps for multiple videos (alias for clarity)
   * Use this in feed components to load all nutzaps in one batch
   */
  async prefetchNutzaps(videoIds: string[]): Promise<void> {
    if (!this.cashuPool) {
      logWarning('[VideoNutzapsService] Cannot prefetch - Cashu pool not initialized');
      return;
    }

    if (videoIds.length === 0) return;

    logInfo(`[VideoNutzaps] 🚀 Prefetching nutzaps for ${videoIds.length} videos`);
    await this.prefetch(videoIds);
  }

  /**
   * Get the Cashu relay URL being used
   */
  getCashuRelay(): string {
    return CASHU_RELAY;
  }
}

// Export singleton instance
export const videoNutzapsService = VideoNutzapsService.getInstance();
