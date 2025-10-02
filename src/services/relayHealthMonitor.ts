/**
 * Enhanced Relay Health Monitor Service
 * Extends existing patterns with sophisticated health tracking and scoring
 */

import { EventEmitter } from 'eventemitter3';

export interface RelayHealthMetrics {
  readonly url: string;
  readonly latency: number;
  readonly successRate: number;
  readonly failureCount: number;
  readonly totalRequests: number;
  readonly lastSuccess: number;
  readonly lastFailure: number;
  readonly connectionStability: number;
  readonly healthScore: number;
  readonly isHealthy: boolean;
  readonly responseTimeHistory: number[];
  readonly uptime: number;
}

export interface RelayHealthEvents {
  'health-update': (url: string, metrics: RelayHealthMetrics) => void;
  'health-degraded': (url: string, metrics: RelayHealthMetrics) => void;
  'health-recovered': (url: string, metrics: RelayHealthMetrics) => void;
  'relay-disconnected': (url: string, reason: string) => void;
}

interface HealthCheckResult {
  success: boolean;
  latency: number;
  timestamp: number;
  error?: string;
}

/**
 * Configuration for health monitoring
 */
export interface RelayHealthConfig {
  healthCheckInterval: number; // How often to check relay health (ms)
  successThreshold: number; // Success rate threshold for healthy status
  failureThreshold: number; // Failure rate threshold for unhealthy status
  latencyThreshold: number; // Max acceptable latency (ms)
  connectionTimeout: number; // WebSocket connection timeout
  minRequestsForScoring: number; // Minimum requests needed for reliable health scoring
  activeRelaysProvider?: () => string[]; // Function to get currently active relays
  healthySuccessRate: number; // Success rate for healthy status
  responseTimeWindow: number; // Response time window for calculations
  maxLatency: number; // Maximum acceptable latency
}

const DEFAULT_CONFIG: RelayHealthConfig = {
  healthySuccessRate: 0.85, // 85% success rate minimum
  maxLatency: 3000, // 3 second max latency
  responseTimeWindow: 10, // Last 10 responses
  healthCheckInterval: 30000, // 30 second health checks
  connectionTimeout: 10000, // 10 second connection timeout
  minRequestsForScoring: 5, // Need 5+ requests for reliable scoring
  successThreshold: 0.85, // Success rate threshold for healthy status
  failureThreshold: 0.3, // Failure rate threshold for unhealthy status
  latencyThreshold: 3000, // Max acceptable latency (ms)
};

/**
 * Enhanced relay health monitoring service following Snort's event-driven patterns
 */
export class RelayHealthMonitor extends EventEmitter<RelayHealthEvents> {
  private readonly metrics = new Map<string, RelayHealthMetrics>();
  private readonly config: RelayHealthConfig;
  private readonly healthCheckTimer: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: Partial<RelayHealthConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Start background health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
    
