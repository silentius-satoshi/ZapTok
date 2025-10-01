import { createContext, useContext, useEffect, useState } from 'react';
import { useNostr } from '@/hooks/useNostr';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { normalizeUrl, isWebsocketUrl } from '@/lib/relayUtils';
import type { NostrEvent } from '@nostrify/nostrify';

// Custom event kind for favorite relays (following Jumble's pattern)
const FAVORITE_RELAYS_KIND = 30378;

export interface RelaySet {
  id: string;
  name: string;
  relayUrls: string[];
  aTag: string[];
}

interface FavoriteRelaysContextType {
  favoriteRelays: string[];
  relaySets: RelaySet[];
  isLoading: boolean;
  addFavoriteRelays: (relayUrls: string[]) => Promise<void>;
  removeFavoriteRelays: (relayUrls: string[]) => Promise<void>;
  reorderFavoriteRelays: (reorderedRelays: string[]) => Promise<void>;
  createRelaySet: (name: string, relayUrls?: string[]) => Promise<void>;
  updateRelaySet: (relaySet: RelaySet) => Promise<void>;
  deleteRelaySet: (id: string) => Promise<void>;
  reorderRelaySets: (reorderedSets: RelaySet[]) => Promise<void>;
}

const FavoriteRelaysContext = createContext<FavoriteRelaysContextType | undefined>(undefined);

export const useFavoriteRelays = () => {
  const context = useContext(FavoriteRelaysContext);
  if (!context) {
    throw new Error('useFavoriteRelays must be used within a FavoriteRelaysProvider');
  }
  return context;
};

// Default favorite relays (can be customized)
const DEFAULT_FAVORITE_RELAYS = [
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.snort.social'
];

