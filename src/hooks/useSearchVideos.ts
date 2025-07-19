import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@/hooks/useNostr';
import { validateVideoEvent } from '@/lib/validateVideoEvent';

export function useSearchVideos(searchQuery: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['search-videos', searchQuery],
    queryFn: async (context) => {
      // Don't search if query is empty
      if (!searchQuery.trim()) {
        return [];
      }

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Query with NIP-50 search filter
        const events = await nostr.query([
          {
            kinds: [21, 22], // NIP-71 video events
            search: searchQuery,
            limit: 50,
          }
        ], { signal });

        // Filter and validate video events
        const validEvents = events.filter(validateVideoEvent);
        
        // Sort by created_at (most recent first) since NIP-50 should sort by relevance
        // but we want to ensure some temporal ordering as well
        return validEvents.sort((a, b) => b.created_at - a.created_at);
        
      } catch (error) {
        // Check if error is related to NIP-50 not being supported
        if (error instanceof Error) {
          if (error.message.includes('search') || error.message.includes('filter')) {
            throw new Error('Your relay does not support NIP-50 search functionality. Try switching to a different relay or use hashtag searches instead.');
          }
        }
        throw error;
      }
    },
    enabled: !!searchQuery.trim(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's a NIP-50 support issue
      if (error instanceof Error && error.message.includes('relay does not support')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useSearchVideosInFollowing(searchQuery: string, followingPubkeys: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['search-videos-following', searchQuery, followingPubkeys],
    queryFn: async (context) => {
      // Don't search if query is empty or no following list
      if (!searchQuery.trim() || !followingPubkeys.length) {
        return [];
      }

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Query with NIP-50 search filter + authors filter for following list
        const events = await nostr.query([
          {
            kinds: [21, 22], // NIP-71 video events
            search: searchQuery,
            authors: followingPubkeys, // Only search within following list
            limit: 50,
          }
        ], { signal });

        // Filter and validate video events
        const validEvents = events.filter(validateVideoEvent);
        
        // Sort by created_at (most recent first) since NIP-50 should sort by relevance
        // but we want to ensure some temporal ordering as well
        return validEvents.sort((a, b) => b.created_at - a.created_at);
        
      } catch (error) {
        // Check if error is related to NIP-50 not being supported
        if (error instanceof Error) {
          if (error.message.includes('search') || error.message.includes('filter')) {
            throw new Error('Your relay does not support NIP-50 search functionality. Try switching to a different relay or use hashtag searches instead.');
          }
        }
        throw error;
      }
    },
    enabled: !!searchQuery.trim() && followingPubkeys.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's a NIP-50 support issue
      if (error instanceof Error && error.message.includes('relay does not support')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useSearchNotes(searchQuery: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['search-notes', searchQuery],
    queryFn: async (context) => {
      if (!searchQuery.trim()) {
        return [];
      }

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);
      
      try {
        const events = await nostr.query([
          {
            kinds: [1], // Text notes
            search: searchQuery,
            limit: 50,
          }
        ], { signal });

        return events.sort((a, b) => b.created_at - a.created_at);
        
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('search') || error.message.includes('filter')) {
            throw new Error('Your relay does not support NIP-50 search functionality.');
          }
        }
        throw error;
      }
    },
    enabled: !!searchQuery.trim(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('relay does not support')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useSearchAll(searchQuery: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['search-all', searchQuery],
    queryFn: async (context) => {
      if (!searchQuery.trim()) {
        return { videos: [], notes: [] };
      }

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);
      
      try {
        // Search across multiple event kinds
        const events = await nostr.query([
          {
            kinds: [1, 21, 22], // Text notes and video events
            search: searchQuery,
            limit: 100,
          }
        ], { signal });

        // Separate into categories
        const videos = events.filter(e => [21, 22].includes(e.kind) && validateVideoEvent(e));
        const notes = events.filter(e => e.kind === 1);

        return {
          videos: videos.sort((a, b) => b.created_at - a.created_at),
          notes: notes.sort((a, b) => b.created_at - a.created_at),
        };
        
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('search') || error.message.includes('filter')) {
            throw new Error('Your relay does not support NIP-50 search functionality.');
          }
        }
        throw error;
      }
    },
    enabled: !!searchQuery.trim(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('relay does not support')) {
        return false;
      }
      return failureCount < 2;
    },
  });
}
