import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { validateVideoEvent } from '@/lib/validateVideoEvent';
import type { VideoEvent } from '@/lib/validateVideoEvent';

export function useBookmarkedVideos(pubkey?: string) {
  const { nostr } = useNostr();
  const bookmarks = useBookmarks(pubkey);

  return useQuery({
    queryKey: ['bookmarked-videos', pubkey, bookmarks.data?.bookmarks],
    queryFn: async (c) => {
      const bookmarkedEventIds = bookmarks.data?.bookmarks || [];
      
      if (bookmarkedEventIds.length === 0) {
        return [];
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      // Fetch the actual bookmarked events
      const events = await nostr.query([
        {
          ids: bookmarkedEventIds,
        }
      ], { signal });

      // Validate and filter video events
      const videoEvents: VideoEvent[] = [];
      
      for (const event of events) {
        const videoEvent = validateVideoEvent(event);
        if (videoEvent && videoEvent.videoUrl) {
          videoEvents.push(videoEvent);
        }
      }

      // Sort by bookmark order (most recently bookmarked first)
      // The bookmark list order determines the display order
      return videoEvents.sort((a, b) => {
        const aIndex = bookmarkedEventIds.indexOf(a.id);
        const bIndex = bookmarkedEventIds.indexOf(b.id);
        return aIndex - bIndex;
      });
    },
    enabled: !!bookmarks.data?.bookmarks && bookmarks.data.bookmarks.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
