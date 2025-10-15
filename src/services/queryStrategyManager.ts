/**
 * Query Strategy Manager
 * Smart relay selection and load balancing with health awareness
 */

import { relayHealthMonitor, type RelayHealthMetrics } from './relayHealthMonitor';
import { connectionPoolManager } from './connectionPoolManager';

export interface QueryStrategy {
  readonly name: string;
  readonly description: string;
  selectRelays(availableRelays: string[], queryType: QueryType, options?: QueryOptions): string[];
}

export type QueryType = 
  | 'profile' 
  | 'events' 
  | 'reactions' 
  | 'broadcast' 
  | 'search' 
  | 'real-time'
  | 'author-events'
  | 'video-metadata';

export interface QueryOptions {
  /** Required number of relays */
  relayCount?: number;
  /** Prefer relays with good performance for this query type */
  preferPerformant?: boolean;
  /** Include backup relays for fallback */
  includeBackups?: boolean;
  /** Exclude specific relays */
  excludeRelays?: string[];
  /** Minimum health score required */
  minHealthScore?: number;
  /** Geographic preference */
  geographicRegion?: 'us' | 'eu' | 'asia' | 'global';
}

interface RelaySpecialization {
  [relay: string]: {
    strengths: QueryType[];
    region: string;
    reliability: number;
  };
}

/**
 * Health-aware query strategy
 */
class HealthAwareStrategy implements QueryStrategy {
  readonly name = 'health-aware';
  readonly description = 'Select relays based on health metrics and performance';

  selectRelays(
    availableRelays: string[], 
    queryType: QueryType, 
    options: QueryOptions = {}
  ): string[] {
    const {
      relayCount = 3,
      preferPerformant = true,
      includeBackups = true,
      excludeRelays = [],
      minHealthScore = 0.5,
    } = options;

    // Filter out excluded relays
    const candidateRelays = availableRelays.filter(url => !excludeRelays.includes(url));

    // Get health metrics for all relays
    const relayMetrics = candidateRelays
      .map(url => ({
        url,
        metrics: relayHealthMonitor.getMetrics(url),
      }))
      .filter(({ metrics }) => metrics && metrics.healthScore >= minHealthScore);

    if (relayMetrics.length === 0) {
      // Fallback to first available relay if no healthy relays
      return candidateRelays.slice(0, 1);
    }

    // Sort by health score and performance
    const sortedRelays = relayMetrics.sort((a, b) => {
      const aMetrics = a.metrics!;
      const bMetrics = b.metrics!;

      if (preferPerformant) {
        // Weight latency higher for performance-sensitive queries
        const aScore = aMetrics.healthScore - (aMetrics.latency / 10000);
        const bScore = bMetrics.healthScore - (bMetrics.latency / 10000);
        return bScore - aScore;
      }

      return bMetrics.healthScore - aMetrics.healthScore;
    });

    // Select primary relays
    const primaryCount = Math.min(relayCount, sortedRelays.length);
    const primaryRelays = sortedRelays.slice(0, primaryCount).map(r => r.url);

    // Add backup relays if requested
    if (includeBackups && primaryRelays.length < availableRelays.length) {
      const backupCandidates = sortedRelays
        .slice(primaryCount)
        .filter(r => r.metrics!.healthScore >= 0.3) // Lower threshold for backups
        .slice(0, Math.min(2, relayCount)); // Max 2 backups

      return [...primaryRelays, ...backupCandidates.map(r => r.url)];
    }

    return primaryRelays;
  }
}

/**
 * Load balancing strategy
 */
class LoadBalancingStrategy implements QueryStrategy {
  readonly name = 'load-balancing';
  readonly description = 'Distribute queries across healthy relays to balance load';

  selectRelays(
    availableRelays: string[], 
    queryType: QueryType, 
    options: QueryOptions = {}
  ): string[] {
    const { relayCount = 2, excludeRelays = [] } = options;

    // Filter available relays
    const candidateRelays = availableRelays.filter(url => !excludeRelays.includes(url));

    // Get connection stats to balance load
    const poolStats = connectionPoolManager.getStats();

    // Sort by lowest current connection count
    const sortedByLoad = candidateRelays
      .map(url => ({
        url,
        connections: poolStats.connectionsByRelay[url] || 0,
        metrics: relayHealthMonitor.getMetrics(url),
      }))
      .filter(r => r.metrics?.isHealthy !== false) // Allow unknown health
      .sort((a, b) => {
        // Primary sort by connection count (load balancing)
        const loadDiff = a.connections - b.connections;
        if (loadDiff !== 0) return loadDiff;

        // Secondary sort by health score
        const aHealth = a.metrics?.healthScore || 0.5;
        const bHealth = b.metrics?.healthScore || 0.5;
        return bHealth - aHealth;
      });

    return sortedByLoad.slice(0, relayCount).map(r => r.url);
  }
}

/**
 * Specialized strategy based on query type
 */
class SpecializedStrategy implements QueryStrategy {
  readonly name = 'specialized';
  readonly description = 'Select relays optimized for specific query types';

