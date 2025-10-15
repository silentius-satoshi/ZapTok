import { useState, useEffect } from 'react';
import indexedDBService from '@/services/indexedDB.service';

/**
 * Phase 6.4: Thumbnail caching hook
 * Implements offline-first thumbnail loading with IndexedDB blob storage
 * 
 * @param thumbnailUrl - URL of the thumbnail to cache
 * @param enabled - Whether to fetch and cache the thumbnail
 * @returns Object URL for the cached thumbnail or original URL
 */
export function useThumbnailCache(thumbnailUrl: string | undefined, enabled: boolean = true) {
  const [cachedUrl, setCachedUrl] = useState<string | undefined>(thumbnailUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!thumbnailUrl || !enabled) {
      setCachedUrl(thumbnailUrl);
      return;
    }

    let objectUrl: string | null = null;

    const loadThumbnail = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Phase 6.4: Check IndexedDB cache first (offline-first pattern)
        const cachedBlob = await indexedDBService.getThumbnailBlob(thumbnailUrl);

        if (cachedBlob) {
          // Cache HIT: Create object URL from cached blob
          objectUrl = URL.createObjectURL(cachedBlob);
          setCachedUrl(objectUrl);
          if (import.meta.env.DEV) {
            console.log('[Thumbnail Cache] HIT:', thumbnailUrl.slice(0, 50) + '...');
          }
        } else {
          // Cache MISS: Fetch from network and cache
          if (import.meta.env.DEV) {
            console.log('[Thumbnail Cache] MISS:', thumbnailUrl.slice(0, 50) + '...');
          }

          const response = await fetch(thumbnailUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch thumbnail: ${response.statusText}`);
          }

          const blob = await response.blob();

          // Store blob in IndexedDB for future use
          await indexedDBService.putThumbnailBlob(thumbnailUrl, blob);

          // Create object URL for immediate use
          objectUrl = URL.createObjectURL(blob);
          setCachedUrl(objectUrl);

          if (import.meta.env.DEV) {
            console.log('[Thumbnail Cache] STORED:', thumbnailUrl.slice(0, 50) + '...');
          }
        }
      } catch (err) {
        console.error('[Thumbnail Cache] Error:', err);
        setError(err instanceof Error ? err : new Error('Failed to load thumbnail'));
        // Fallback to original URL on error
        setCachedUrl(thumbnailUrl);
      } finally {
        setIsLoading(false);
      }
    };

    loadThumbnail();

    // Cleanup: Revoke object URL when component unmounts or URL changes
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [thumbnailUrl, enabled]);

  return {
    cachedUrl,
    isLoading,
    error,
  };
}
