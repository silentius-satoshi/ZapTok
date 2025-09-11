import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { validateVideoEvent, hasVideoContent } from '@/lib/validateVideoEvent';
import type { VideoEvent } from '@/lib/validateVideoEvent';

/**
 * Hook to fetch video events (kind 1 notes with video content) created by a specific user.
 * Only fetches data when the user is authenticated.
 */
export function useUserVideos(pubkey?: string): UseQueryResult<VideoEvent[], Error> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  if (import.meta.env.DEV) {
    console.log('useUserVideos: pubkey =', pubkey, 'user authenticated =', !!user);
  }

  return useQuery({
    queryKey: ['user-videos', pubkey],
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        if (import.meta.env.DEV) {
          console.log('useUserVideos: No pubkey provided');
        }
        return [];
      }

      if (!user) {
        if (import.meta.env.DEV) {
          console.log('useUserVideos: User not authenticated, skipping video fetch');
        }
        return [];
      }

      if (import.meta.env.DEV) {
        console.log('useUserVideos: Fetching videos for pubkey:', pubkey);
      }

      const timeout = AbortSignal.timeout(5000);
      const combinedSignal = AbortSignal.any([signal, timeout]);

      try {
        const events = await nostr.query(
          [
            {
              kinds: [1, 21, 22], // Include NIP-71 video events (21, 22) along with text notes (1)
              authors: [pubkey],
              limit: 50,
            },
          ],
          { signal: combinedSignal }
        );

        if (import.meta.env.DEV) {
          console.log('useUserVideos: Received', events.length, 'events for pubkey:', pubkey);
        }

        // Filter events to only include those with video content
        const videoEvents = events
          .map((event) => {
            const validatedEvent = validateVideoEvent(event);
            const hasVideo = hasVideoContent(event);

            if (import.meta.env.DEV && (validatedEvent || hasVideo)) {
              console.log('useUserVideos: Event', event.id, 'validatedEvent:', validatedEvent, 'hasVideo:', hasVideo);
            }

            return validatedEvent && hasVideo ? validatedEvent : null;
          })
          .filter((event): event is VideoEvent => event !== null);

        if (import.meta.env.DEV) {
          console.log('useUserVideos: Filtered to', videoEvents.length, 'video events');
        }

        return videoEvents;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('useUserVideos: Error fetching videos:', error);
        }
        throw error;
      }
    },
    enabled: !!pubkey && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
