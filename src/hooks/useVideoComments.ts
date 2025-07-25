import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoCommentsData {
  comments: NostrEvent[];
  commentCount: number;
}

/**
 * Hook to fetch comments for a video event
 * Comments are NIP-22 kind 1111 events that reference the video event
 */
export function useVideoComments(eventId: string) {
  const { nostr } = useNostr();

  return useQuery<VideoCommentsData>({
    queryKey: ['video-comments', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Query for NIP-22 comments (kind 1111) that reference this video event
      // Comments use uppercase 'E' tag for root scope and lowercase 'e' tag for parent
      const events = await nostr.query([
        {
          kinds: [1111], // NIP-22 comment kind
          '#e': [eventId], // Comments referencing this video event
          limit: 100,
        }
      ], { signal });

      // Filter to ensure these are valid comments according to NIP-22
      const validComments = events.filter((event) => {
        // Comments must have proper NIP-22 tag structure
        const hasParentE = event.tags.some(([name]) => name === 'e');
        const hasParentK = event.tags.some(([name]) => name === 'k');
        const hasParentP = event.tags.some(([name]) => name === 'p');
        
        return hasParentE && hasParentK && hasParentP;
      });

      // Sort comments by creation time (newest first)
      const sortedComments = validComments.sort((a, b) => b.created_at - a.created_at);

      return {
        comments: sortedComments,
        commentCount: sortedComments.length,
      };
    },
    enabled: !!eventId,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}