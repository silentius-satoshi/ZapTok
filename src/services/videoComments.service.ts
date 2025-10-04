/**
 * Video Comments Service
 * 
 * Singleton service using DataLoader pattern to batch NIP-22 comment queries.
 * Optimizes relay queries by combining multiple video comment requests into a single batched query.
 * 
 * **Uses main NPool (multiple general relays) via nostr.query**
 * 
 * Architecture:
 * - Singleton pattern for global state management
 * - DataLoader for batching with 50ms window
 * - useSyncExternalStore integration for React components
 * - In-memory cache with 2-minute TTL
 */

import DataLoader from 'dataloader';
import type { NostrEvent } from '@nostrify/nostrify';

export interface VideoComments {
  comments: NostrEvent[];
  commentCount: number;
  updatedAt?: number;
}

type Subscriber = () => void;

// Type for the Nostr client query function
type NostrQueryFn = (
  filters: any[],
  options?: { signal?: AbortSignal }
) => Promise<NostrEvent[]>;

/**
 * Singleton service for managing video comments with DataLoader batching
 */
class VideoCommentsService {
  private static instance: VideoCommentsService | null = null;
  private nostrQueryFn: NostrQueryFn | null = null;
  private cache = new Map<string, VideoComments>();
  private subscribers = new Set<Subscriber>();
  private dataLoader: DataLoader<string, VideoComments>;
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  private constructor() {
    // Initialize DataLoader with batching configuration
    this.dataLoader = new DataLoader<string, VideoComments>(
      (videoIds) => this.batchLoadComments(videoIds),
      {
        // Batch requests within 50ms window
        batchScheduleFn: (callback) => setTimeout(callback, 50),
        maxBatchSize: 100,
        cache: false, // We manage our own cache
      }
    );
  }

  static getInstance(): VideoCommentsService {
    if (!VideoCommentsService.instance) {
      VideoCommentsService.instance = new VideoCommentsService();
    }
    return VideoCommentsService.instance;
  }

  /**
   * Set the Nostr query function (called from hook initialization)
   */
  setNostrQueryFn(queryFn: NostrQueryFn): void {
    this.nostrQueryFn = queryFn;
  }

  /**
   * Get comments for a specific video (uses DataLoader batching)
   */
  async getComments(videoId: string): Promise<VideoComments> {
    if (!this.nostrQueryFn) {
      console.warn('[VideoCommentsService] Query function not set, returning empty comments');
      return { comments: [], commentCount: 0 };
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
   * Batch load comments for multiple videos
   * This is called by DataLoader with all pending requests
   */
  private async batchLoadComments(videoIds: readonly string[]): Promise<VideoComments[]> {
    if (!this.nostrQueryFn) {
      console.error('[VideoCommentsService] Query function not initialized');
      return videoIds.map(() => ({ comments: [], commentCount: 0 }));
    }

    try {
      console.log(`[DataLoader] Batching ${videoIds.length} video comment queries`);
      
      const signal = AbortSignal.timeout(5000);
      
      // Single batched query for all video IDs
      const filter = {
        kinds: [1111], // NIP-22 comments
        '#e': Array.from(videoIds),
        limit: 100 * videoIds.length, // Accommodate multiple videos
      };

      const events = await this.nostrQueryFn([filter], { signal });

      // Group comments by video ID
      const commentsByVideo = new Map<string, NostrEvent[]>();
      
      events.forEach((event) => {
        // Find which video this comment references
        const eTags = event.tags.filter(([name]) => name === 'e');
        eTags.forEach(([_, eventId]) => {
          if (videoIds.includes(eventId)) {
            if (!commentsByVideo.has(eventId)) {
              commentsByVideo.set(eventId, []);
            }
            commentsByVideo.get(eventId)!.push(event);
          }
        });
      });

      // Process comments for each video
      const results = Array.from(videoIds).map((videoId) => {
        const videoComments = commentsByVideo.get(videoId) || [];
        
        // Validate and filter comments according to NIP-22
        const validComments = videoComments.filter((event) => {
          const hasParentE = event.tags.some(([name]) => name === 'e');
          const hasParentK = event.tags.some(([name]) => name === 'k');
          const hasParentP = event.tags.some(([name]) => name === 'p');
          return hasParentE && hasParentK && hasParentP;
        });

        // Sort by creation time (newest first)
        const sortedComments = validComments.sort((a, b) => b.created_at - a.created_at);

        const result: VideoComments = {
          comments: sortedComments,
          commentCount: sortedComments.length,
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
      console.error('[VideoCommentsService] Batch query failed:', error);
      // Return empty results for all videos on error
      return videoIds.map(() => ({ comments: [], commentCount: 0 }));
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
   * Get snapshot of cached comments (for useSyncExternalStore)
   */
  getSnapshot(videoId: string): VideoComments | null {
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
   * Prefetch comments for multiple videos
   */
  async prefetch(videoIds: string[]): Promise<void> {
    await Promise.all(videoIds.map((id) => this.dataLoader.load(id)));
  }
}

// Export singleton instance
export const videoCommentsService = VideoCommentsService.getInstance();
