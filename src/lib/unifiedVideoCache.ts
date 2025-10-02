/**
 * Unified Video Cache Manager
 * Prevents duplicate video loads and manages cache efficiently
 */

import { QueryClient } from '@tanstack/react-query';
import type { VideoEvent } from '@/lib/validateVideoEvent';
import { bundleLog } from '@/lib/logBundler';

interface VideoCacheEntry {
  video: VideoEvent;
  lastAccessed: number;
  accessCount: number;
  engagementData?: {
    likes: number;
    zaps: number;
    comments: number;
    lastUpdated: number;
  };
}

class VideoCache {
  private cache = new Map<string, VideoCacheEntry>();
  private static instance: VideoCache;
  private queryClient?: QueryClient;
  
  // Cache configuration
  private readonly config = {
    maxSize: 1000, // Maximum number of videos to cache
    maxAge: 30 * 60 * 1000, // 30 minutes
    engagementCacheAge: 5 * 60 * 1000, // 5 minutes for engagement data
    cleanupInterval: 10 * 60 * 1000, // 10 minutes cleanup
  };

  private constructor() {
    // Start periodic cleanup
    setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }

  static getInstance(): VideoCache {
    if (!VideoCache.instance) {
      VideoCache.instance = new VideoCache();
    }
    return VideoCache.instance;
  }

  setQueryClient(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Add videos to cache
   */
  cacheVideos(videos: VideoEvent[]) {
    const now = Date.now();
    let newEntries = 0;

    videos.forEach(video => {
      if (!this.cache.has(video.id)) {
        this.cache.set(video.id, {
          video,
          lastAccessed: now,
          accessCount: 1,
        });
        newEntries++;
      } else {
        // Update existing entry
        const entry = this.cache.get(video.id)!;
        entry.video = video; // Update with latest data
        entry.lastAccessed = now;
        entry.accessCount++;
      }
    });

    // Check if cache needs cleaning
    if (this.cache.size > this.config.maxSize) {
      this.cleanup();
    }

    if (newEntries > 0) {
      bundleLog('videoCaching', `Video metadata cached successfully (${newEntries} new, ${this.cache.size} total)`);
    }
  }

  /**
   * Get video from cache
   */
  getVideo(videoId: string): VideoEvent | null {
    const entry = this.cache.get(videoId);
    if (!entry) return null;

    // Check if entry is still valid
    if (Date.now() - entry.lastAccessed > this.config.maxAge) {
      this.cache.delete(videoId);
      return null;
    }

    // Update access info
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return entry.video;
  }

  /**
   * Cache engagement data for a video
   */
  cacheEngagement(videoId: string, engagement: { likes: number; zaps: number; comments: number }) {
    const entry = this.cache.get(videoId);
    if (entry) {
      entry.engagementData = {
        ...engagement,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Get cached engagement data
   */
  getEngagement(videoId: string): { likes: number; zaps: number; comments: number } | null {
    const entry = this.cache.get(videoId);
    if (!entry?.engagementData) return null;

    // Check if engagement data is still fresh
    if (Date.now() - entry.engagementData.lastUpdated > this.config.engagementCacheAge) {
      delete entry.engagementData;
      return null;
    }

    return {
      likes: entry.engagementData.likes,
      zaps: entry.engagementData.zaps,
      comments: entry.engagementData.comments,
    };
  }

  /**
   * Preload videos for better UX
   */
  preloadVideos(videoIds: string[]): Promise<VideoEvent[]> {
    const uncachedIds = videoIds.filter(id => !this.cache.has(id));
    
    if (uncachedIds.length === 0) {
      return Promise.resolve(videoIds.map(id => this.getVideo(id)!).filter(Boolean));
    }

    // Use query client to prefetch if available
    if (this.queryClient) {
      uncachedIds.forEach(videoId => {
        this.queryClient!.prefetchQuery({
          queryKey: ['video-preload', videoId],
          queryFn: () => this.fetchVideoById(videoId),
          staleTime: this.config.maxAge,
        });
      });
    }

    return Promise.resolve([]);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalAccessCount = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.lastAccessed > this.config.maxAge) {
        expiredEntries++;
      } else {
        validEntries++;
        totalAccessCount += entry.accessCount;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      averageAccess: validEntries > 0 ? totalAccessCount / validEntries : 0,
      cacheHitRate: validEntries / (validEntries + expiredEntries) || 0,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    const beforeSize = this.cache.size;
    
    // Remove expired entries
    for (const [videoId, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > this.config.maxAge) {
        this.cache.delete(videoId);
      }
    }

    // If still over limit, remove least accessed entries
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      const toRemove = this.cache.size - this.config.maxSize;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    const afterSize = this.cache.size;
    if (beforeSize !== afterSize) {
      bundleLog('videoCaching', `Cache cleanup: ${beforeSize} → ${afterSize} entries`);
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    bundleLog('videoCaching', 'Video cache cleared');
  }

  /**
   * Mock fetch function for video by ID
   */
  private async fetchVideoById(videoId: string): Promise<VideoEvent | null> {
    // This would be implemented to fetch individual videos
    // For now, return null as this is handled by other hooks
    return null;
  }

  /**
   * Batch operations for better performance
   */
  batchOperation<T>(operations: Array<() => T>): T[] {
    const results: T[] = [];
    
    operations.forEach(operation => {
      try {
        results.push(operation());
      } catch (error) {
        console.warn('Video cache batch operation failed:', error);
      }
    });
    
    return results;
  }
}

// Export singleton instance
export const videoCache = VideoCache.getInstance();

/**
 * Hook to use video cache with React Query integration
 */
export function useVideoCache() {
  const cache = VideoCache.getInstance();

  return {
    cacheVideos: (videos: VideoEvent[]) => cache.cacheVideos(videos),
    getVideo: (videoId: string) => cache.getVideo(videoId),
    cacheEngagement: (videoId: string, engagement: { likes: number; zaps: number; comments: number }) => 
      cache.cacheEngagement(videoId, engagement),
    getEngagement: (videoId: string) => cache.getEngagement(videoId),
    preloadVideos: (videoIds: string[]) => cache.preloadVideos(videoIds),
    getStats: () => cache.getStats(),
    clear: () => cache.clear(),
  };
}