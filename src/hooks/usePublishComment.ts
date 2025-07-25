import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAppContext } from '@/hooks/useAppContext';
import type { NostrEvent } from '@nostrify/nostrify';

interface PublishCommentParams {
  content: string;
  videoEvent: NostrEvent;
  parentComment?: NostrEvent; // If replying to another comment
}

/**
 * Hook to publish NIP-22 comments on video events
 * Supports both top-level comments and replies to other comments
 */
export function usePublishComment() {
  const { mutate: createEvent } = useNostrPublish();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, videoEvent, parentComment }: PublishCommentParams) => {
      const relayHint = config.relayUrls[0] || 'wss://relay.nostr.band';

      // Build NIP-22 compliant tags
      const tags: string[][] = [];

      if (parentComment) {
        // This is a reply to another comment

        // Root scope tags (uppercase) - always point to the original video
        tags.push(['E', videoEvent.id, relayHint, videoEvent.pubkey]);
        tags.push(['K', videoEvent.kind.toString()]);
        tags.push(['P', videoEvent.pubkey, relayHint]);

        // Parent scope tags (lowercase) - point to the comment being replied to
        tags.push(['e', parentComment.id, relayHint, parentComment.pubkey]);
        tags.push(['k', '1111']); // Parent is a comment (kind 1111)
        tags.push(['p', parentComment.pubkey, relayHint]);
      } else {
        // This is a top-level comment on the video

        // Root scope tags (uppercase)
        tags.push(['E', videoEvent.id, relayHint, videoEvent.pubkey]);
        tags.push(['K', videoEvent.kind.toString()]);
        tags.push(['P', videoEvent.pubkey, relayHint]);

        // Parent scope tags (lowercase) - same as root for top-level comments
        tags.push(['e', videoEvent.id, relayHint, videoEvent.pubkey]);
        tags.push(['k', videoEvent.kind.toString()]);
        tags.push(['p', videoEvent.pubkey, relayHint]);
      }

      // Create the NIP-22 comment event
      return new Promise<void>((resolve, reject) => {
        createEvent(
          {
            kind: 1111, // NIP-22 comment kind
            content,
            tags,
          },
          {
            onSuccess: () => {
              // Invalidate comments cache to show the new comment
              queryClient.invalidateQueries({
                queryKey: ['video-comments', videoEvent.id],
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