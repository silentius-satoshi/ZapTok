import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { validateVideoEvent, hasVideoContent } from '@/lib/validateVideoEvent';
import type { VideoEvent } from '@/lib/validateVideoEvent';

export function useUserVideos(pubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['user-videos', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);
      
      console.log('🎥 Fetching videos for pubkey:', pubkey);
      
      // Query for various event types that might contain videos
      // Cast to broader search to catch videos from different clients
      const allEvents = await nostr.query([
        {
          kinds: [1, 1063, 30023, 34235], // Text notes, file metadata, long-form, video events
          authors: [pubkey],
          limit: 200, // Increase limit to catch more potential video events
        }
      ], { signal });

      console.log('🎥 Found total events:', allEvents.length);

      // Pre-filter events that might contain video content for efficiency
      const potentialVideoEvents = allEvents.filter(hasVideoContent);
      console.log('🎥 Potential video events after pre-filter:', potentialVideoEvents.length);

      // Validate and filter video events
      const videoEvents: VideoEvent[] = [];
      
      for (const event of potentialVideoEvents) {
        const videoEvent = validateVideoEvent(event);
        if (videoEvent && videoEvent.videoUrl) {
          videoEvents.push(videoEvent);
        }
      }

      console.log('🎥 Valid video events:', videoEvents.length);

      // Remove duplicates based on video URL
      const uniqueVideoEvents = videoEvents.filter((video, index, array) => {
        return index === array.findIndex(v => 
          v.videoUrl === video.videoUrl || 
          (v.hash && video.hash && v.hash === video.hash)
        );
      });

      console.log('🎥 Unique video events:', uniqueVideoEvents.length);

      // Sort by creation time (newest first)
      return uniqueVideoEvents.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!pubkey,
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 3, // Retry failed requests
  });
}
