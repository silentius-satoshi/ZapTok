import DataLoader from 'dataloader';
import indexedDBService from './indexedDB.service';

export interface TRelayInfo {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: {
    max_message_length?: number;
    max_subscriptions?: number;
    max_filters?: number;
    max_limit?: number;
    max_subid_length?: number;
    max_event_tags?: number;
    max_content_length?: number;
    min_pow_difficulty?: number;
    auth_required?: boolean;
    payment_required?: boolean;
    restricted_writes?: boolean;
    created_at_lower_limit?: number;
    created_at_upper_limit?: number;
  };
  relay_countries?: string[];
  language_tags?: string[];
  tags?: string[];
  posting_policy?: string;
  payments_url?: string;
  fees?: {
    admission?: Array<{ amount: number; unit: string }>;
    subscription?: Array<{ amount: number; unit: string; period: number }>;
    publication?: Array<{ kinds: number[]; amount: number; unit: string }>;
  };
  icon?: string;
}

export interface RelayInfoWithMetrics extends TRelayInfo {
  url: string;
  // Performance metrics
  responseTime?: number;
  lastChecked?: number;
  isReachable?: boolean;
  errorCount?: number;
  successRate?: number;
  // Quality scoring
  qualityScore?: number;
  reliabilityScore?: number;
}

/**
 * RelayInfoService - Manages relay information with NIP-11 fetching and caching
 * Enterprise-grade relay information service with performance monitoring
 */
