/**
 * Video Reposts Service
 * 
 * Singleton service using DataLoader pattern to batch repost queries (kinds 6, 16).
 * Optimizes relay queries by combining multiple video repost requests into a single batched query.
 * 
 * **Uses relay group (multiple general relays) via nostr.group(BIG_RELAY_URLS)**
 * 
 * Architecture:
 * - Singleton pattern for global state management
 * - DataLoader for batching with 50ms window
 * - useSyncExternalStore integration for React components
 * - In-memory cache with 2-minute TTL
 */

import DataLoader from 'dataloader';
import type { NostrEvent } from '@nostrify/nostrify';
import { isValidRepostForVideo } from '@/lib/videoAnalyticsValidators';

export interface VideoReposts {
  count: number;
  reposts: NostrEvent[];
  updatedAt?: number;
}

type Subscriber = () => void;

// Type for the Nostr client query function
type NostrQueryFn = (
  filters: any[],
  options?: { signal?: AbortSignal }
) => Promise<NostrEvent[]>;

/**
 * Singleton service for managing video reposts with DataLoader batching
 */
class VideoRepostsService {
  private static instance: VideoRepostsService | null = null;
  private nostrQueryFn: NostrQueryFn | null = null;
  private cache = new Map<string, VideoReposts>();
  private subscribers = new Set<Subscriber>();
  private dataLoader: DataLoader<string, VideoReposts>;
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  private constructor() {
    // Initialize DataLoader with batching configuration
    this.dataLoader = new DataLoader<string, VideoReposts>(
      (videoIds) => this.batchLoadReposts(videoIds),
      {
        // Batch requests within 50ms window
        batchScheduleFn: (callback) => setTimeout(callback, 50),
        maxBatchSize: 100,
        cache: false, // We manage our own cache
      }
    );
  }

  static getInstance(): VideoRepostsService {
    if (!VideoRepostsService.instance) {
      VideoRepostsService.instance = new VideoRepostsService();
    }
    return VideoRepostsService.instance;
  }

  /**
   * Set the Nostr query function (called from hook initialization)
   */
  setNostrQueryFn(queryFn: NostrQueryFn): void {
    this.nostrQueryFn = queryFn;
  }

  /**
   * Get reposts for a specific video (uses DataLoader batching)
   */
  async getReposts(videoId: string): Promise<VideoReposts> {
    if (!this.nostrQueryFn) {
      console.warn('[VideoRepostsService] Query function not set, returning empty reposts');
      return { count: 0, reposts: [] };
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
   * Batch load reposts for multiple videos
   * This is called by DataLoader with all pending requests
   */
  private async batchLoadReposts(videoIds: readonly string[]): Promise<VideoReposts[]> {
    if (!this.nostrQueryFn) {
      console.error('[VideoRepostsService] Query function not initialized');
      return videoIds.map(() => ({ count: 0, reposts: [] }));
    }

    try {
      console.log(`[DataLoader] Batching ${videoIds.length} video repost queries`);
      
      const signal = AbortSignal.timeout(5000);
      
      // Single batched query for all video IDs
      const filter = {
        kinds: [6, 16], // Regular and generic reposts
        '#e': Array.from(videoIds),
        limit: 250 * videoIds.length, // Accommodate multiple videos
      };

      const events = await this.nostrQueryFn([filter], { signal });

      console.log(`[VideoReposts] 📊 Received ${events.length} repost events for ${videoIds.length} videos`);

      // Group reposts by video ID
      const repostsByVideo = new Map<string, NostrEvent[]>();
      
      events.forEach((event) => {
        // Find which video this repost references
        const eTags = event.tags.filter(([name]) => name === 'e');
        eTags.forEach(([_, eventId]) => {
          if (videoIds.includes(eventId)) {
            // Validate that this is a proper repost of this video
            const isValid = isValidRepostForVideo(event, eventId);
            
            if (!isValid) {
              console.log(`[VideoReposts] ❌ Invalid repost for video ${eventId.slice(0, 8)}:`, {
                repostId: event.id.slice(0, 8) + '...',
                kind: event.kind,
                hasETag: event.tags.some(([name]) => name === 'e'),
                hasKTag: event.tags.some(([name]) => name === 'k'),
              });
              return; // Skip invalid reposts
            }
            
            if (!repostsByVideo.has(eventId)) {
              repostsByVideo.set(eventId, []);
            }
            repostsByVideo.get(eventId)!.push(event);
          }
        });
      });

      // Process reposts for each video
      const results = Array.from(videoIds).map((videoId) => {
        const videoReposts = repostsByVideo.get(videoId) || [];
        
        // Deduplicate by user (one repost per user, keep latest)
        const uniqueReposts = new Map<string, NostrEvent>();
        videoReposts.forEach((repost) => {
          const existing = uniqueReposts.get(repost.pubkey);
          if (!existing || repost.created_at > existing.created_at) {
            uniqueReposts.set(repost.pubkey, repost);
          }
        });

        const reposts = Array.from(uniqueReposts.values());

        const result: VideoReposts = {
          count: reposts.length,
          reposts,
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
      console.error('[VideoRepostsService] Batch query failed:', error);
      // Return empty results for all videos on error
      return videoIds.map(() => ({ count: 0, reposts: [] }));
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
   * Get snapshot of cached reposts (for useSyncExternalStore)
   */
  getSnapshot(videoId: string): VideoReposts | null {
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
   * Prefetch reposts for multiple videos
   */
  async prefetch(videoIds: string[]): Promise<void> {
    await Promise.all(videoIds.map((id) => this.dataLoader.load(id)));
  }
}

// Export singleton instance
export const videoRepostsService = VideoRepostsService.getInstance();
