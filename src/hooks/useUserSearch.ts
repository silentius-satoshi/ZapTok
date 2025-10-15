import { useMemo, useState, useEffect } from 'react';
import { useAuthor } from '@/hooks/useAuthor';
import { nip19 } from 'nostr-tools';
import client from '@/services/client.service';
import type { AuthorProfile } from '@/services/client.service';

interface UserSearchResult {
  pubkey: string;
  metadata?: {
    name?: string;
    display_name?: string;
    about?: string;
    picture?: string;
    nip05?: string;
  };
  followedBy: string[]; // Keep original interface for compatibility
}

// Helper function to detect and decode Nostr identifiers
function parseNostrIdentifier(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  // Check if it's an npub
  if (trimmed.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type === 'npub') {
        return decoded.data as string;
      }
    } catch (error) {
      console.error('Failed to decode npub:', error);
      return null;
    }
  }

  // Check if it's a hex pubkey (64 characters, all hex)
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function useUserSearch(searchTerm: string = '', enabled: boolean = true) {
  // Ensure searchTerm is always a string
  const safeSearchTerm = searchTerm || '';
  const [localResults, setLocalResults] = useState<UserSearchResult[]>([]);
  const [isSearchingLocal, setIsSearchingLocal] = useState(false);

  // Only search if term is at least 3 characters to avoid too many queries
  const shouldSearch = enabled && safeSearchTerm.length >= 3;

  // Parse the search term to get pubkey if it's a valid identifier
  const targetPubkey = shouldSearch ? parseNostrIdentifier(safeSearchTerm) : null;

  // Use useAuthor hook for direct user lookup when we have a pubkey
  // Pass empty string when we don't want to query (React Query will handle this)
  const author = useAuthor(targetPubkey || '');

  // NEW: Search local FlexSearch index when searching by name (not pubkey)
  useEffect(() => {
    async function searchLocal() {
      // Only search locally if:
      // 1. We should search
      // 2. It's NOT a pubkey format (we use network for exact pubkeys)
      // 3. Search term is at least 2 characters
      if (!shouldSearch || targetPubkey || safeSearchTerm.length < 2) {
        setLocalResults([]);
        return;
      }

      setIsSearchingLocal(true);
      try {
        console.log('🔍 Searching local FlexSearch index for:', safeSearchTerm);
        const profiles = await client.searchProfilesFromLocal(safeSearchTerm, 20);
        
        // Transform to UserSearchResult format
        const results: UserSearchResult[] = profiles.map((profile: AuthorProfile) => ({
          pubkey: profile.pubkey,
          metadata: profile.metadata,
          followedBy: [], // We don't have follower data from local search
        }));
        
        console.log(`✅ Found ${results.length} local results`);
        setLocalResults(results);
      } catch (error) {
        console.error('❌ Local search failed:', error);
        setLocalResults([]);
      } finally {
        setIsSearchingLocal(false);
      }
    }

    searchLocal();
  }, [safeSearchTerm, shouldSearch, targetPubkey]);

  // Transform author data to match expected interface (for pubkey searches)
  const networkData = useMemo((): UserSearchResult[] => {
    if (!shouldSearch || !targetPubkey) {
      return [];
    }

    if (author.data) {
      console.log('🌐 Found user via network lookup:', author.data.metadata?.name || author.data.metadata?.display_name || 'Unknown');
      return [{
        pubkey: targetPubkey,
        metadata: author.data.metadata,
        followedBy: [], // We don't have follower data from direct lookup
      }];
    }

    return [];
  }, [shouldSearch, targetPubkey, author.data]);

  // Combine local and network results
  // Priority: network results (exact pubkey match) > local results (name search)
  const data = targetPubkey ? networkData : localResults;
  const isLoading = targetPubkey 
    ? (shouldSearch && author.isLoading) 
    : isSearchingLocal;

  return {
    data,
    isLoading,
    isError: author.isError,
    error: author.error,
  };
}
