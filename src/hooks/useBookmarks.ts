import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';

export function useBookmarks(pubkey?: string, enabled: boolean = true) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const targetPubkey = pubkey || user?.pubkey || '';

  return useQuery({
    queryKey: ['bookmarks', targetPubkey],
    queryFn: async (c) => {
      if (!targetPubkey) return { bookmarks: [], event: null };

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query for the user's bookmark list using NIP-51 standard kind 10003
      const events = await nostr.query([
        {
          kinds: [10003], // Updated to standard bookmarks list (was deprecated 30001)
          authors: [targetPubkey],
          limit: 1,
        }
      ], { signal });

      if (events.length === 0) {
        return { bookmarks: [], event: null };
      }

      // Get the most recent bookmark list event
      const bookmarkEvent = events[0];
      
      // Extract event IDs from 'e' tags
      const bookmarkedEventIds = bookmarkEvent.tags
        .filter(([tagName]) => tagName === 'e')
        .map(([, eventId]) => eventId)
        .filter(Boolean);

      return {
        bookmarks: bookmarkedEventIds,
        event: bookmarkEvent,
      };
    },
    enabled: !!targetPubkey && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useBookmarkVideo() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();
  const bookmarks = useBookmarks(user?.pubkey);

  return useMutation({
    mutationFn: async ({ eventId, isCurrentlyBookmarked }: { eventId: string; isCurrentlyBookmarked: boolean }) => {
      if (!user?.pubkey) {
        throw new Error('Must be logged in to bookmark videos');
      }

      // Get current bookmark list
      const currentBookmarks = bookmarks.data?.bookmarks || [];
      
      // Update the bookmark list
      let newBookmarks: string[];
      if (isCurrentlyBookmarked) {
        // Remove bookmark: filter out the event ID
        newBookmarks = currentBookmarks.filter(id => id !== eventId);
      } else {
        // Add bookmark: add event ID if not already there
        newBookmarks = currentBookmarks.includes(eventId) 
          ? currentBookmarks 
          : [...currentBookmarks, eventId];
      }

      // Create bookmark list event (NIP-51 standard)
      const tags = [
        // No 'd' tag needed for kind 10003 - it's a standard list, not a set
        ...newBookmarks.map(id => ['e', id]), // event references
      ];

    if (import.meta.env.DEV) {
      console.log('🔖 Publishing bookmark update:', {
        action: isCurrentlyBookmarked ? 'REMOVE' : 'ADD',
        eventId,
        newBookmarkCount: newBookmarks.length,
        tags,
      });
    }

      await createEvent({
        kind: 10003, // Updated to NIP-51 standard bookmarks list (was deprecated 30001)
        content: '', // Content is typically empty for bookmark lists
        tags: tags,
      });

      if (import.meta.env.DEV) {
      console.log('🔖 Bookmark event published successfully');
      }

      return {
        isNowBookmarked: !isCurrentlyBookmarked,
        newBookmarkCount: newBookmarks.length,
      };
    },
    onSuccess: () => {
      // Invalidate and refetch bookmark queries
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}
