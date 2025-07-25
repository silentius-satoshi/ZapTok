// NIP-87 compliant mint discovery hook
// Implements dynamic discovery of Cashu mints and Fedimints via Nostr events

import { useState, useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

export interface DiscoveredMint {
  // Core identification
  url: string;
  pubkey: string; // mint pubkey for Cashu, federation id for Fedimint
  type: 'cashu' | 'fedimint';
  
  // Metadata
  name?: string;
  description?: string;
  contact?: {
    nostr?: string;
    email?: string;
    website?: string;
  };
  
  // Capabilities
  nuts?: number[]; // Cashu NUTs supported
  modules?: string[]; // Fedimint modules supported
  network?: 'mainnet' | 'testnet' | 'signet' | 'regtest';
  
  // Event metadata
  operator: string; // pubkey of the operator who published the announcement
  lastUpdated: number;
  event: NostrEvent; // the original announcement event
}

export interface MintRecommendation {
  // Core identification
  recommendedMint: DiscoveredMint;
  
  // Recommendation details
  recommender: string; // pubkey of recommender
  review?: string; // content of the recommendation
  lastUpdated: number;
  event: NostrEvent; // the original recommendation event
}

interface UseNIP87MintDiscoveryResult {
  // Discovered mints
  cashuMints: DiscoveredMint[];
  fedimints: DiscoveredMint[];
  allMints: DiscoveredMint[];
  
  // Recommendations
  recommendations: MintRecommendation[];
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshDiscovery: () => Promise<void>;
  validateMint: (mintUrl: string) => Promise<{
    isHealthy: boolean;
    info?: Record<string, unknown>;
    keysets?: Record<string, unknown>[];
    supportedNuts?: number[];
    error?: string;
  }>;
}

export function useNIP87MintDiscovery(): UseNIP87MintDiscoveryResult {
  const { nostr } = useNostr();
  const [error, setError] = useState<string | null>(null);

  // Query for Cashu mint announcements (kind:38172)
  const {
    data: cashuAnnouncements = [],
    isLoading: isLoadingCashu,
    refetch: refetchCashu
  } = useQuery({
    queryKey: ['nip87-cashu-mints'],
    queryFn: async ({ signal }) => {
      const timeoutSignal = AbortSignal.timeout(10000);
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);
      
      try {
        const events = await nostr.query([{
          kinds: [38172],
          limit: 100
        }], { signal: combinedSignal });
        
        return events;
      } catch (err) {
        console.error('Failed to query Cashu mint announcements:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Query for Fedimint announcements (kind:38173)
  const {
    data: fedimintAnnouncements = [],
    isLoading: isLoadingFedimint,
    refetch: refetchFedimint
  } = useQuery({
    queryKey: ['nip87-fedimint-mints'],
    queryFn: async ({ signal }) => {
      const timeoutSignal = AbortSignal.timeout(10000);
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);
      
      try {
        const events = await nostr.query([{
          kinds: [38173],
          limit: 100
        }], { signal: combinedSignal });
        
        return events;
      } catch (err) {
        console.error('Failed to query Fedimint announcements:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Query for mint recommendations (kind:38000)
  const {
    data: recommendationEvents = [],
    isLoading: isLoadingRecommendations,
    refetch: refetchRecommendations
  } = useQuery({
    queryKey: ['nip87-mint-recommendations'],
    queryFn: async ({ signal }) => {
      const timeoutSignal = AbortSignal.timeout(10000);
      const combinedSignal = AbortSignal.any([signal, timeoutSignal]);
      
      try {
        const events = await nostr.query([{
          kinds: [38000],
          '#k': ['38172', '38173'], // Recommendations for Cashu and Fedimint
          limit: 200
        }], { signal: combinedSignal });
        
        return events;
      } catch (err) {
        console.error('Failed to query mint recommendations:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Parse Cashu mint announcements
  const cashuMints: DiscoveredMint[] = cashuAnnouncements
    .map((event): DiscoveredMint | null => {
      try {
        const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
        const uTag = event.tags.find(tag => tag[0] === 'u')?.[1];
        const nutsTag = event.tags.find(tag => tag[0] === 'nuts')?.[1];
        const networkTag = event.tags.find(tag => tag[0] === 'n')?.[1];

        if (!dTag || !uTag) return null;

        // Parse optional metadata from content
        let metadata: Record<string, unknown> = {};
        try {
          if (event.content) {
            metadata = JSON.parse(event.content);
          }
        } catch {
          // Content is not JSON, ignore
        }

        return {
          url: uTag,
          pubkey: dTag,
          type: 'cashu',
          name: typeof metadata.name === 'string' ? metadata.name : undefined,
          description: typeof metadata.description === 'string' ? metadata.description : undefined,
          contact: metadata.contact && typeof metadata.contact === 'object' ? metadata.contact as { nostr?: string; email?: string; website?: string } : undefined,
          nuts: nutsTag ? nutsTag.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) : undefined,
          network: networkTag as 'mainnet' | 'testnet' | 'signet' | 'regtest' | undefined,
          operator: event.pubkey,
          lastUpdated: event.created_at,
          event
        };
      } catch (err) {
        console.warn('Failed to parse Cashu mint announcement:', err);
        return null;
      }
    })
    .filter((mint): mint is DiscoveredMint => mint !== null);

  // Parse Fedimint announcements
  const fedimints: DiscoveredMint[] = fedimintAnnouncements
    .map((event): DiscoveredMint | null => {
      try {
        const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
        const uTags = event.tags.filter(tag => tag[0] === 'u').map(tag => tag[1]);
        const modulesTag = event.tags.find(tag => tag[0] === 'modules')?.[1];
        const networkTag = event.tags.find(tag => tag[0] === 'n')?.[1];

        if (!dTag || uTags.length === 0) return null;

        // Parse optional metadata from content
        let metadata: Record<string, unknown> = {};
        try {
          if (event.content) {
            metadata = JSON.parse(event.content);
          }
        } catch {
          // Content is not JSON, ignore
        }

        return {
          url: uTags[0], // Use first invite code as primary URL
          pubkey: dTag,
          type: 'fedimint',
          name: typeof metadata.name === 'string' ? metadata.name : undefined,
          description: typeof metadata.description === 'string' ? metadata.description : undefined,
          contact: metadata.contact && typeof metadata.contact === 'object' ? metadata.contact as { nostr?: string; email?: string; website?: string } : undefined,
          modules: modulesTag ? modulesTag.split(',').map(m => m.trim()) : undefined,
          network: networkTag as 'mainnet' | 'testnet' | 'signet' | 'regtest' | undefined,
          operator: event.pubkey,
          lastUpdated: event.created_at,
          event
        };
      } catch (err) {
        console.warn('Failed to parse Fedimint announcement:', err);
        return null;
      }
    })
    .filter((mint): mint is DiscoveredMint => mint !== null);

  const allMints = [...cashuMints, ...fedimints];

  // Parse mint recommendations
  const recommendations: MintRecommendation[] = recommendationEvents
    .map((event): MintRecommendation | null => {
      try {
        const kTag = event.tags.find(tag => tag[0] === 'k')?.[1];
        const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];

        if (!kTag || !dTag) return null;

        // Find the corresponding mint from our discovered mints
        const mintKind = parseInt(kTag);
        const targetMints = mintKind === 38172 ? cashuMints : fedimints;
        const recommendedMint = targetMints.find(mint => mint.pubkey === dTag);

        if (!recommendedMint) return null;

        return {
          recommendedMint,
          recommender: event.pubkey,
          review: event.content || undefined,
          lastUpdated: event.created_at,
          event
        };
      } catch (err) {
        console.warn('Failed to parse mint recommendation:', err);
        return null;
      }
    })
    .filter((rec): rec is MintRecommendation => rec !== null);

  const isLoading = isLoadingCashu || isLoadingFedimint || isLoadingRecommendations;

  const refreshDiscovery = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([
        refetchCashu(),
        refetchFedimint(),
        refetchRecommendations()
      ]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refresh mint discovery';
      setError(errorMsg);
      throw err;
    }
  }, [refetchCashu, refetchFedimint, refetchRecommendations]);

  const validateMint = useCallback(async (mintUrl: string) => {
    try {
      // Check mint info endpoint
      const infoResponse = await fetch(`${mintUrl}/v1/info`);
      if (!infoResponse.ok) {
        return { isHealthy: false, error: 'Mint info endpoint unavailable' };
      }
      
      const info = await infoResponse.json();
      
      // Check keysets endpoint  
      const keysetsResponse = await fetch(`${mintUrl}/v1/keysets`);
      if (!keysetsResponse.ok) {
        return { isHealthy: false, error: 'Mint keysets endpoint unavailable' };
      }
      
      const keysets = await keysetsResponse.json();
      
      return {
        isHealthy: true,
        info,
        keysets: keysets.keysets,
        supportedNuts: info.nuts || []
      };
    } catch (error) {
      return { 
        isHealthy: false, 
        error: `Mint validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }, []);

  return {
    cashuMints,
    fedimints,
    allMints,
    recommendations,
    isLoading,
    error,
    refreshDiscovery,
    validateMint
  };
}
