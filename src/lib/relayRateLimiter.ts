/**
 * Relay Rate Limiter and Query Management
 * Prevents overwhelming relays with too many concurrent requests
 */

import { bundleLog } from '@/lib/logBundler';

interface QueuedQuery {
  id: string;
  queryFn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

class RelayRateLimiter {
  private queues = new Map<string, QueuedQuery[]>();
  private processing = new Set<string>();
  private lastQueryTime = new Map<string, number>();
  
  // Rate limiting configuration
  private readonly config = {
    maxConcurrentQueries: 3, // Max concurrent queries per relay
    minQueryInterval: 100,   // Minimum ms between queries to same relay
    queryTimeout: 8000,      // Timeout for individual queries
    batchDelay: 50,          // Delay before processing batched queries
  };

  /**
   * Add query to rate-limited queue
   */
  async queueQuery<T>(
    relayUrl: string, 
    queryFn: () => Promise<T>, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const queryId = `${Date.now()}-${Math.random()}`;
    
    bundleLog('relayRateLimiter', `🚦 Queuing query for ${relayUrl} with priority ${priority} (ID: ${queryId})`);
    
    return new Promise((resolve, reject) => {
      const query: QueuedQuery = {
        id: queryId,
        queryFn,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
      };

      // Add to relay-specific queue
      if (!this.queues.has(relayUrl)) {
        this.queues.set(relayUrl, []);
      }
      
      const queue = this.queues.get(relayUrl)!;
      queue.push(query);
      
      bundleLog('relayRateLimiter', `📊 Queue status for ${relayUrl}: ${queue.length} queries pending`);
      this.processQueue(relayUrl);
    });
  }

  /**
   * Process queries for a specific relay
   */
  private async processQueue(relayUrl: string) {
    if (this.processing.has(relayUrl)) return;
    
    const queue = this.queues.get(relayUrl);
    if (!queue || queue.length === 0) return;

    this.processing.add(relayUrl);

    try {
      // Check rate limiting
      const lastQuery = this.lastQueryTime.get(relayUrl) || 0;
      const timeSinceLastQuery = Date.now() - lastQuery;
      
      if (timeSinceLastQuery < this.config.minQueryInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.config.minQueryInterval - timeSinceLastQuery)
        );
      }

      // Sort by priority (high -> medium -> low) and then by timestamp
      queue.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
      });

      // Process next query
      const query = queue.shift();
      if (!query) return;

      bundleLog('relayRateLimiter', `⚡ Executing query ${query.id} for ${relayUrl} (priority: ${query.priority})`);
      
      this.lastQueryTime.set(relayUrl, Date.now());

      try {
        // Set timeout for query
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), this.config.queryTimeout)
        );

        const result = await Promise.race([
          query.queryFn(),
          timeoutPromise
        ]);

        bundleLog('relayRateLimiter', `✅ Query ${query.id} completed successfully for ${relayUrl}`);
        query.resolve(result);
      } catch (error) {
        query.reject(error);
      }

      // Continue processing queue after small delay
      setTimeout(() => {
        this.processing.delete(relayUrl);
        this.processQueue(relayUrl);
      }, this.config.batchDelay);

    } catch (error) {
      this.processing.delete(relayUrl);
      throw error;
    }
  }

  /**
   * Get queue status for debugging
   */
  getQueueStatus() {
    const status = new Map<string, { queued: number, processing: boolean }>();
    
    for (const [relayUrl, queue] of this.queues) {
      status.set(relayUrl, {
        queued: queue.length,
        processing: this.processing.has(relayUrl),
      });
    }
    
    return status;
  }

  /**
   * Clear all queues (emergency reset)
   */
  clearAllQueues() {
    this.queues.clear();
    this.processing.clear();
    this.lastQueryTime.clear();
  }
}

// Global instance
export const relayRateLimiter = new RelayRateLimiter();

/**
 * Debounced query function that respects relay rate limits
 */
export function createRateLimitedQuery<T>(
  relayUrl: string,
  queryFn: () => Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<T> {
  return relayRateLimiter.queueQuery(relayUrl, queryFn, priority);
}

/**
 * Batch multiple queries together with delay
 */
export async function batchQueries<T>(
  queries: Array<() => Promise<T>>,
  batchSize: number = 3,
  delayBetweenBatches: number = 200
): Promise<T[]> {
  const results: T[] = [];
  
  try {
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(query => query()));
      results.push(...batchResults);
      
      // Delay between batches to avoid overwhelming relays
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  } catch (error) {
    bundleLog('relayRateLimiter', `❌ Batch query failed: ${error.message}`);
    throw error;
  }
}/**
 * Smart query deduplication - avoid duplicate queries
 */
export class QueryDeduplicator {
  private static pendingQueries = new Map<string, Promise<any>>();

  static async dedupe<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
    // If query is already pending, return the existing promise
    if (this.pendingQueries.has(key)) {
      return this.pendingQueries.get(key) as Promise<T>;
    }

    // Start new query
    const queryPromise = queryFn().finally(() => {
      // Clean up after query completes
      this.pendingQueries.delete(key);
    });

    this.pendingQueries.set(key, queryPromise);
    return queryPromise;
  }

  static clearPending() {
    this.pendingQueries.clear();
  }
}