import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { validateVideoEvent } from '@/lib/validateVideoEvent';
import type { VideoEvent } from '@/lib/validateVideoEvent';

/**
 * Hook to fetch video events that a specific user has liked (reacted to with kind 7 "+").
 * Only fetches data when the user is authenticated.
 */
export function useLikedVideos(pubkey?: string): UseQueryResult<VideoEvent[], Error> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  if (import.meta.env.DEV) {
    console.log('useLikedVideos: pubkey =', pubkey, 'user authenticated =', !!user);
  }

  return useQuery({
    queryKey: ['liked-videos', pubkey],
    queryFn: async (c) => {
      if (!pubkey) {
        if (import.meta.env.DEV) {
          console.log('useLikedVideos: No pubkey provided');
        }
        return [];
      }

      if (!user) {
        if (import.meta.env.DEV) {
          console.log('useLikedVideos: User not authenticated, skipping liked videos fetch');
        }
        return [];
      }

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      
    if (import.meta.env.DEV) {
      console.log('❤️ Fetching liked videos for pubkey:', pubkey);
    }
      
      // First, get all reaction events (kind 7) by this user where they liked something
      const reactionEvents = await nostr.query([
        {
          kinds: [7], // Reaction events
          authors: [pubkey],
          limit: 200, // Get more reactions to find video likes
        }
      ], { signal });

    if (import.meta.env.DEV) {
      console.log('❤️ Found reaction events:', reactionEvents.length);
    }

      // Filter for positive reactions (likes)
      const likeEvents = reactionEvents.filter(reaction => {
        const content = reaction.content.trim();
        return content === '+' || content === '❤️' || content === '👍' || content === '🤙';
      });

    if (import.meta.env.DEV) {
      console.log('❤️ Filtered like events:', likeEvents.length);
    }

      // Extract the event IDs that were liked
      const likedEventIds = likeEvents
        .map(reaction => reaction.tags.find(tag => tag[0] === 'e')?.[1])
        .filter((id): id is string => Boolean(id));

    if (import.meta.env.DEV) {
      console.log('❤️ Liked event IDs:', likedEventIds.length);
    }

      if (likedEventIds.length === 0) {
        return [];
      }

      // Fetch the actual events that were liked
      const likedEvents = await nostr.query([
        {
          ids: likedEventIds,
        }
      ], { signal });

    if (import.meta.env.DEV) {
      console.log('❤️ Found liked events:', likedEvents.length);
    }

      // Validate and filter for video events
      const likedVideoEvents: VideoEvent[] = [];
      
      for (const event of likedEvents) {
        const videoEvent = validateVideoEvent(event);
        if (videoEvent && videoEvent.videoUrl) {
          likedVideoEvents.push(videoEvent);
        }
      }

    if (import.meta.env.DEV) {
      console.log('❤️ Valid liked video events:', likedVideoEvents.length);
    }

      // Sort by the like time (when the user liked it)
      // We need to match the liked events back to their reaction times
      const sortedVideoEvents = likedVideoEvents.map(video => {
        const likeEvent = likeEvents.find(like => 
          like.tags.find(tag => tag[0] === 'e' && tag[1] === video.id)
        );
        return {
          ...video,
          likedAt: likeEvent?.created_at || video.created_at
        };
      }).sort((a, b) => (b.likedAt || 0) - (a.likedAt || 0));

      return sortedVideoEvents;
    },
    enabled: !!pubkey && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