    this.isRunning = true;
  }

  /**
   * Track a successful relay interaction
   */
  onSuccess(url: string, latency: number): void {
    const metrics = this.getOrCreateMetrics(url);
    const now = Date.now();

    // Update basic counters
    const updatedMetrics: RelayHealthMetrics = {
      ...metrics,
      latency: this.calculateAverageLatency(metrics, latency),
      totalRequests: metrics.totalRequests + 1,
      lastSuccess: now,
      responseTimeHistory: this.updateResponseHistory(metrics, latency),
    };

    // Recalculate derived metrics
    this.updateDerivedMetrics(url, updatedMetrics);
  }

  /**
   * Track a failed relay interaction
   */
  onFailure(url: string, error?: string): void {
    const metrics = this.getOrCreateMetrics(url);
    const now = Date.now();

    const updatedMetrics: RelayHealthMetrics = {
      ...metrics,
      failureCount: metrics.failureCount + 1,
      totalRequests: metrics.totalRequests + 1,
      lastFailure: now,
    };

    this.updateDerivedMetrics(url, updatedMetrics);
    
    // Check if relay has become unhealthy
    if (updatedMetrics.isHealthy === false && metrics.isHealthy === true) {
      this.emit('health-degraded', url, updatedMetrics);
    }
  }

  /**
   * Track connection events
   */
  onConnect(url: string): void {
    const metrics = this.getOrCreateMetrics(url);
    
    // Reset connection stability on successful connection
    const updatedMetrics: RelayHealthMetrics = {
      ...metrics,
      connectionStability: Math.min(1.0, metrics.connectionStability + 0.1),
    };

    this.updateDerivedMetrics(url, updatedMetrics);
  }

  /**
   * Track disconnection events
   */
  onDisconnect(url: string, reason: string): void {
    const metrics = this.getOrCreateMetrics(url);
    
    // Reduce connection stability
    const updatedMetrics: RelayHealthMetrics = {
      ...metrics,
      connectionStability: Math.max(0.0, metrics.connectionStability - 0.2),
    };

    this.updateDerivedMetrics(url, updatedMetrics);
    this.emit('relay-disconnected', url, reason);
  }

  /**
   * Get health metrics for a relay
   */
  getMetrics(url: string): RelayHealthMetrics | undefined {
    return this.metrics.get(url);
  }

  /**
   * Get all tracked relay metrics
   */
  getAllMetrics(): Map<string, RelayHealthMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get healthy relays sorted by health score
   */
  getHealthyRelays(): RelayHealthMetrics[] {
    return Array.from(this.metrics.values())
      .filter(m => m.isHealthy)
      .sort((a, b) => b.healthScore - a.healthScore);
  }

  /**
   * Get unhealthy relays
   */
  getUnhealthyRelays(): RelayHealthMetrics[] {
    return Array.from(this.metrics.values())
      .filter(m => !m.isHealthy);
  }

  /**
   * Remove relay from monitoring
   */
  removeRelay(url: string): void {
    this.metrics.delete(url);
  }

  /**
   * Set the active relays provider function
   */
  setActiveRelaysProvider(provider: () => string[]): void {
    this.config.activeRelaysProvider = provider;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.isRunning = false;
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.removeAllListeners();
    this.metrics.clear();
  }

  /**
   * Get or create metrics for a relay
   */
  private getOrCreateMetrics(url: string): RelayHealthMetrics {
    if (!this.metrics.has(url)) {
      const now = Date.now();
      this.metrics.set(url, {
        url,
        latency: 0,
        successRate: 1.0,
        failureCount: 0,
        totalRequests: 0,
        lastSuccess: now,
        lastFailure: 0,
        connectionStability: 1.0,
        healthScore: 1.0,
        isHealthy: true,
        responseTimeHistory: [],
        uptime: 1.0,
      });
    }
    return this.metrics.get(url)!;
  }

  /**
   * Calculate average latency with response time window
   */
  private calculateAverageLatency(metrics: RelayHealthMetrics, newLatency: number): number {
    const history = [...metrics.responseTimeHistory, newLatency];
    const windowSize = Math.min(history.length, this.config.responseTimeWindow);
    const recentHistory = history.slice(-windowSize);
    return recentHistory.reduce((sum, time) => sum + time, 0) / recentHistory.length;
  }

  /**
   * Update response time history
   */
  private updateResponseHistory(metrics: RelayHealthMetrics, latency: number): number[] {
    const history = [...metrics.responseTimeHistory, latency];
    return history.slice(-this.config.responseTimeWindow);
  }

  /**
   * Update derived metrics and emit events
   */
  private updateDerivedMetrics(url: string, baseMetrics: RelayHealthMetrics): void {
    const successCount = baseMetrics.totalRequests - baseMetrics.failureCount;
    const successRate = baseMetrics.totalRequests > 0 
      ? successCount / baseMetrics.totalRequests 
      : 1.0;

    // Calculate health score (0-1)
    const latencyScore = Math.max(0, 1 - (baseMetrics.latency / this.config.maxLatency));
    const successScore = successRate;
    const stabilityScore = baseMetrics.connectionStability;
    
    // Weighted health score
    const healthScore = (
      latencyScore * 0.4 + 
      successScore * 0.4 + 
      stabilityScore * 0.2
    );

    // Determine if relay is healthy
    const hasEnoughData = baseMetrics.totalRequests >= this.config.minRequestsForScoring;
    const meetsSuccessThreshold = successRate >= this.config.healthySuccessRate;
    const meetsLatencyThreshold = baseMetrics.latency <= this.config.maxLatency;
    
    const isHealthy = hasEnoughData 
      ? (meetsSuccessThreshold && meetsLatencyThreshold && stabilityScore > 0.5)
      : true; // Assume healthy until proven otherwise

    // Calculate uptime
    const now = Date.now();
    const timeSinceLastFailure = baseMetrics.lastFailure > 0 
      ? now - baseMetrics.lastFailure 
      : now - baseMetrics.lastSuccess;
    const uptime = baseMetrics.lastFailure === 0 ? 1.0 : 
      Math.min(1.0, timeSinceLastFailure / (24 * 60 * 60 * 1000)); // 24h window

    const finalMetrics: RelayHealthMetrics = {
      ...baseMetrics,
      successRate,
      healthScore,
      isHealthy,
      uptime,
    };

    // Check for health state changes
    const previousMetrics = this.metrics.get(url);
    const wasHealthy = previousMetrics?.isHealthy ?? true;

    this.metrics.set(url, finalMetrics);

    // Emit events for health state changes
    if (wasHealthy && !isHealthy) {
      this.emit('health-degraded', url, finalMetrics);
    } else if (!wasHealthy && isHealthy) {
      this.emit('health-recovered', url, finalMetrics);
    }

    this.emit('health-update', url, finalMetrics);
  }

  /**
   * Perform background health checks
   */
  private async performHealthChecks(): Promise<void> {
    if (!this.isRunning) return;

    // Get currently active relays from provider or fall back to all tracked relays
    const activeRelays = this.config.activeRelaysProvider?.() || [];
    const relaysToCheck = activeRelays.length > 0 
      ? activeRelays.filter(url => this.metrics.has(url)) // Only check active relays that we're tracking
      : Array.from(this.metrics.keys()); // Fallback to all tracked relays if no provider
    
    for (const url of relaysToCheck) {
      try {
        const result = await this.performHealthCheck(url);
        if (result.success) {
          this.onSuccess(url, result.latency);
        } else {
          this.onFailure(url, result.error);
        }
      } catch (error) {
        this.onFailure(url, error instanceof Error ? error.message : 'Health check failed');
      }
    }
  }

  /**
   * Perform individual health check
   */
  private async performHealthCheck(url: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple WebSocket connection test
      const ws = new WebSocket(url);
      
      return new Promise<HealthCheckResult>((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            success: false,
            latency: Date.now() - startTime,
            timestamp: startTime,
            error: 'Connection timeout',
          });
        }, this.config.connectionTimeout);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({
            success: true,
            latency: Date.now() - startTime,
            timestamp: startTime,
          });
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve({
            success: false,
            latency: Date.now() - startTime,
            timestamp: startTime,
            error: 'Connection failed',
          });
        };
      });
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        timestamp: startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create singleton instance
export const relayHealthMonitor = new RelayHealthMonitor();