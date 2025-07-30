// NIP-87 mint recommendation publishing hook
// Allows users to publish and manage their mint recommendations

import { useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import type { DiscoveredMint } from './useNIP87MintDiscovery';

interface PublishRecommendationParams {
  mint: DiscoveredMint;
  review?: string;
  recommendedUrls?: string[]; // Additional connection URLs to recommend
}

interface UseNIP87RecommendationsResult {
  // Actions
  publishRecommendation: (params: PublishRecommendationParams) => Promise<void>;
  removeRecommendation: (mint: DiscoveredMint) => Promise<void>;
  
  // State
  isPublishing: boolean;
}

export function useNIP87Recommendations(): UseNIP87RecommendationsResult {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { toast } = useToast();

  const publishRecommendation = useCallback(async ({
    mint,
    review = '',
    recommendedUrls = []
  }: PublishRecommendationParams) => {
    if (!user) {
      throw new Error('User must be logged in to publish recommendations');
    }

    try {
      const tags: string[][] = [
        ['k', mint.type === 'cashu' ? '38172' : '38173'],
        ['d', mint.pubkey],
      ];

      // Add recommended connection URLs
      const urlsToRecommend = recommendedUrls.length > 0 ? recommendedUrls : [mint.url];
      urlsToRecommend.forEach(url => {
        tags.push(['u', url, mint.type]);
      });

      // Add reference to the original mint announcement event
      const eventCoordinate = `${mint.type === 'cashu' ? '38172' : '38173'}:${mint.operator}:${mint.pubkey}`;
      tags.push(['a', eventCoordinate]);

      await publishEvent({
        kind: 38000,
        content: review,
        tags
      });

      toast({
        title: 'Recommendation published',
        description: `Your recommendation for ${mint.name || mint.url} has been published to the network.`
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to publish recommendation';
      toast({
        title: 'Failed to publish recommendation',
        description: errorMsg,
        variant: 'destructive'
      });
      throw err;
    }
  }, [user, publishEvent, toast]);

  const removeRecommendation = useCallback(async (mint: DiscoveredMint) => {
    if (!user) {
      throw new Error('User must be logged in to remove recommendations');
    }

    try {
      // Publish a deletion event by publishing an empty recommendation
      // NIP-87 uses parameterized replaceable events, so publishing with empty content effectively removes it
      await publishEvent({
        kind: 38000,
        content: '',
        tags: [
          ['k', mint.type === 'cashu' ? '38172' : '38173'],
          ['d', mint.pubkey],
        ]
      });

      toast({
        title: 'Recommendation removed',
        description: `Your recommendation for ${mint.name || mint.url} has been removed.`
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove recommendation';
      toast({
        title: 'Failed to remove recommendation',
        description: errorMsg,
        variant: 'destructive'
      });
      throw err;
    }
  }, [user, publishEvent, toast]);

  return {
    publishRecommendation,
    removeRecommendation,
    isPublishing
  };
}
