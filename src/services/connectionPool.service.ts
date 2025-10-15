import { SimplePool } from 'nostr-tools/pool';
import { Relay } from 'nostr-tools/relay';

/**
 * ConnectionPoolService - Manages relay connections with pooling and health tracking
 * Based on production patterns for efficient connection management
 */
class ConnectionPoolService {
  private static instance: ConnectionPoolService;
  private pool: SimplePool;
  private connectionTimeout = 5000; // 5 second timeout like Jumble
  private eventSeenMap = new Map<string, Set<string>>();
  private relayHealthMap = new Map<string, {
    successCount: number;
    errorCount: number;
    lastError?: number;
    isConnected: boolean;
  }>();

  constructor() {
    this.pool = new SimplePool();
    this.pool.trackRelays = true; // Enable relay tracking
  }

  public static getInstance(): ConnectionPoolService {
    if (!ConnectionPoolService.instance) {
      ConnectionPoolService.instance = new ConnectionPoolService();
    }
    return ConnectionPoolService.instance;
  }

  /**
   * Ensure relay connection with timeout and health tracking
   */
  async ensureRelay(url: string, options?: { connectionTimeout?: number }): Promise<Relay | undefined> {
    try {
      const relay = await this.pool.ensureRelay(url, {
        connectionTimeout: options?.connectionTimeout || this.connectionTimeout
      });

      // Update health tracking on successful connection
      this.updateRelayHealth(url, true);
      return relay;
    } catch (error) {
      console.warn(`Failed to connect to relay ${url}:`, error);
      this.updateRelayHealth(url, false);
      return undefined;
    }
  }

  /**
   * Publish event to multiple relays with sophisticated error handling
   */
  async publishEvent(relayUrls: string[], event: any): Promise<{
    successes: string[];
    failures: { url: string; error: any }[];
  }> {
    const uniqueRelayUrls = Array.from(new Set(relayUrls));
    const successes: string[] = [];
    const failures: { url: string; error: any }[] = [];

    await new Promise<void>((resolve) => {
      let finishedCount = 0;

      const checkCompletion = () => {
        finishedCount++;
        if (finishedCount >= uniqueRelayUrls.length) {
          resolve();
        }
      };

      Promise.allSettled(
        uniqueRelayUrls.map(async (url) => {
          try {
            const relay = await this.ensureRelay(url);
            if (!relay) {
              failures.push({ url, error: new Error('Failed to connect') });
              return;
            }

            relay.publishTimeout = 10_000; // 10 second timeout
            await relay.publish(event);
            
            // Track successful publication
            this.trackEventSeenOn(event.id, relay);
            this.updateRelayHealth(url, true);
            successes.push(url);
          } catch (error: any) {
            // Handle auth-required retries
            if (error.message?.startsWith('auth-required')) {
              // TODO: Implement auth retry logic
              console.warn(`Auth required for ${url}, skipping for now`);
            }
            
            this.updateRelayHealth(url, false);
            failures.push({ url, error });
          }
        })
      ).then(() => checkCompletion());
    });

    return { successes, failures };
  }

  /**
   * Advanced subscription management with callbacks
   */
  subscribe(
    urls: string[],
    filter: any | any[],
    callbacks: {
      onevent?: (evt: any) => void;
      oneose?: (eosed: boolean) => void;
      onclose?: (url: string, reason: string) => void;
      onAllClose?: (reasons: string[]) => void;
    }
  ) {
    let eosed = false;
    let eosedCount = 0;
    let startedCount = 0;
    const closeReasons: string[] = [];

    const subs = urls.map(async (url) => {
      try {
        startedCount++;
        const relay = await this.ensureRelay(url);
        
        if (!relay) {
          // Handle connection failure
          if (!eosed) {
            eosedCount++;
            eosed = eosedCount >= startedCount;
            callbacks.oneose?.(eosed);
          }
          return { close: () => {} };
        }

        // Create subscription with callbacks
        const sub = relay.subscribe([filter].flat(), {
          onevent: callbacks.onevent,
          oneose: () => {
            if (!eosed) {
              eosedCount++;
              eosed = eosedCount >= startedCount;
              callbacks.oneose?.(eosed);
            }
          },
          onclose: (reason: string) => {
            closeReasons.push(reason);
            callbacks.onclose?.(url, reason);
            
            // Check if all connections closed
            if (closeReasons.length >= urls.length) {
              callbacks.onAllClose?.(closeReasons);
            }
          }
        });

        return sub;
      } catch (error) {
        console.warn(`Subscription failed for ${url}:`, error);
        return { close: () => {} };
      }
    });

    return {
      close: () => {
        Promise.all(subs).then(subscriptions => {
          subscriptions.forEach(sub => sub.close());
        });
      }
    };
  }

  /**
   * Track where events are seen for intelligent routing
   */
  trackEventSeenOn(eventId: string, relay: Relay) {
    if (!this.eventSeenMap.has(eventId)) {
      this.eventSeenMap.set(eventId, new Set());
    }
    this.eventSeenMap.get(eventId)!.add(relay.url);
  }

  /**
   * Get relay URLs where an event was seen
   */
  getSeenEventRelayUrls(eventId: string): string[] {
    return Array.from(this.eventSeenMap.get(eventId) || []);
  }

  /**
   * Update relay health metrics
   */
  private updateRelayHealth(url: string, success: boolean) {
    const health = this.relayHealthMap.get(url) || {
      successCount: 0,
      errorCount: 0,
      isConnected: false
    };

    if (success) {
      health.successCount++;
      health.isConnected = true;
    } else {
      health.errorCount++;
      health.lastError = Date.now();
      health.isConnected = false;
    }

    this.relayHealthMap.set(url, health);
  }

  /**
   * Get relay health score for intelligent routing
   */
  getRelayHealth(url: string): number {
    const health = this.relayHealthMap.get(url);
    if (!health) return 0.5; // Neutral score for unknown relays

    const total = health.successCount + health.errorCount;
    if (total === 0) return 0.5;

    const successRate = health.successCount / total;
    
    // Penalize recent errors
    const recentErrorPenalty = health.lastError && 
      (Date.now() - health.lastError < 300000) ? 0.2 : 0; // 5 minute penalty

    return Math.max(0, Math.min(1, successRate - recentErrorPenalty));
  }

  /**
   * Sort relays by health for optimal connection order
   */
  sortRelaysByHealth(urls: string[]): string[] {
    return [...urls].sort((a, b) => {
      const healthA = this.getRelayHealth(a);
      const healthB = this.getRelayHealth(b);
      return healthB - healthA; // Higher health first
    });
  }

  /**
   * Get pool statistics for monitoring
   */
  getPoolStats() {
    return {
      healthMap: Object.fromEntries(
        Array.from(this.relayHealthMap.entries()).map(([url, health]) => [
          url, 
          {
            ...health,
            healthScore: this.getRelayHealth(url)
          }
        ])
      ),
      eventsSeen: this.eventSeenMap.size,
      trackedRelaysCount: this.relayHealthMap.size
    };
  }

  /**
   * Close all connections and cleanup
   */
  async close() {
    await this.pool.close([]);
    this.eventSeenMap.clear();
    this.relayHealthMap.clear();
  }
}

// Export singleton instance
const connectionPoolService = ConnectionPoolService.getInstance();
export default connectionPoolService;