import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

interface OptimizedVideoData {
  event: NostrEvent | null;
  reactions: NostrEvent[];
  zaps: NostrEvent[];
  reposts: NostrEvent[];
  comments: NostrEvent[];
  // Derived data
  likes: number;
  totalSats: number;
  userReactions: Map<string, NostrEvent>;
}

/**
 * Optimized hook that fetches all video-related data in a single query
 * Combining related queries to reduce relay load and improve performance
 */
export function useOptimizedVideoData(eventId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['optimized-video-data', eventId],
    queryFn: async ({ signal }): Promise<OptimizedVideoData> => {
      if (!eventId) {
        return {
          event: null,
          reactions: [],
          zaps: [],
          reposts: [],
          comments: [],
          likes: 0,
          totalSats: 0,
          userReactions: new Map(),
        };
      }

      const timeoutSignal = AbortSignal.timeout(5000);
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

      // Single optimized query for all video-related data
      // Combines what used to be 3-4 separate queries
      const events = await nostr.query([
        {
          kinds: [1, 7, 6, 16, 9735, 1111], // Notes, reactions, reposts (both types), zaps, comments
          '#e': [eventId],
          limit: 750, // Increased limit for combined query
        },
        // Also get the original event if we don't have it
        {
          ids: [eventId],
          limit: 1,
        }
      ], { signal: combinedSignal });

      // Separate events by type (faster than multiple queries)
      const originalEvent = events.find(e => e.id === eventId) || null;
      const reactions = events.filter(e => e.kind === 7);
      const zaps = events.filter(e => e.kind === 9735);
      const reposts = events.filter(e => e.kind === 6 || e.kind === 16);
      const comments = events.filter(e => e.kind === 1111);

      // Process reactions for user deduplication (keep latest per user)
      const userReactions = new Map<string, NostrEvent>();
      let likes = 0;

      reactions.forEach(event => {
        const existing = userReactions.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          userReactions.set(event.pubkey, event);
        }
      });

      // Count likes (👍 reactions)
      userReactions.forEach(reaction => {
        const content = reaction.content.trim();
        if (content === '+' || content === '👍' || content === '❤️') {
          likes++;
        }
      });

      // Calculate total sats from zaps
      let totalSats = 0;
      zaps.forEach(zapEvent => {
        try {
          const bolt11Tag = zapEvent.tags.find(tag => tag[0] === 'bolt11');
          if (bolt11Tag && bolt11Tag[1]) {
            // Extract amount from bolt11 invoice
            const invoice = bolt11Tag[1];
            const amountMatch = invoice.match(/lnbc(\d+)[munp]/);
            if (amountMatch) {
              const amount = parseInt(amountMatch[1]);
              const unit = invoice.charAt(invoice.indexOf(amountMatch[1]) + amountMatch[1].length);
              let sats = 0;
              
              switch (unit) {
                case 'm': sats = amount * 100000; break; // milli-bitcoin
                case 'u': sats = amount * 100; break;    // micro-bitcoin
                case 'n': sats = amount / 10; break;     // nano-bitcoin
                case 'p': sats = amount / 10000; break;  // pico-bitcoin
                default: sats = amount; break;           // assume sats
              }
              
              totalSats += Math.floor(sats);
            }
          }
        } catch (error) {
          // Skip invalid zap events
          console.warn('Failed to parse zap amount:', error);
        }
      });

      return {
        event: originalEvent,
        reactions,
        zaps,
        reposts,
        comments,
        likes,
        totalSats,
        userReactions,
      };
    },
    enabled: !!eventId,
    // Optimized cache configuration
    staleTime: 2 * 60 * 1000,     // 2 minutes - shorter than individual hooks since data changes frequently
    gcTime: 10 * 60 * 1000,      // 10 minutes
    refetchOnWindowFocus: false,  // Prevent unnecessary refetches
    refetchOnReconnect: true,     // But do refetch when connection is restored
  });
}

/**
 * Derived hook that extracts just the reaction data from optimized query
 * Maintains backward compatibility with existing useVideoReactions
 */
export function useOptimizedVideoReactions(eventId: string) {
  const { data, ...rest } = useOptimizedVideoData(eventId);
  
  return {
    ...rest,
    data: data ? {
      likes: data.likes,
      zaps: data.zaps.length,
      userReactions: data.userReactions,
      totalSats: data.totalSats,
    } : undefined,
  };
}

/**
 * Derived hook that extracts just the comments from optimized query
 * Maintains backward compatibility with existing useVideoComments
 */
export function useOptimizedVideoComments(eventId: string) {
  const { data, ...rest } = useOptimizedVideoData(eventId);
  
  return {
    ...rest,
    data: data ? {
      comments: data.comments,
      totalComments: data.comments.length,
    } : undefined,
  };
}