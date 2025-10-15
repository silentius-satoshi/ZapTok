import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import DataLoader from 'dataloader';
import type { Event as NostrEvent } from 'nostr-tools';
import { simplePool, getSimplePoolRelays } from '@/lib/simplePool';
import { useAppContext } from '@/hooks/useAppContext';
import {
  createEventDataLoader,
  createProfileDataLoader,
  createRelayListDataLoader,
  createContactListDataLoader,
} from '@/lib/nostrDataLoader';

interface DataLoaderContextValue {
  eventLoader: DataLoader<string, NostrEvent | null>;
  profileLoader: DataLoader<string, NostrEvent | null>;
  relayListLoader: DataLoader<string, string[]>;
  contactListLoader: DataLoader<string, string[]>;
}

const DataLoaderContext = createContext<DataLoaderContextValue | null>(null);

interface DataLoaderProviderProps {
  children: ReactNode;
}

/**
 * Provider for DataLoader instances
 * Creates per-render DataLoader instances for optimal batching
 */
export function DataLoaderProvider({ children }: DataLoaderProviderProps) {
  const { config } = useAppContext();

  // Create DataLoader instances per render
  // This ensures each render cycle has its own cache and batching context
  const loaders = useMemo(() => {
    // Get all configured relays
    const allRelays = config.relayUrls.length > 0 
      ? config.relayUrls 
      : ['wss://relay.damus.io', 'wss://nos.lol'];
    
    // Get SimplePool relays (excluding Cashu relay)
    const relays = getSimplePoolRelays(allRelays);

    return {
      eventLoader: createEventDataLoader(simplePool, relays, {
        batchScheduleFn: (callback) => setTimeout(callback, 50),
        cache: true,
        maxBatchSize: 100,
      }),
      profileLoader: createProfileDataLoader(simplePool, relays, {
        batchScheduleFn: (callback) => setTimeout(callback, 50),
        cache: true,
        maxBatchSize: 50,
      }),
      relayListLoader: createRelayListDataLoader(simplePool, relays, {
        batchScheduleFn: (callback) => setTimeout(callback, 50),
        cache: true,
        maxBatchSize: 50,
      }),
      contactListLoader: createContactListDataLoader(simplePool, relays, {
        batchScheduleFn: (callback) => setTimeout(callback, 50),
        cache: true,
        maxBatchSize: 50,
      }),
    };
  }, [config.relayUrls]);

  return (
    <DataLoaderContext.Provider value={loaders}>
      {children}
    </DataLoaderContext.Provider>
  );
}

/**
 * Hook to access DataLoader instances
 */
export function useDataLoaders(): DataLoaderContextValue {
  const context = useContext(DataLoaderContext);
  if (!context) {
    throw new Error('useDataLoaders must be used within DataLoaderProvider');
  }
  return context;
}