class RelayInfoService {
  private cache = new Map<string, RelayInfoWithMetrics>();
  private cacheExpiry = new Map<string, number>();
  private failureCache = new Map<string, { count: number; lastFailure: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly FAILURE_BACKOFF = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CONCURRENT = 5;

  // DataLoader for batched relay info fetching
  private relayInfoDataLoader = new DataLoader<string, RelayInfoWithMetrics | Error>(
    async (urls: readonly string[]) => {
      return this.batchFetchRelayInfo([...urls]);
    },
    {
      maxBatchSize: this.MAX_CONCURRENT,
      batchScheduleFn: callback => setTimeout(callback, 50) // Small delay for batching
    }
  );

  /**
   * Fetch relay information for multiple URLs using DataLoader batching
   */
  private async batchFetchRelayInfo(urls: string[]): Promise<(RelayInfoWithMetrics | Error)[]> {
    try {
      // First check IndexedDB and memory cache
      const cachedResults = await Promise.all(
        urls.map(async (url) => {
          // Check memory cache first
          if (this.cache.has(url) && this.isCacheValid(url)) {
            return { url, info: this.cache.get(url)!, fromMemory: true };
          }

          // Check IndexedDB
          const cached = await indexedDBService.getRelayInfo(url);
          if (cached) {
            // Update memory cache
            this.updateCache(url, cached);
            return { url, info: cached, fromMemory: false };
          }

          return { url, info: null, fromMemory: false };
        })
      );

      // Separate cached and uncached URLs
      const cachedInfo = new Map<string, RelayInfoWithMetrics>();
      const uncachedUrls: string[] = [];

      cachedResults.forEach(({ url, info, fromMemory }) => {
        if (info) {
          cachedInfo.set(url, info);
        } else {
          // Check if URL recently failed
          const failure = this.failureCache.get(url);
          if (!failure || (Date.now() - failure.lastFailure) > this.FAILURE_BACKOFF) {
            uncachedUrls.push(url);
          } else {
            // Return error for URLs in failure backoff
            cachedInfo.set(url, this.createErrorInfo(url, 'Recently failed, in backoff period'));
          }
        }
      });

      // Fetch uncached relay info if needed
      if (uncachedUrls.length > 0) {
        const fetchPromises = uncachedUrls.map(url => this.fetchSingleRelayInfo(url));
        const freshResults = await Promise.allSettled(fetchPromises);

        freshResults.forEach((result, index) => {
          const url = uncachedUrls[index];

          if (result.status === 'fulfilled' && result.value) {
            const info = result.value;
            cachedInfo.set(url, info);

            // Update caches
            this.updateCache(url, info);
            indexedDBService.putRelayInfo(info).catch(console.warn);

            // Clear failure cache on success
            this.failureCache.delete(url);
          } else {
            // Handle failure
            const error = result.status === 'rejected' ? result.reason : 'Failed to fetch relay info';
            const errorInfo = this.createErrorInfo(url, error.toString());
            cachedInfo.set(url, errorInfo);

            // Update failure cache
            const existing = this.failureCache.get(url) || { count: 0, lastFailure: 0 };
            this.failureCache.set(url, {
              count: existing.count + 1,
              lastFailure: Date.now()
            });
          }
        });
      }

      // Return results in same order as requested URLs
      return urls.map((url) => {
        const info = cachedInfo.get(url);
        return info || new Error(`No relay info found for ${url}`);
      });
    } catch (error) {
      console.error('Batch fetch relay info error:', error);
      return urls.map(() => new Error('Batch fetch failed'));
    }
  }

  /**
   * Fetch NIP-11 information for a single relay
   */
  private async fetchSingleRelayInfo(url: string): Promise<RelayInfoWithMetrics | null> {
    try {
      const normalizedUrl = this.normalizeRelayUrl(url);
      const infoUrl = normalizedUrl.replace('ws://', 'http://').replace('wss://', 'https://');

      const startTime = Date.now();
      const response = await fetch(infoUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/nostr+json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const info = await response.json() as TRelayInfo;

      // Calculate quality and reliability scores
      const qualityScore = this.calculateQualityScore(info, responseTime);
      const reliabilityScore = this.calculateReliabilityScore(url, true);

      return {
        ...info,
        url: normalizedUrl,
        responseTime,
        lastChecked: Date.now(),
        isReachable: true,
        errorCount: 0,
        successRate: 1.0,
        qualityScore,
        reliabilityScore
      };
    } catch (error) {
      console.warn(`Failed to fetch relay info for ${url}:`, error);
      return null;
    }
  }

  /**
   * Create error info object for failed fetches
   */
  private createErrorInfo(url: string, error: string): RelayInfoWithMetrics {
    const existing = this.cache.get(url);
    const failureInfo = this.failureCache.get(url) || { count: 0, lastFailure: 0 };

    return {
      url: this.normalizeRelayUrl(url),
      name: existing?.name || url,
      description: `Error: ${error}`,
      lastChecked: Date.now(),
      isReachable: false,
      errorCount: failureInfo.count + 1,
      successRate: existing?.successRate || 0,
      qualityScore: 0,
      reliabilityScore: this.calculateReliabilityScore(url, false)
    };
  }

  /**
   * Calculate quality score based on NIP-11 data and performance
   */
  private calculateQualityScore(info: TRelayInfo, responseTime: number): number {
    let score = 50; // Base score

    // Bonus for having detailed information
    if (info.name) score += 10;
    if (info.description) score += 10;
    if (info.contact) score += 5;
    if (info.supported_nips && info.supported_nips.length > 0) score += 15;
    if (info.software && info.version) score += 10;

    // Performance bonus/penalty
    if (responseTime < 1000) score += 10;
    else if (responseTime < 3000) score += 5;
    else if (responseTime > 10000) score -= 20;

    // Limitations penalty (restrictive relays)
    if (info.limitation?.auth_required) score -= 5;
    if (info.limitation?.payment_required) score -= 10;
    if (info.limitation?.restricted_writes) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate reliability score based on historical success/failure
   */
  private calculateReliabilityScore(url: string, currentSuccess: boolean): number {
    const existing = this.cache.get(url);
    const failure = this.failureCache.get(url);

    if (!existing && currentSuccess) return 100;
    if (!existing && !currentSuccess) return 0;

    let score = existing?.reliabilityScore || 100;

    if (currentSuccess) {
      score = Math.min(100, score + 5); // Increase on success
    } else {
      const penalty = failure ? Math.min(30, failure.count * 10) : 10;
      score = Math.max(0, score - penalty);
    }

    return score;
  }

  /**
   * Normalize relay URL format
   */
  private normalizeRelayUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Ensure ws/wss protocol
      if (parsed.protocol === 'http:') parsed.protocol = 'ws:';
      if (parsed.protocol === 'https:') parsed.protocol = 'wss:';

      // Remove trailing slash
      return parsed.toString().replace(/\/$/, '');
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(url: string): boolean {
    const expiry = this.cacheExpiry.get(url);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Update memory cache
   */
  private updateCache(url: string, info: RelayInfoWithMetrics): void {
    this.cache.set(url, info);
    this.cacheExpiry.set(url, Date.now() + this.CACHE_TTL);
  }

  /**
   * Get relay information for a single URL
   */
  async getRelayInfo(url: string, forceRefresh = false): Promise<RelayInfoWithMetrics> {
    // Check cache first unless forcing refresh
    if (!forceRefresh && this.cache.has(url) && this.isCacheValid(url)) {
      return this.cache.get(url)!;
    }

    try {
      if (forceRefresh) {
        // Clear cache and DataLoader cache for this URL
        this.clearCache(url);
        this.relayInfoDataLoader.clear(url);
      }

      const result = await this.relayInfoDataLoader.load(url);

      if (result instanceof Error) {
        throw result;
      }

      return result;
    } catch (error) {
      console.error('Failed to fetch relay info for', url, error);

      // Return cached data if available, otherwise create error info
      if (this.cache.has(url)) {
        return this.cache.get(url)!;
      }

      return this.createErrorInfo(url, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get relay information for multiple URLs
   */
  async getRelayInfoBatch(urls: string[], forceRefresh = false): Promise<RelayInfoWithMetrics[]> {
    if (forceRefresh) {
      urls.forEach(url => {
        this.clearCache(url);
        this.relayInfoDataLoader.clear(url);
      });
    }

    try {
      const results = await this.relayInfoDataLoader.loadMany(urls);

      return results.map((result, index) => {
        if (result instanceof Error) {
          return this.createErrorInfo(urls[index], result.message);
        }
        return result;
      });
    } catch (error) {
      console.error('Failed to fetch relay info batch:', error);
      return urls.map(url => this.createErrorInfo(url, 'Batch fetch failed'));
    }
  }

  /**
   * Get relay performance metrics
   */
  getPerformanceMetrics(url: string): {
    responseTime?: number;
    successRate?: number;
    qualityScore?: number;
    reliabilityScore?: number;
    errorCount?: number;
  } {
    const info = this.cache.get(url);
    if (!info) return {};

    return {
      responseTime: info.responseTime,
      successRate: info.successRate,
      qualityScore: info.qualityScore,
      reliabilityScore: info.reliabilityScore,
      errorCount: info.errorCount
    };
  }

  /**
   * Clear cache for specific URL or all
   */
  clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
      this.cacheExpiry.delete(url);
      this.relayInfoDataLoader.clear(url);
      // Clear from IndexedDB as well
      indexedDBService.deleteRelayInfo(url).catch(console.warn);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
      this.relayInfoDataLoader.clearAll();
      // Clear all relay info from IndexedDB
      indexedDBService.clearRelayInfos().catch(console.warn);
    }
  }

  /**
   * Prime cache with known relay info
   */
  primeCache(url: string, info: RelayInfoWithMetrics): void {
    this.updateCache(url, info);
    this.relayInfoDataLoader.prime(url, info);
  }

  /**
   * Get relay recommendations based on quality scores
   */
  getRecommendedRelays(minQualityScore = 70, limit = 10): RelayInfoWithMetrics[] {
    return Array.from(this.cache.values())
      .filter(info => (info.qualityScore || 0) >= minQualityScore && info.isReachable)
      .sort((a, b) => {
        // Sort by combined quality and reliability score
        const scoreA = (a.qualityScore || 0) + (a.reliabilityScore || 0);
        const scoreB = (b.qualityScore || 0) + (b.reliabilityScore || 0);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Check if relay supports specific NIP
   */
  supportsNip(url: string, nip: number): boolean {
    const info = this.cache.get(url);
    return info?.supported_nips?.includes(nip) || false;
  }
}

// Singleton instance
const relayInfoService = new RelayInfoService();
export default relayInfoService;