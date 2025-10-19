/**
 * Broken Video Tracker Service
 * 
 * Tracks videos that have failed to load (404, unsupported format, etc.)
 * Persists the list in sessionStorage to filter them out immediately on subsequent renders
 * This prevents the bad UX of rendering 20 broken videos and auto-skipping through them all
 */

const STORAGE_KEY = 'zaptok_broken_videos';
const MAX_TRACKED_VIDEOS = 500; // Prevent storage from growing indefinitely

class BrokenVideoTracker {
  private brokenVideoIds: Set<string>;
  
  constructor() {
    this.brokenVideoIds = this.loadFromStorage();
  }

  /**
   * Load broken video IDs from sessionStorage
   */
  private loadFromStorage(): Set<string> {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        return new Set(ids);
      }
    } catch (error) {
      console.error('[BrokenVideoTracker] Failed to load from storage:', error);
    }
    return new Set();
  }

  /**
   * Save broken video IDs to sessionStorage
   */
  private saveToStorage(): void {
    try {
      // Convert Set to Array for JSON serialization
      const ids = Array.from(this.brokenVideoIds);
      
      // Limit storage size by keeping only the most recent entries
      const limitedIds = ids.slice(-MAX_TRACKED_VIDEOS);
      
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(limitedIds));
    } catch (error) {
      console.error('[BrokenVideoTracker] Failed to save to storage:', error);
    }
  }

  /**
   * Mark a video as broken/failed
   */
  markAsBroken(eventId: string): void {
    if (!this.brokenVideoIds.has(eventId)) {
      this.brokenVideoIds.add(eventId);
      this.saveToStorage();
      
      if (import.meta.env.DEV) {
        console.log(`[BrokenVideoTracker] Marked video as broken: ${eventId.slice(0, 8)}... (Total: ${this.brokenVideoIds.size})`);
      }
    }
  }

  /**
   * Check if a video has been marked as broken
   */
  isBroken(eventId: string): boolean {
    return this.brokenVideoIds.has(eventId);
  }

  /**
   * Filter out broken videos from an array of video events
   */
  filterBrokenVideos<T extends { id: string }>(videos: T[]): T[] {
    const filtered = videos.filter(video => !this.isBroken(video.id));
    
    const removedCount = videos.length - filtered.length;
    if (removedCount > 0 && import.meta.env.DEV) {
      console.log(`[BrokenVideoTracker] Filtered out ${removedCount} broken videos from feed`);
    }
    
    return filtered;
  }

  /**
   * Clear all tracked broken videos (useful for debugging or user preference)
   */
  clear(): void {
    this.brokenVideoIds.clear();
    sessionStorage.removeItem(STORAGE_KEY);
    
    if (import.meta.env.DEV) {
      console.log('[BrokenVideoTracker] Cleared all broken video records');
    }
  }

  /**
   * Get count of tracked broken videos
   */
  getCount(): number {
    return this.brokenVideoIds.size;
  }
}

// Export singleton instance
export const brokenVideoTracker = new BrokenVideoTracker();
