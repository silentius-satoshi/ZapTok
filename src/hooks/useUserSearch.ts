import { useMemo } from 'react';
import { useAuthor } from '@/hooks/useAuthor';
import { nip19 } from 'nostr-tools';

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

  // Only search if term is at least 3 characters to avoid too many queries
  const shouldSearch = enabled && safeSearchTerm.length >= 3;

  // Parse the search term to get pubkey if it's a valid identifier
  const targetPubkey = shouldSearch ? parseNostrIdentifier(safeSearchTerm) : null;

  // Use useAuthor hook for direct user lookup when we have a pubkey
  // Pass empty string when we don't want to query (React Query will handle this)
  const author = useAuthor(targetPubkey || '');

  // Transform author data to match expected interface
  const data = useMemo((): UserSearchResult[] => {
    if (!shouldSearch || !targetPubkey) {
      return [];
    }

    if (author.data) {
      console.log('🔍 Found user via direct lookup:', author.data.metadata?.name || author.data.metadata?.display_name || 'Unknown');
      return [{
        pubkey: targetPubkey,
        metadata: author.data.metadata,
        followedBy: [], // We don't have follower data from direct lookup
      }];
    }

    return [];
  }, [shouldSearch, targetPubkey, author.data]);

  return {
    data,
    isLoading: shouldSearch && !!targetPubkey && author.isLoading,
    isError: author.isError,
    error: author.error,
  };
}