export function FavoriteRelaysProvider({ children }: { children: React.ReactNode }) {
  const { nostr } = useNostr();
  const { mutate: publishEvent } = useNostrPublish();
  const { user } = useCurrentUser();
  
  const [favoriteRelays, setFavoriteRelays] = useState<string[]>(DEFAULT_FAVORITE_RELAYS);
  const [relaySets, setRelaySets] = useState<RelaySet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorite relays from Nostr events when user is available
  useEffect(() => {
    if (user) {
      loadFavoriteRelays();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadFavoriteRelays = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Query for user's favorite relays events
      const events = await nostr.query([{
        kinds: [FAVORITE_RELAYS_KIND],
        authors: [user.pubkey],
        limit: 1
      }], { signal: AbortSignal.timeout(5000) });

      if (events.length > 0) {
        const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
        await parseFavoriteRelaysEvent(latestEvent);
      }
    } catch (error) {
      console.warn('Failed to load favorite relays:', error);
      // Keep defaults on error
    } finally {
      setIsLoading(false);
    }
  };

  const parseFavoriteRelaysEvent = async (event: NostrEvent) => {
    const relays: string[] = [];
    const relaySetIds: string[] = [];

    event.tags.forEach(([tagName, tagValue]) => {
      if (tagName === 'relay' && tagValue) {
        const normalizedUrl = normalizeUrl(tagValue);
        if (normalizedUrl && !relays.includes(normalizedUrl)) {
          relays.push(normalizedUrl);
        }
      } else if (tagName === 'a' && tagValue) {
        // Parse relay set references (kind:pubkey:identifier format)
        const [kind, author, identifier] = tagValue.split(':');
        if (kind === '30002' && identifier && author === user?.pubkey) {
          relaySetIds.push(identifier);
        }
      }
    });

    setFavoriteRelays(relays);
    
    // Load relay sets if we have references
    if (relaySetIds.length > 0) {
      await loadRelaySets(relaySetIds);
    } else {
      setRelaySets([]);
    }
  };

  const loadRelaySets = async (relaySetIds: string[]) => {
    if (!user) return;
    
    try {
      const events = await nostr.query([{
        kinds: [30002], // NIP-51 relay set kind
        authors: [user.pubkey],
        '#d': relaySetIds,
        limit: 50
      }], { signal: AbortSignal.timeout(5000) });

      const sets: RelaySet[] = events.map(event => {
        const id = event.tags.find(([name]) => name === 'd')?.[1] || '';
        const name = event.tags.find(([name]) => name === 'title')?.[1] || `Relay Set ${id.slice(0, 8)}`;
        const relayUrls = event.tags
          .filter(([name]) => name === 'relay')
          .map(([, url]) => normalizeUrl(url))
          .filter((url): url is string => !!url && isWebsocketUrl(url));

        return {
          id,
          name,
          relayUrls,
          aTag: [`30002:${event.pubkey}:${id}`]
        };
      });

      setRelaySets(sets);
    } catch (error) {
      console.warn('Failed to load relay sets:', error);
    }
  };

  const publishFavoriteRelaysEvent = async (relays: string[], sets: RelaySet[]) => {
    if (!user) throw new Error('User must be logged in to save favorites');
    
    const tags: string[][] = [];
    
    // Add relay tags
    relays.forEach(url => {
      tags.push(['relay', url]);
    });
    
    // Add relay set references
    sets.forEach(set => {
      set.aTag.forEach(aTag => {
        tags.push(['a', aTag]);
      });
    });

    publishEvent({
      kind: FAVORITE_RELAYS_KIND,
      content: '',
      tags
    });
  };

  const addFavoriteRelays = async (relayUrls: string[]) => {
    const normalizedUrls = relayUrls
      .map(url => normalizeUrl(url))
      .filter((url): url is string => !!url && isWebsocketUrl(url) && !favoriteRelays.includes(url));

    if (normalizedUrls.length === 0) return;

    const newFavorites = [...favoriteRelays, ...normalizedUrls];
    setFavoriteRelays(newFavorites);
    
    if (user) {
      await publishFavoriteRelaysEvent(newFavorites, relaySets);
    }
  };

  const removeFavoriteRelays = async (relayUrls: string[]) => {
    const normalizedUrls = relayUrls
      .map(url => normalizeUrl(url))
      .filter((url): url is string => !!url);

    const newFavorites = favoriteRelays.filter(url => !normalizedUrls.includes(url));
    setFavoriteRelays(newFavorites);
    
    if (user) {
      await publishFavoriteRelaysEvent(newFavorites, relaySets);
    }
  };

  const reorderFavoriteRelays = async (reorderedRelays: string[]) => {
    setFavoriteRelays(reorderedRelays);
    
    if (user) {
      await publishFavoriteRelaysEvent(reorderedRelays, relaySets);
    }
  };

  const createRelaySet = async (name: string, relayUrls: string[] = []) => {
    if (!user) throw new Error('User must be logged in to create relay sets');
    
    const id = `set-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const normalizedUrls = relayUrls
      .map(url => normalizeUrl(url))
      .filter((url): url is string => !!url && isWebsocketUrl(url));

    // Publish relay set event
    publishEvent({
      kind: 30002,
      content: '',
      tags: [
        ['d', id],
        ['title', name],
        ...normalizedUrls.map(url => ['relay', url])
      ]
    });

    const newSet: RelaySet = {
      id,
      name,
      relayUrls: normalizedUrls,
      aTag: [`30002:${user.pubkey}:${id}`]
    };

    const newSets = [...relaySets, newSet];
    setRelaySets(newSets);
    await publishFavoriteRelaysEvent(favoriteRelays, newSets);
  };

  const updateRelaySet = async (updatedSet: RelaySet) => {
    if (!user) throw new Error('User must be logged in to update relay sets');
    
    // Publish updated relay set event
    publishEvent({
      kind: 30002,
      content: '',
      tags: [
        ['d', updatedSet.id],
        ['title', updatedSet.name],
        ...updatedSet.relayUrls.map(url => ['relay', url])
      ]
    });

    const newSets = relaySets.map(set => 
      set.id === updatedSet.id ? updatedSet : set
    );
    setRelaySets(newSets);
    await publishFavoriteRelaysEvent(favoriteRelays, newSets);
  };

  const deleteRelaySet = async (id: string) => {
    const newSets = relaySets.filter(set => set.id !== id);
    setRelaySets(newSets);
    
    if (user) {
      await publishFavoriteRelaysEvent(favoriteRelays, newSets);
    }
  };

  const reorderRelaySets = async (reorderedSets: RelaySet[]) => {
    setRelaySets(reorderedSets);
    
    if (user) {
      await publishFavoriteRelaysEvent(favoriteRelays, reorderedSets);
    }
  };

  const value: FavoriteRelaysContextType = {
    favoriteRelays,
    relaySets,
    isLoading,
    addFavoriteRelays,
    removeFavoriteRelays,
    reorderFavoriteRelays,
    createRelaySet,
    updateRelaySet,
    deleteRelaySet,
    reorderRelaySets
  };

  return (
    <FavoriteRelaysContext.Provider value={value}>
      {children}
    </FavoriteRelaysContext.Provider>
  );
}