  private readonly relaySpecializations: RelaySpecialization = {
    'wss://relay.nostr.band': {
      strengths: ['search', 'profile', 'events'],
      region: 'global',
      reliability: 0.9,
    },
    'wss://nos.lol': {
      strengths: ['real-time', 'broadcast', 'events'],
      region: 'us',
      reliability: 0.85,
    },
    'wss://relay.damus.io': {
      strengths: ['broadcast', 'real-time', 'profile'],
      region: 'us',
      reliability: 0.9,
    },
    'wss://relay.primal.net': {
      strengths: ['search', 'events', 'author-events'],
      region: 'global',
      reliability: 0.88,
    },
  };

  selectRelays(
    availableRelays: string[], 
    queryType: QueryType, 
    options: QueryOptions = {}
  ): string[] {
    const { 
      relayCount = 3, 
      excludeRelays = [], 
      geographicRegion = 'global' 
    } = options;

    // Filter available relays
    const candidateRelays = availableRelays.filter(url => !excludeRelays.includes(url));

    // Score relays based on specialization
    const scoredRelays = candidateRelays
      .map(url => {
        const specialization = this.relaySpecializations[url];
        const metrics = relayHealthMonitor.getMetrics(url);
        
        let score = metrics?.healthScore || 0.5;

        // Boost score for specialized relays
        if (specialization) {
          if (specialization.strengths.includes(queryType)) {
            score += 0.3;
          }
          
          // Geographic preference
          if (geographicRegion === 'global' || specialization.region === geographicRegion) {
            score += 0.1;
          }

          // Reliability bonus
          score += specialization.reliability * 0.2;
        }

        return { url, score, metrics };
      })
      .filter(r => r.metrics?.isHealthy !== false)
      .sort((a, b) => b.score - a.score);

    return scoredRelays.slice(0, relayCount).map(r => r.url);
  }
}

/**
 * Fallback strategy for when all else fails
 */
class FallbackStrategy implements QueryStrategy {
  readonly name = 'fallback';
  readonly description = 'Simple fallback when other strategies fail';

  selectRelays(availableRelays: string[], queryType: QueryType, options: QueryOptions = {}): string[] {
    const { relayCount = 1, excludeRelays = [] } = options;
    
    // Just return first available relays
    return availableRelays
      .filter(url => !excludeRelays.includes(url))
      .slice(0, relayCount);
  }
}

/**
 * Query Strategy Manager
 * Manages relay selection strategies with health awareness
 */
export class QueryStrategyManager {
  private readonly strategies = new Map<string, QueryStrategy>();
  private defaultStrategy = 'health-aware';

  constructor() {
    // Register built-in strategies
    this.registerStrategy(new HealthAwareStrategy());
    this.registerStrategy(new LoadBalancingStrategy());
    this.registerStrategy(new SpecializedStrategy());
    this.registerStrategy(new FallbackStrategy());
  }

  /**
   * Register a new query strategy
   */
  registerStrategy(strategy: QueryStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Set the default strategy
   */
  setDefaultStrategy(strategyName: string): void {
    if (!this.strategies.has(strategyName)) {
      throw new Error(`Strategy not found: ${strategyName}`);
    }
    this.defaultStrategy = strategyName;
  }

  /**
   * Select optimal relays for a query
   */
  selectRelays(
    availableRelays: string[],
    queryType: QueryType,
    options: QueryOptions & { strategy?: string } = {}
  ): string[] {
    const { strategy: strategyName = this.defaultStrategy, ...queryOptions } = options;

    // Get strategy
    const strategy = this.strategies.get(strategyName) || this.strategies.get('fallback')!;

    try {
      const selectedRelays = strategy.selectRelays(availableRelays, queryType, queryOptions);
      
      // Ensure we have at least one relay
      if (selectedRelays.length === 0 && availableRelays.length > 0) {
        return [availableRelays[0]];
      }

      return selectedRelays;
    } catch (error) {
      console.warn(`Strategy ${strategyName} failed, using fallback:`, error);
      
      // Use fallback strategy
      const fallback = this.strategies.get('fallback')!;
      return fallback.selectRelays(availableRelays, queryType, queryOptions);
    }
  }

  /**
   * Get optimal relay for broadcast operations
   */
  selectBroadcastRelays(availableRelays: string[], options: QueryOptions = {}): string[] {
    return this.selectRelays(availableRelays, 'broadcast', {
      ...options,
      preferPerformant: true,
      relayCount: Math.min(5, availableRelays.length), // Broadcast to more relays
    });
  }

  /**
   * Get optimal relay for real-time subscriptions
   */
  selectRealTimeRelays(availableRelays: string[], options: QueryOptions = {}): string[] {
    return this.selectRelays(availableRelays, 'real-time', {
      ...options,
      preferPerformant: true,
      relayCount: 2, // Fewer relays for real-time to reduce noise
      strategy: 'specialized',
    });
  }

  /**
   * Get available strategies
   */
  getAvailableStrategies(): QueryStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategy by name
   */
  getStrategy(name: string): QueryStrategy | undefined {
    return this.strategies.get(name);
  }
}

// Create singleton instance
export const queryStrategyManager = new QueryStrategyManager();