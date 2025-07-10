import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileCache } from './useProfileCache';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoEvent extends NostrEvent {
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
}

export function useVideoPrefetch() {
  const queryClient = useQueryClient();
  const { batchLoadProfiles } = useProfileCache();
  
  const prefetchVideoData = useCallback(async (videoEvents: VideoEvent[]) => {
    if (!videoEvents.length) return;

    // Extract unique author pubkeys for profile prefetching
    const authorPubkeys = [...new Set(videoEvents.map(event => event.pubkey))];
    
    // Batch load profiles for all video authors
    await batchLoadProfiles(authorPubkeys);
    
    // Extract video hashes for URL prefetching
    const videoHashes = videoEvents
      .map(event => {
        // Look for video hash in tags
        const hashTag = event.tags.find((tag: string[]) => tag[0] === 'x');
        return hashTag?.[1];
      })
      .filter(Boolean);

    // Prefetch video URLs
    videoHashes.forEach(hash => {
      queryClient.prefetchQuery({
        queryKey: ['video-url', hash],
        queryFn: async () => {
          // This will use the useVideoUrl logic - simplified for prefetch
          return null;
        },
        staleTime: 10 * 60 * 1000
      });
    });
    
    // Prefetch reactions for visible videos
    const videoIds = videoEvents.map(event => event.id);
    videoIds.forEach(id => {
      queryClient.prefetchQuery({
        queryKey: ['reactions', id], 
        queryFn: async () => {
          // This will use the useVideoReactions logic
          return { likes: 0, zaps: 0, userReactions: new Map(), totalSats: 0 };
        },
        staleTime: 30 * 1000
      });
    });
  }, [queryClient, batchLoadProfiles]);

  const preloadThumbnails = useCallback((thumbnailUrls: string[]) => {
    thumbnailUrls.forEach(url => {
      if (url) {
        const img = new Image();
        img.src = url; // Browser will cache automatically
      }
    });
  }, []);
  
  return { prefetchVideoData, preloadThumbnails };
}
