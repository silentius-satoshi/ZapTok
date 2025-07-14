import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';

export function useFollowUser() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pubkeyToFollow, isCurrentlyFollowing }: { pubkeyToFollow: string; isCurrentlyFollowing: boolean }) => {
      if (!user?.pubkey) {
        throw new Error('Must be logged in to follow users');
      }

      // Get current contact list
      const signal = AbortSignal.timeout(3000);
      const currentContactEvents = await nostr.query([
        {
          kinds: [3],
          authors: [user.pubkey],
          limit: 1,
        }
      ], { signal });

      // Get current following list
      let currentFollowing: string[] = [];
      let currentContent = '';
      
      if (currentContactEvents.length > 0) {
        const currentEvent = currentContactEvents[0];
        currentFollowing = currentEvent.tags
          .filter(([tagName]) => tagName === 'p')
          .map(([, pubkey]) => pubkey)
          .filter(Boolean);
        currentContent = currentEvent.content || '';
      }

      // Update the following list
      let newFollowing: string[];
      if (isCurrentlyFollowing) {
        // Unfollow: remove from list
        newFollowing = currentFollowing.filter(pk => pk !== pubkeyToFollow);
      } else {
        // Follow: add to list (if not already there)
        newFollowing = currentFollowing.includes(pubkeyToFollow) 
          ? currentFollowing 
          : [...currentFollowing, pubkeyToFollow];
      }

      // Create new contact list event
      const tags = newFollowing.map(pubkey => ['p', pubkey]);

      await createEvent({
        kind: 3,
        content: currentContent, // Preserve existing content (usually empty or relay list)
        tags: tags,
      });

      return {
        isNowFollowing: !isCurrentlyFollowing,
        newFollowingCount: newFollowing.length,
      };
    },
    onSuccess: () => {
      // Invalidate and refetch following list queries
      queryClient.invalidateQueries({ queryKey: ['following'] });
      // Also invalidate video feed since it depends on following list
      queryClient.invalidateQueries({ queryKey: ['video-feed'] });
    },
  });
}
