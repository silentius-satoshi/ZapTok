import { useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import relayListService from '@/services/relayList.service';

// Define filter type locally based on common Nostr filter structure
interface Filter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: string]: any;
}

export interface NostrQueryOptions {
  signal?: AbortSignal;
  scope?: 'read' | 'write';
  relays?: string[];
  timeout?: number;
}

/**
 * Hook for scope-aware Nostr queries that respect NIP-65 relay lists
 */
export function useNostrQuery() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  /**
   * Execute a query with proper relay scope awareness
   */
  const query = useCallback(async (
    filters: Filter[],
    options: NostrQueryOptions = {}
  ) => {
    const { scope = 'read', relays, timeout = 5000, ...otherOptions } = options;

    // If specific relays are provided, use them
    if (relays && relays.length > 0) {
      return await nostr.query(filters, {
        ...otherOptions,
        signal: options.signal || AbortSignal.timeout(timeout)
      });
    }

    // For authenticated users, use their NIP-65 relay list
    if (user) {
      try {
        const userRelayList = await relayListService.getUserRelayList(user.pubkey, nostr);
        const targetRelays = scope === 'write' ? userRelayList.write : userRelayList.read;

        return await nostr.query(filters, {
          ...otherOptions,
          signal: options.signal || AbortSignal.timeout(timeout)
        });
      } catch (error) {
        console.warn('Failed to use user relay list, falling back to default:', error);
      }
    }

    // Fallback to default query
    return await nostr.query(filters, {
      ...otherOptions,
      signal: options.signal || AbortSignal.timeout(timeout)
    });
  }, [nostr, user]);

  /**
   * Query someone else's content from their write relays
   */
  const queryAuthor = useCallback(async (
    authorPubkey: string,
    filters: Filter[],
    options: Omit<NostrQueryOptions, 'scope'> = {}
  ) => {
    try {
      // Get author's relay list to find their content
      const authorRelayList = await relayListService.getUserRelayList(authorPubkey, nostr);
      
      return await query(filters, {
        ...options,
        scope: 'write', // Query their write relays where they publish
        relays: authorRelayList.write
      });
    } catch (error) {
      console.warn('Failed to query author relays, using default:', error);
      return await query(filters, options);
    }
  }, [query, nostr]);

  /**
   * Query your own content from your write relays
   */
  const queryOwnContent = useCallback(async (
    filters: Filter[],
    options: Omit<NostrQueryOptions, 'scope'> = {}
  ) => {
    if (!user) {
      throw new Error('User must be logged in to query own content');
    }

    return await query(filters, {
      ...options,
      scope: 'write' // Use write relays to find own content
    });
  }, [query, user]);

  /**
   * Query for content discovery (general feed, search, etc.)
   */
  const queryDiscovery = useCallback(async (
    filters: Filter[],
    options: Omit<NostrQueryOptions, 'scope'> = {}
  ) => {
    return await query(filters, {
      ...options,
      scope: 'read' // Use read relays for content discovery
    });
  }, [query]);

  return {
    query,
    queryAuthor,
    queryOwnContent,
    queryDiscovery
  };
}