/**
 * Query optimization utilities for improved Nostr performance
 * Enhanced with connection-aware optimizations and smart relay selection
 */

import type { NostrEvent } from '@nostrify/nostrify';
import { queryStrategyManager, type QueryType, type QueryOptions } from '@/services/queryStrategyManager';
import { relayHealthMonitor } from '@/services/relayHealthMonitor';
import { connectionPoolManager } from '@/services/connectionPoolManager';

export interface OptimizedFilter {
  kinds?: number[];
  authors?: string[];
  ids?: string[];
  since?: number;
  until?: number;
  limit?: number;
  search?: string;
  [key: `#${string}`]: string[] | undefined;
}

/**
 * Combines multiple filter objects into a single optimized query
 * Reduces query count for better performance
 */
export function combineFilters(filters: OptimizedFilter[]): OptimizedFilter[] {
  if (filters.length <= 1) return filters;

  const combined: OptimizedFilter[] = [];
  
  // Group filters by similar structure
  const groups = new Map<string, OptimizedFilter[]>();
  
  filters.forEach(filter => {
    // Create a key based on non-array properties
    const key = JSON.stringify({
      since: filter.since,
      until: filter.until,
      search: filter.search,
      // Include tag keys but not values
      tags: Object.keys(filter).filter(k => k.startsWith('#')).sort(),
    });
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(filter);
  });

  // Combine filters within each group
  groups.forEach(group => {
    if (group.length === 1) {
      combined.push(group[0]);
      return;
    }

    // Merge compatible filters
    const merged: OptimizedFilter = {
      ...group[0],
      kinds: [...new Set(group.flatMap(f => f.kinds || []))],
      authors: [...new Set(group.flatMap(f => f.authors || []))],
      ids: [...new Set(group.flatMap(f => f.ids || []))],
      limit: Math.max(...group.map(f => f.limit || 50)),
    };

    // Merge tag filters
    group.forEach(filter => {
      Object.keys(filter).forEach(key => {
        if (key.startsWith('#') && filter[key]) {
          if (!merged[key]) merged[key] = [];
          merged[key] = [...new Set([...(merged[key] || []), ...filter[key]!])];
        }
      });
    });

    combined.push(merged);
  });

  return combined;
}

/**
 * Creates an optimized AbortSignal with progressive timeout handling
 * Uses proven timeout patterns for better data retrieval
 */
export function createOptimizedSignal(
  signal: AbortSignal, 
  timeoutMs: number = 5000,
  type: 'metadata' | 'events' | 'reactions' | 'notifications' = 'events'
): AbortSignal {
  // Adjust timeout based on query type
  const adjustedTimeout = (() => {
    switch (type) {
      case 'metadata': return Math.max(timeoutMs, 3000); // Metadata needs time
      case 'reactions': return Math.min(timeoutMs, 5000); // Reactions should be fast
      case 'notifications': return Math.max(timeoutMs, 8000); // Notifications can be slower
      default: return timeoutMs;
    }
  })();

  const timeoutSignal = AbortSignal.timeout(adjustedTimeout);
  return AbortSignal.any([signal, timeoutSignal]);
}

/**
 * Processes large event sets in chunks to prevent blocking
 * Optimized pattern for handling large data sets efficiently
 */
export function processEventsInChunks<T>(
  events: NostrEvent[],
  processor: (event: NostrEvent) => T,
  chunkSize: number = 50
): Promise<T[]> {
  return new Promise((resolve) => {
    const results: T[] = [];
    let index = 0;

    function processChunk() {
      const endIndex = Math.min(index + chunkSize, events.length);
      
      for (let i = index; i < endIndex; i++) {
        results.push(processor(events[i]));
      }
      
      index = endIndex;
      
      if (index >= events.length) {
        resolve(results);
      } else {
        // Use requestIdleCallback if available, otherwise setTimeout
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(processChunk);
        } else {
          setTimeout(processChunk, 0);
        }
      }
    }

    processChunk();
  });
}

/**
 * Event deduplication and validation utilities
 */
export function deduplicateEvents(events: NostrEvent[]): NostrEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

export function validateEvent(event: NostrEvent): boolean {
  return !!(
    event.id &&
    event.pubkey &&
    event.created_at &&
    typeof event.kind === 'number' &&
    Array.isArray(event.tags) &&
    typeof event.content === 'string'
  );
}

export function validateAndDeduplicate(events: NostrEvent[]): NostrEvent[] {
  return deduplicateEvents(events.filter(validateEvent));
}

/**
 * Cache configuration presets for different data types
 * Optimized patterns for various use cases
 */
