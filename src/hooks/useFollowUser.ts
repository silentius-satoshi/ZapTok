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

      // Get current following list with relay hints and petnames
      let currentContacts: Array<{pubkey: string, relay: string, petname: string}> = [];
      let currentContent = '';
      
      if (currentContactEvents.length > 0) {
        const currentEvent = currentContactEvents[0];
        currentContacts = currentEvent.tags
          .filter(([tagName]) => tagName === 'p')
          .map(([, pubkey, relay, petname]) => ({
            pubkey,
            relay: relay || '',
            petname: petname || ''
          }))
          .filter(contact => contact.pubkey);
        currentContent = currentEvent.content || '';
      }

      // Update the following list
      let newContacts: Array<{pubkey: string, relay: string, petname: string}>;
      if (isCurrentlyFollowing) {
        // Unfollow: remove from list
        newContacts = currentContacts.filter(contact => contact.pubkey !== pubkeyToFollow);
      } else {
        // Follow: add to list (if not already there)
        const alreadyFollowing = currentContacts.some(contact => contact.pubkey === pubkeyToFollow);
        if (alreadyFollowing) {
          newContacts = [...currentContacts];
        } else {
          newContacts = [...currentContacts, { pubkey: pubkeyToFollow, relay: '', petname: '' }];
        }
      }

      // Create new contact list event
      // NIP-02 requires 'p' tags to have format: ['p', pubkey, relay, petname]
      const tags = newContacts.map(contact => ['p', contact.pubkey, contact.relay, contact.petname]);

      await createEvent({
        kind: 3,
        content: currentContent, // Preserve existing content (usually empty or relay list)
        tags: tags,
      });

      return {
        isNowFollowing: !isCurrentlyFollowing,
        newFollowingCount: newContacts.length,
      };
    },
    onSuccess: (data, variables) => {
      if (!user?.pubkey) return;
      
      // Invalidate and refetch following list for the current user
      // This ensures the UI updates immediately to show the new follow status
      queryClient.invalidateQueries({ 
        queryKey: ['following', user.pubkey]
      });
      
      // Force refetch to ensure UI updates immediately
      queryClient.refetchQueries({ 
        queryKey: ['following', user.pubkey]
      });
      
      // Also invalidate all following queries (in case displayed elsewhere)
      queryClient.invalidateQueries({ 
        queryKey: ['following'],
        exact: false
      });
      
      // Also invalidate video feed since it depends on following list
      queryClient.invalidateQueries({ queryKey: ['video-feed'] });
    },
  });
}
