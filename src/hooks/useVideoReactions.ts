import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNostrConnectionState } from '@/components/NostrProvider';
import { createConnectionAwareSignal } from '@/lib/queryOptimization';
import { relayRateLimiter, QueryDeduplicator } from '@/lib/relayRateLimiter';

interface VideoReactions {
  likes: number;
  zaps: number;
  userReactions: Map<string, NostrEvent>;
  totalSats: number;
}

export function useVideoReactions(videoId: string) {
  const { nostr } = useNostr();
  const { getOptimalRelaysForQuery, activeRelays } = useNostrConnectionState();

  return useQuery({
    queryKey: ['reactions', videoId],
    queryFn: async ({ signal }): Promise<VideoReactions> => {
      if (!videoId) {
        return { likes: 0, zaps: 0, userReactions: new Map(), totalSats: 0 };
      }

      // Phase 2: Use connection-aware signal with rate limiting
      const connectionAwareSignal = createConnectionAwareSignal({
        availableRelays: getOptimalRelaysForQuery('reactions', 5),
        queryType: 'reactions',
        baseTimeout: 5000,
      }, signal);
      
      // Rate-limited query with deduplication
      const queryKey = `reactions-${videoId}`;
      const events = await QueryDeduplicator.dedupe(queryKey, async () => {
        return await relayRateLimiter.queueQuery(
          'video-reactions',
          async () => {
            const filter = {
              kinds: [7, 9735], // Reactions and zaps  
              '#e': [videoId],
              limit: 500,
            };
            
            return await nostr.query([filter], { signal: connectionAwareSignal });
          },
          'medium' // Medium priority for reactions
        );
      });

      // Deduplicate by user (keep latest reaction per user)
      const userReactions = new Map<string, NostrEvent>();
      const zapEvents: NostrEvent[] = [];
      
      events.forEach(event => {
        if (event.kind === 7) {
          // Reaction event
          const existing = userReactions.get(event.pubkey);
          if (!existing || event.created_at > existing.created_at) {
            userReactions.set(event.pubkey, event);
          }
        } else if (event.kind === 9735) {
          // Zap event
          zapEvents.push(event);
        }
      });
      
      // Calculate reaction totals
      let likes = 0;
      userReactions.forEach(reaction => {
        const content = reaction.content.trim();
        if (content === '+' || content === '❤️' || content === '👍' || content === '🤙') {
          likes++;
        }
      });

      // Calculate zap totals
      let totalSats = 0;
      zapEvents.forEach(zapEvent => {
        // Extract sats amount from zap tags
        const bolt11Tag = zapEvent.tags.find(tag => tag[0] === 'bolt11');
        if (bolt11Tag && bolt11Tag[1]) {
          try {
            // Simple regex to extract amount from bolt11
            const amountMatch = bolt11Tag[1].match(/lnbc(\d+)/);
            if (amountMatch) {
              const millisats = parseInt(amountMatch[1]);
              totalSats += Math.floor(millisats / 1000);
            }
          } catch (error) {
            console.warn('Failed to parse zap amount:', error);
          }
        }
      });
      
      return { 
        likes, 
        zaps: zapEvents.length, 
        userReactions, 
        totalSats 
      };
    },
    enabled: !!videoId,
    // Optimized cache configuration for video reactions
    staleTime: 2 * 60 * 1000,     // 2 minutes - reactions don't change super frequently
    gcTime: 10 * 60 * 1000,      // 10 minutes garbage collection
    refetchOnWindowFocus: false,  // Prevent unnecessary refetches on focus
    refetchOnReconnect: true,     // But do refetch when connection restored
    // Remove refetchInterval to reduce relay load - use manual invalidation instead
  });
}
