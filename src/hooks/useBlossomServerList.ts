/*
 * 🚧 NIP-B7 Blossom Server List Hook - DORMANT FOR HYBRID APPROACH
 *
 * This hook implements NIP-B7 protocol for user-published Blossom server lists.
 * Currently disabled in upload flow to ensure reliability.
 *
 * To re-enable:
 * 1. Uncomment import in useUploadFile.ts
 * 2. Replace hardcoded servers with serverList.servers
 * 3. Test thoroughly with your setup
 *
 * Benefits when enabled:
 * - Users can publish their preferred Blossom servers
 * - Decentralized server selection
 * - Better interoperability with other Nostr clients
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from './useCurrentUser';
import { useNostrPublish } from './useNostrPublish';
import { Kind } from '@/constants';
import relayListService from '@/services/relayList.service';

export interface BlossomServerList {
  servers: string[];
  event?: any;
  lastUpdated?: number;
}

/**
 * Hook to manage user's Blossom server list (kind:10063) according to NIP-B7/BUD-03
 *
 * This hook handles:
 * - Publishing user's preferred Blossom servers
 * - Fetching other users' server lists
 * - Managing server priority order
 */
export function useBlossomServerList(pubkey?: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const targetPubkey = pubkey || user?.pubkey;

  // Fetch user's published server list
  const {
    data: serverList,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['blossom-server-list', targetPubkey],
    queryFn: async () => {
      if (!targetPubkey) return null;

      const signal = AbortSignal.timeout(8000);
      
      // Get user's relay list to query their personal relays
      const relayList = await relayListService.getUserRelayList(targetPubkey, nostr);
      const userRelays = [...new Set([...relayList.read, ...relayList.write])];
      
      // Query both user's personal relays AND default pool
      // This ensures we find the server list wherever it's published
      const relayGroup = userRelays.length > 0 ? nostr.group(userRelays) : nostr;
      
      const events = await relayGroup.query([
        {
          kinds: [Kind.Blossom], // 10063
          authors: [targetPubkey],
          limit: 1
        }
      ], { signal });

      if (events.length === 0) return null;

      // Get the most recent event
      const event = events.sort((a, b) => b.created_at - a.created_at)[0];

      // Extract server URLs from tags
      const servers = event.tags
        .filter(([tagName]) => tagName === 'server')
        .map(([, serverUrl]) => serverUrl)
        .filter(Boolean);

      return {
        servers,
        event,
        lastUpdated: event.created_at * 1000
      } as BlossomServerList;
    },
    enabled: !!targetPubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Publish user's server list
  const publishServerList = useMutation({
    mutationFn: async (servers: string[]) => {
      if (!user) {
        throw new Error('Must be logged in to publish server list');
      }

      if (servers.length === 0) {
        throw new Error('At least one server must be provided');
      }

      // Validate server URLs
      const validServers = servers.filter(server => {
        try {
          new URL(server);
          return true;
        } catch {
          return false;
        }
      });

      if (validServers.length === 0) {
        throw new Error('No valid server URLs provided');
      }

      // Create kind:10063 event according to BUD-03
      const serverTags = validServers.map(server => ['server', server]);

      publishEvent({
        kind: Kind.Blossom, // 10063
        content: '', // BUD-03 specifies content should be empty
        tags: serverTags
      });

      return validServers;
    },
    onSuccess: (servers) => {
      // Update the query cache immediately
      queryClient.setQueryData(['blossom-server-list', user?.pubkey], {
        servers,
        lastUpdated: Date.now()
      });

      // Refetch to get the actual published event
      setTimeout(() => refetch(), 1000);
    }
  });

  // Update server priority (move server to front of list)
  const prioritizeServer = useMutation({
    mutationFn: async (serverUrl: string) => {
      if (!serverList?.servers) {
        throw new Error('No server list available');
      }

      const currentServers = serverList.servers.filter(s => s !== serverUrl);
      const updatedServers = [serverUrl, ...currentServers];

      return publishServerList.mutateAsync(updatedServers);
    }
  });

  // Add a new server to the list
  const addServer = useMutation({
    mutationFn: async (serverUrl: string) => {
      const currentServers = serverList?.servers || [];

      // Don't add duplicates
      if (currentServers.includes(serverUrl)) {
        return currentServers;
      }

      const updatedServers = [...currentServers, serverUrl];
      return publishServerList.mutateAsync(updatedServers);
    }
  });

  // Remove a server from the list
  const removeServer = useMutation({
    mutationFn: async (serverUrl: string) => {
      if (!serverList?.servers) {
        throw new Error('No server list available');
      }

      const updatedServers = serverList.servers.filter(s => s !== serverUrl);

      if (updatedServers.length === 0) {
        throw new Error('Cannot remove last server');
      }

      return publishServerList.mutateAsync(updatedServers);
    }
  });

  return {
    // Query data
    serverList,
    isLoading,
    error,
    refetch,

    // Mutations
    publishServerList,
    prioritizeServer,
    addServer,
    removeServer,

    // Computed values
    servers: serverList?.servers || [],
    primaryServer: serverList?.servers?.[0],
    mirrorServers: serverList?.servers?.slice(1) || [],
    hasServerList: !!serverList?.servers?.length,
    lastUpdated: serverList?.lastUpdated
  };
}

/**
 * Extract SHA256 hash from a URL according to BUD-03 specification
 * "When extracting the SHA256 hash from the URL clients MUST use the last
 * occurrence of a 64 char hex string"
 */
export function extractSha256FromUrl(url: string): string | null {
  try {
    // Match all 64-character hex strings in the URL
    const hexMatches = url.match(/[a-fA-F0-9]{64}/g);

    if (!hexMatches || hexMatches.length === 0) {
      return null;
    }

    // Return the last occurrence as specified in BUD-03
    return hexMatches[hexMatches.length - 1].toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Verify that downloaded blob matches expected SHA256
 */
export async function verifyBlobHash(blob: Blob, expectedHash: string): Promise<boolean> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return computedHash.toLowerCase() === expectedHash.toLowerCase();
  } catch {
    return false;
  }
}