export const CACHE_CONFIGS = {
  // Immutable data - can be cached for a long time
  EVENTS: {
    staleTime: 30 * 60 * 1000,    // 30 minutes
    gcTime: 2 * 60 * 60 * 1000,  // 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
  
  // User metadata - changes infrequently
  METADATA: {
    staleTime: 10 * 60 * 1000,    // 10 minutes
    gcTime: 60 * 60 * 1000,      // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
  
  // Social interactions - change frequently
  REACTIONS: {
    staleTime: 2 * 60 * 1000,     // 2 minutes
    gcTime: 10 * 60 * 1000,      // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  
  // Notifications - need to be fresh
  NOTIFICATIONS: {
    staleTime: 2 * 60 * 1000,     // 2 minutes
    gcTime: 15 * 60 * 1000,      // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
  
  // Dynamic content - balance freshness with performance
  FEEDS: {
    staleTime: 1 * 60 * 1000,     // 1 minute
    gcTime: 5 * 60 * 1000,       // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
} as const;

/**
 * Connection-aware query optimization
 */
export interface ConnectionAwareQueryOptions {
  /** Available relay URLs */
  availableRelays: string[];
  /** Query type for strategy selection */
  queryType: QueryType;
  /** Base timeout in milliseconds */
  baseTimeout: number;
  /** Strategy options */
  strategyOptions?: QueryOptions;
}

/**
 * Get optimal relays for a query with health awareness
 */
export function getOptimalRelays(
  options: ConnectionAwareQueryOptions
): string[] {
  const { availableRelays, queryType, strategyOptions = {} } = options;
  
  if (availableRelays.length === 0) {
    console.warn('No available relays provided for query optimization');
    return [];
  }

  // Use query strategy manager to select optimal relays
  return queryStrategyManager.selectRelays(
    availableRelays,
    queryType,
    strategyOptions
  );
}

/**
 * Create connection-aware signal with adaptive timeout
 */
export function createConnectionAwareSignal(
  options: ConnectionAwareQueryOptions,
  parentSignal?: AbortSignal
): AbortSignal {
  const { availableRelays, baseTimeout } = options;
  
  // Get optimal relays first
  const optimalRelays = getOptimalRelays(options);
  
  if (optimalRelays.length === 0) {
    // No healthy relays - use base timeout
    const fallbackSignal = parentSignal || AbortSignal.timeout(baseTimeout);
    return createOptimizedSignal(fallbackSignal, baseTimeout);
  }

  // Calculate adaptive timeout based on relay health
  let adaptiveTimeout = baseTimeout;
  
  // Get average latency from healthy relays
  const healthyLatencies = optimalRelays
    .map(url => relayHealthMonitor.getMetrics(url)?.latency)
    .filter((latency): latency is number => typeof latency === 'number' && latency > 0);

  if (healthyLatencies.length > 0) {
    const avgLatency = healthyLatencies.reduce((sum, lat) => sum + lat, 0) / healthyLatencies.length;
    
    // Adaptive timeout: base + (average latency * 2) + buffer
    adaptiveTimeout = Math.min(
      baseTimeout * 2, // Cap at 2x base timeout
      Math.max(
        baseTimeout * 0.5, // Minimum 50% of base timeout
        avgLatency * 2 + 1000 // 2x latency + 1s buffer
      )
    );
  }

  const adaptiveSignal = parentSignal || AbortSignal.timeout(adaptiveTimeout);
  return createOptimizedSignal(adaptiveSignal, adaptiveTimeout);
}

/**
 * Execute query with connection pool optimization
 */
export async function executeOptimizedQuery<T>(
  queryFn: (relayUrl: string) => Promise<T>,
  options: ConnectionAwareQueryOptions
): Promise<T> {
  const optimalRelays = getOptimalRelays(options);
  
  if (optimalRelays.length === 0) {
    throw new Error('No healthy relays available for query');
  }

  const errors: Error[] = [];

  // Try relays in order of preference
  for (const relayUrl of optimalRelays) {
    try {
      // Track query start
      const startTime = Date.now();
      
      // Execute query
      const result = await queryFn(relayUrl);
      
      // Track success
      const latency = Date.now() - startTime;
      relayHealthMonitor.onSuccess(relayUrl, latency);
      
      return result;
    } catch (error) {
      // Track failure
      relayHealthMonitor.onFailure(
        relayUrl, 
        error instanceof Error ? error.message : 'Query failed'
      );
      
      errors.push(error instanceof Error ? error : new Error('Unknown error'));
      
      // Continue to next relay
      continue;
    }
  }

  // All relays failed
  throw new Error(
    `Query failed on all available relays: ${errors.map(e => e.message).join(', ')}`
  );
}

/**
 * Get connection pool statistics for debugging
 */
export function getConnectionStats() {
  return {
    pool: connectionPoolManager.getStats(),
    health: {
      healthy: relayHealthMonitor.getHealthyRelays().length,
      unhealthy: relayHealthMonitor.getUnhealthyRelays().length,
      total: relayHealthMonitor.getAllMetrics().size,
    },
  };
}

/**
 * Query key utilities for consistent caching
 */
export function createQueryKey(
  type: string, 
  identifier: string | string[], 
  ...params: (string | number | boolean)[]
): (string | number | boolean)[] {
  const baseKey: (string | number | boolean)[] = [type];
  
  if (Array.isArray(identifier)) {
    baseKey.push(identifier.sort().join(','));
  } else {
    baseKey.push(identifier);
  }
  
  if (params.length > 0) {
    baseKey.push(...params);
  }
  
  return baseKey;
}