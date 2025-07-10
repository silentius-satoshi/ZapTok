import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoReactions {
  likes: number;
  zaps: number;
  userReactions: Map<string, NostrEvent>;
  totalSats: number;
}

export function useVideoReactions(videoId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['reactions', videoId],
    queryFn: async (): Promise<VideoReactions> => {
      if (!videoId) {
        return { likes: 0, zaps: 0, userReactions: new Map(), totalSats: 0 };
      }

      const signal = AbortSignal.timeout(3000);
      
      // Query for reactions and zaps
      const events = await nostr.query([
        {
          kinds: [7, 9735], // Reactions and zaps
          '#e': [videoId],
          limit: 500,
        }
      ], { signal });

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
    staleTime: 30 * 1000, // 30 seconds for reactions
    // Enable background updates for live reaction counts
    refetchInterval: 60 * 1000, // 1 minute
    enabled: !!videoId,
  });
}
