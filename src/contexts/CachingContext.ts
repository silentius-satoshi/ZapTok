import { createContext, useContext } from 'react';
import type { NostrFilter } from '@nostrify/nostrify';

export interface CachingService {
  url: string;
  name: string;
  isConnected: boolean;
  lastConnected?: Date;
}

export interface CachingContextType {
  /** Current caching service */
  currentService: CachingService | null;
  /** Available caching services */
  availableServices: CachingService[];
  /** Connect to a caching service */
  connectToCachingService: (url: string) => Promise<boolean>;
  /** Disconnect from current caching service */
  disconnectCachingService: () => void;
  /** Check if caching service is available for queries */
  isCachingAvailable: () => boolean;
  /** Query data through caching service if available, fallback to relays */
  queryWithCaching: (filters: NostrFilter[], options?: object) => Promise<object[]>;
}

export const CachingContext = createContext<CachingContextType | undefined>(undefined);

export function useCaching() {
  const context = useContext(CachingContext);
  if (context === undefined) {
    throw new Error('useCaching must be used within a CachingProvider');
  }
  return context;
}
