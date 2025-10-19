import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from './useNostrPublish';
import type { NostrEvent } from '@nostrify/nostrify';
import { videoRepostsService } from '@/services/videoReposts.service';

interface RepostParams {
  event: NostrEvent;
}

/**
 * Hook to create reposts of Nostr events
 * Uses kind 6 for text notes (kind 1) and kind 16 for other events like videos (kinds 21, 22)
 */
export function useRepost() {
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ event }: RepostParams) => {
      // Determine repost kind based on original event kind
      const repostKind = event.kind === 1 ? 6 : 16;

      // Build tags according to NIP-18
      const tags = [
        ['e', event.id], // Reference to original event
        ['p', event.pubkey], // Author of original event
      ];

      // For generic reposts (kind 16), include the kind of original event
      if (repostKind === 16) {
        tags.push(['k', event.kind.toString()]);
      }

      // Include the original event JSON in content (as per NIP-18)
      const originalEventJson = JSON.stringify(event);

      return new Promise<void>((resolve, reject) => {
        createEvent(
          {
            kind: repostKind,
            content: originalEventJson,
            tags,
          },
          {
            onSuccess: () => {
              // Invalidate React Query caches
              queryClient.invalidateQueries({
                queryKey: ['user-reposts'],
              });
              queryClient.invalidateQueries({
                queryKey: ['video-reposts', event.id],
              });
              
              // Clear videoRepostsService cache to force refetch
              videoRepostsService.clearCache(event.id);
              
              // Trigger immediate refetch of reposts for this video
              videoRepostsService.getReposts(event.id).catch((error) => {
                console.error('Failed to refetch reposts after repost:', error);
              });
              
              resolve();
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
  });
}
