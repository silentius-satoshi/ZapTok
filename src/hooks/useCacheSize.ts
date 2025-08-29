import { useState, useEffect, useCallback } from 'react';

interface CacheSizes {
  serviceWorker: number;
  indexedDB: number;
  localStorage: number;
  total: number;
}

interface CacheSizeBreakdown {
  videoCache: number;
  profileImages: number;
  appResources: number;
  other: number;
}

export function useCacheSize() {
  const [sizes, setSizes] = useState<CacheSizes>({
    serviceWorker: 0,
    indexedDB: 0,
    localStorage: 0,
    total: 0,
  });

  const [breakdown, setBreakdown] = useState<CacheSizeBreakdown>({
    videoCache: 0,
    profileImages: 0,
    appResources: 0,
    other: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate Service Worker cache sizes
  const calculateServiceWorkerCacheSize = useCallback(async (): Promise<number> => {
    if (!('caches' in window)) return 0;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            // Estimate response size based on headers and content
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              totalSize += parseInt(contentLength, 10);
            } else {
              // Fallback: clone response and read size
              try {
                const blob = await response.clone().blob();
                totalSize += blob.size;
              } catch {
                // If we can't read the response, estimate based on URL
                totalSize += 1024; // 1KB fallback estimate
              }
            }
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.warn('Failed to calculate Service Worker cache size:', error);
      return 0;
    }
  }, []);

  // Calculate IndexedDB size
  const calculateIndexedDBSize = useCallback(async (): Promise<number> => {
    if (!('indexedDB' in window)) return 0;

    try {
      // Get storage estimate which includes IndexedDB
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        // This is an approximation since we can't easily separate IndexedDB from other storage
        return estimate.usage || 0;
      }

      // Fallback: try to calculate ZapTok cache specifically
      return new Promise((resolve) => {
        const request = indexedDB.open('ZapTokCache', 1);
        
        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains('videoMetadata')) {
            resolve(0);
            return;
          }

          const transaction = db.transaction(['videoMetadata'], 'readonly');
          const store = transaction.objectStore('videoMetadata');
          const getAllRequest = store.getAll();

          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;
            let totalSize = 0;

            records.forEach(record => {
              // Estimate size based on JSON string length
              const jsonString = JSON.stringify(record);
              totalSize += new Blob([jsonString]).size;
            });

            resolve(totalSize);
          };

          getAllRequest.onerror = () => resolve(0);
        };

        request.onerror = () => resolve(0);
      });
    } catch (error) {
      console.warn('Failed to calculate IndexedDB size:', error);
      return 0;
    }
  }, []);

  // Calculate localStorage size
  const calculateLocalStorageSize = useCallback((): number => {
    try {
      let totalSize = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            // Calculate size of key + value
            totalSize += new Blob([key + value]).size;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.warn('Failed to calculate localStorage size:', error);
      return 0;
    }
  }, []);

  // Calculate breakdown by category
  const calculateBreakdown = useCallback(async (totalSW: number, totalIDB: number): Promise<CacheSizeBreakdown> => {
    const breakdown: CacheSizeBreakdown = {
      videoCache: 0,
      profileImages: 0,
      appResources: 0,
      other: 0,
    };

    try {
      // Video cache is primarily in IndexedDB
      breakdown.videoCache = Math.floor(totalIDB * 0.8); // Estimate 80% of IndexedDB is video metadata

      // Profile images and app resources are in Service Worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          for (const request of requests) {
            const url = request.url.toLowerCase();
            const response = await cache.match(request);
            
            if (response) {
              let size = 0;
              const contentLength = response.headers.get('content-length');
              
              if (contentLength) {
                size = parseInt(contentLength, 10);
              } else {
                try {
                  const blob = await response.clone().blob();
                  size = blob.size;
                } catch {
                  size = 1024; // Fallback
                }
              }

              // Categorize based on URL patterns
              if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
                  url.includes('.webp') || url.includes('.gif') || url.includes('.svg')) {
                
                if (url.includes('profile') || url.includes('avatar') || url.includes('pfp')) {
                  breakdown.profileImages += size;
                } else {
                  breakdown.appResources += size;
                }
              } else if (url.includes('.js') || url.includes('.css') || url.includes('.woff') || 
                        url.includes('.woff2') || url.includes('.ttf') || url.includes('manifest')) {
                breakdown.appResources += size;
              } else {
                breakdown.other += size;
              }
            }
          }
        }
      }

      // Add remaining IndexedDB to video cache
      const accountedSW = breakdown.profileImages + breakdown.appResources + breakdown.other;
      if (totalSW > accountedSW) {
        breakdown.other += (totalSW - accountedSW);
      }

      // Add remaining IndexedDB to video cache
      const remainingIDB = totalIDB - breakdown.videoCache;
      if (remainingIDB > 0) {
        breakdown.videoCache += remainingIDB;
      }

    } catch (error) {
      console.warn('Failed to calculate cache breakdown:', error);
      // Fallback estimates
      breakdown.videoCache = Math.floor(totalIDB * 0.8);
      breakdown.profileImages = Math.floor(totalSW * 0.3);
      breakdown.appResources = Math.floor(totalSW * 0.4);
      breakdown.other = totalSW - breakdown.profileImages - breakdown.appResources;
    }

    return breakdown;
  }, []);

  // Main calculation function
  const calculateCacheSizes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [swSize, idbSize, lsSize] = await Promise.all([
        calculateServiceWorkerCacheSize(),
        calculateIndexedDBSize(),
        calculateLocalStorageSize(),
      ]);

      const total = swSize + idbSize + lsSize;
      
      setSizes({
        serviceWorker: swSize,
        indexedDB: idbSize,
        localStorage: lsSize,
        total,
      });

      const categoryBreakdown = await calculateBreakdown(swSize, idbSize);
      setBreakdown(categoryBreakdown);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate cache sizes');
    } finally {
      setIsLoading(false);
    }
  }, [calculateServiceWorkerCacheSize, calculateIndexedDBSize, calculateLocalStorageSize, calculateBreakdown]);

  // Calculate on mount and provide refresh function
  useEffect(() => {
    calculateCacheSizes();
  }, [calculateCacheSizes]);

  // Format size helper
  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${Math.round(bytes / Math.pow(k, i) * 10) / 10} ${sizes[i]}`;
  }, []);

  return {
    sizes,
    breakdown,
    isLoading,
    error,
    refresh: calculateCacheSizes,
    formatSize,
  };
}
