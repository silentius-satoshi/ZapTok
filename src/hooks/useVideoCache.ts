import { useCallback } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoEvent extends NostrEvent {
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
}

export function useVideoCache() {
  // Cache video metadata in IndexedDB for offline access
  const cacheVideoMetadata = useCallback(async (videoData: VideoEvent[]) => {
    if (!('indexedDB' in window) || !videoData.length) return;

    try {
      // Simple IndexedDB wrapper for video metadata
      const request = indexedDB.open('ZapTokCache', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('videoMetadata')) {
          const store = db.createObjectStore('videoMetadata', { keyPath: 'id' });
          store.createIndex('cached_at', 'cached_at');
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['videoMetadata'], 'readwrite');
        const store = transaction.objectStore('videoMetadata');
        
        videoData.forEach(video => {
          const cacheEntry = {
            ...video,
            cached_at: Date.now(),
            // Limit cache size by only storing essential data
            content: video.content.substring(0, 500),
          };
          store.put(cacheEntry);
        });
        
        transaction.oncomplete = () => {
        if (import.meta.env.DEV) {
          console.log('Video metadata cached successfully');
        }
        };
        
        transaction.onerror = (error) => {
          console.warn('Failed to cache video metadata:', error);
        };
      };
      
      request.onerror = (error) => {
        console.warn('Failed to open IndexedDB:', error);
      };
    } catch (error) {
      console.warn('IndexedDB not supported or failed:', error);
    }
  }, []);
  
  // Preload video thumbnails
  const preloadThumbnails = useCallback((thumbnailUrls: string[]) => {
    thumbnailUrls.forEach(url => {
      if (url && url.startsWith('http')) {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Handle CORS if needed
        img.onload = () => {
          // Successfully preloaded
        };
        img.onerror = () => {
          console.warn('Failed to preload thumbnail:', url);
        };
        img.src = url;
      }
    });
  }, []);

  // Clean old cache entries (keep only last 7 days)
  const cleanCache = useCallback(async () => {
    if (!('indexedDB' in window)) return;

    try {
      const request = indexedDB.open('ZapTokCache', 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['videoMetadata'], 'readwrite');
        const store = transaction.objectStore('videoMetadata');
        const index = store.index('cached_at');
        
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const range = IDBKeyRange.upperBound(weekAgo);
        
        index.openCursor(range).onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      };
    } catch (error) {
      console.warn('Failed to clean cache:', error);
    }
  }, []);
  
  return { cacheVideoMetadata, preloadThumbnails, cleanCache };
}
