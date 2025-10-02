import type { NostrEvent } from '@nostrify/nostrify';
import { bundleLog } from '@/lib/logBundler';

/**
 * Timeline analytics data
 */
export interface TimelineAnalytics {
  feedId: string;
  startTime: number;
  lastUpdate: number;
  
  // Event metrics
  totalEvents: number;
  eventsPerHour: number;
  averageEventAge: number;
  
  // Content metrics
  videoEvents: number;
  textEvents: number;
  uniqueAuthors: number;
  
  // Performance metrics
  averageLoadTime: number;
  subscriptionHealth: number; // 0-1 score
  relayResponseTimes: Record<string, number>;
  
  // Engagement prediction
  engagementScore: number; // 0-1 score based on content quality indicators
  contentDiversity: number; // 0-1 score based on author and topic diversity
}

/**
 * Feed health indicators
 */
export interface FeedHealthStatus {
  overall: 'healthy' | 'degraded' | 'poor';
  issues: string[];
  recommendations: string[];
  metrics: {
    eventFlow: number; // 0-1 score
    contentQuality: number; // 0-1 score
    relayHealth: number; // 0-1 score
    userEngagement: number; // 0-1 score
  };
}

/**
 * Timeline Analytics Service - Phase 3 Enhancement
 * 
 * Monitors feed health, performance, and provides insights
 * for optimizing timeline experience
 */
class TimelineAnalyticsService {
  private analytics: Map<string, TimelineAnalytics> = new Map();
  private eventHistory: Map<string, NostrEvent[]> = new Map(); // Recent events per feed
  private readonly HISTORY_LIMIT = 100; // Keep last 100 events per feed
  private readonly ANALYTICS_INTERVAL = 60000; // Update analytics every minute

  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startAnalyticsUpdates();
    bundleLog('timelineAnalytics', '📊 Timeline analytics service initialized');
  }

  /**
   * Initialize analytics tracking for a feed
   */
  initializeFeed(feedId: string): void {
    if (!this.analytics.has(feedId)) {
      const analytics: TimelineAnalytics = {
        feedId,
        startTime: Date.now(),
        lastUpdate: Date.now(),
        totalEvents: 0,
        eventsPerHour: 0,
        averageEventAge: 0,
        videoEvents: 0,
        textEvents: 0,
        uniqueAuthors: 0,
        averageLoadTime: 0,
        subscriptionHealth: 1,
        relayResponseTimes: {},
        engagementScore: 0,
        contentDiversity: 0,
      };

      this.analytics.set(feedId, analytics);
      this.eventHistory.set(feedId, []);
      
      bundleLog('timelineAnalytics', `📊 Initialized analytics for feed: ${feedId}`);
    }
  }

  /**
   * Record new events for a feed
   */
  recordEvents(feedId: string, events: NostrEvent[]): void {
    const analytics = this.analytics.get(feedId);
    const history = this.eventHistory.get(feedId);
    
    if (!analytics || !history) {
      this.initializeFeed(feedId);
      return this.recordEvents(feedId, events);
    }

    // Update event counts
    analytics.totalEvents += events.length;
    analytics.lastUpdate = Date.now();

    // Categorize events
    for (const event of events) {
      if (this.isVideoEvent(event)) {
        analytics.videoEvents++;
      } else {
        analytics.textEvents++;
      }
    }

    // Add to history (keep only recent events)
    history.push(...events);
    if (history.length > this.HISTORY_LIMIT) {
      history.splice(0, history.length - this.HISTORY_LIMIT);
    }

    bundleLog('timelineAnalytics', `📊 Recorded ${events.length} events for feed: ${feedId}`);
  }

  /**
   * Record relay response time
   */
  recordRelayResponse(feedId: string, relayUrl: string, responseTime: number): void {
    const analytics = this.analytics.get(feedId);
    if (analytics) {
      analytics.relayResponseTimes[relayUrl] = responseTime;
      bundleLog('timelineAnalytics', `📊 Relay ${relayUrl} response: ${responseTime}ms`);
    }
  }

  /**
   * Record feed load time
   */
  recordLoadTime(feedId: string, loadTime: number): void {
    const analytics = this.analytics.get(feedId);
    if (analytics) {
      // Calculate rolling average
      if (analytics.averageLoadTime === 0) {
        analytics.averageLoadTime = loadTime;
      } else {
        analytics.averageLoadTime = (analytics.averageLoadTime * 0.7) + (loadTime * 0.3);
      }
      bundleLog('timelineAnalytics', `📊 Feed ${feedId} load time: ${loadTime}ms (avg: ${Math.round(analytics.averageLoadTime)}ms)`);
    }
  }

  /**
   * Get analytics for a specific feed
   */
  getFeedAnalytics(feedId: string): TimelineAnalytics | null {
    return this.analytics.get(feedId) || null;
  }

  /**
   * Get health status for a feed
   */
  getFeedHealth(feedId: string): FeedHealthStatus {
    const analytics = this.analytics.get(feedId);
    
    if (!analytics) {
      return {
        overall: 'poor',
        issues: ['No analytics data available'],
        recommendations: ['Initialize feed analytics'],
        metrics: {
          eventFlow: 0,
          contentQuality: 0,
          relayHealth: 0,
          userEngagement: 0,
        },
      };
    }

    const metrics = this.calculateHealthMetrics(analytics);
    const overall = this.calculateOverallHealth(metrics);
    const issues = this.identifyIssues(analytics, metrics);
    const recommendations = this.generateRecommendations(analytics, metrics, issues);

    return {
      overall,
      issues,
      recommendations,
      metrics,
    };
  }

  /**
   * Get analytics for all feeds
   */
  getAllAnalytics(): TimelineAnalytics[] {
    return Array.from(this.analytics.values());
  }

  /**
   * Reset analytics for a feed
   */
  resetFeedAnalytics(feedId: string): void {
    this.analytics.delete(feedId);
    this.eventHistory.delete(feedId);
    bundleLog('timelineAnalytics', `📊 Reset analytics for feed: ${feedId}`);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.analytics.clear();
    this.eventHistory.clear();
    
    bundleLog('timelineAnalytics', '📊 Timeline analytics service destroyed');
  }

  /**
   * Start periodic analytics updates
   */
  private startAnalyticsUpdates(): void {
    this.intervalId = setInterval(() => {
      this.updateAllAnalytics();
    }, this.ANALYTICS_INTERVAL);
  }

  /**
   * Update analytics for all feeds
   */
  private updateAllAnalytics(): void {
    const now = Date.now();
    
    for (const [feedId, analytics] of this.analytics.entries()) {
      const history = this.eventHistory.get(feedId) || [];
      
      // Update calculated metrics
      this.updateCalculatedMetrics(analytics, history, now);
    }
  }

  /**
   * Update calculated metrics for a feed
   */
  private updateCalculatedMetrics(analytics: TimelineAnalytics, history: NostrEvent[], now: number): void {
    const hoursSinceStart = (now - analytics.startTime) / (1000 * 60 * 60);
    
    // Events per hour
    analytics.eventsPerHour = hoursSinceStart > 0 ? analytics.totalEvents / hoursSinceStart : 0;
    
    // Average event age
    if (history.length > 0) {
      const currentTime = Math.floor(now / 1000);
      const totalAge = history.reduce((sum, event) => sum + (currentTime - event.created_at), 0);
      analytics.averageEventAge = totalAge / history.length;
    }
    
    // Unique authors
    const uniqueAuthors = new Set(history.map(event => event.pubkey));
    analytics.uniqueAuthors = uniqueAuthors.size;
    
    // Content diversity (0-1 score based on author variety)
    analytics.contentDiversity = history.length > 0 ? 
      Math.min(uniqueAuthors.size / Math.max(history.length * 0.5, 10), 1) : 0;
    
    // Engagement score (placeholder - would integrate with actual engagement data)
    analytics.engagementScore = this.calculateEngagementScore(history);
    
    // Subscription health (based on relay response times)
    analytics.subscriptionHealth = this.calculateSubscriptionHealth(analytics.relayResponseTimes);
  }

  /**
   * Calculate health metrics
   */
  private calculateHealthMetrics(analytics: TimelineAnalytics) {
    const eventFlow = Math.min(analytics.eventsPerHour / 10, 1); // Normalize to 10 events/hour max
    const contentQuality = analytics.contentDiversity * 0.6 + analytics.engagementScore * 0.4;
    const relayHealth = analytics.subscriptionHealth;
    const userEngagement = analytics.engagementScore;

    return {
      eventFlow,
      contentQuality,
      relayHealth,
      userEngagement,
    };
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealth(metrics: typeof this.calculateHealthMetrics.prototype): FeedHealthStatus['overall'] {
    const average = (metrics.eventFlow + metrics.contentQuality + metrics.relayHealth + metrics.userEngagement) / 4;
    
    if (average >= 0.7) return 'healthy';
    if (average >= 0.4) return 'degraded';
    return 'poor';
  }

  /**
   * Identify feed issues
   */
  private identifyIssues(analytics: TimelineAnalytics, metrics: any): string[] {
    const issues: string[] = [];
    
    if (metrics.eventFlow < 0.3) {
      issues.push('Low event flow - feed may be stale');
    }
    
    if (metrics.contentQuality < 0.4) {
      issues.push('Low content diversity - consider expanding sources');
    }
    
    if (metrics.relayHealth < 0.5) {
      issues.push('Poor relay performance - some relays may be slow');
    }
    
    if (analytics.averageLoadTime > 3000) {
      issues.push('Slow feed loading times');
    }
    
    return issues;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(analytics: TimelineAnalytics, metrics: any, issues: string[]): string[] {
    const recommendations: string[] = [];
    
    if (issues.includes('Low event flow - feed may be stale')) {
      recommendations.push('Try switching to a different relay or refreshing the feed');
    }
    
    if (issues.includes('Low content diversity - consider expanding sources')) {
      recommendations.push('Follow more diverse content creators');
    }
    
    if (issues.includes('Poor relay performance - some relays may be slow')) {
      recommendations.push('Consider switching to faster relays');
    }
    
    if (issues.includes('Slow feed loading times')) {
      recommendations.push('Check network connection or try different relays');
    }
    
    return recommendations;
  }

  /**
   * Check if event is a video event
   */
  private isVideoEvent(event: NostrEvent): boolean {
    return event.kind === 21 || event.kind === 22 || 
           event.tags.some(([name]) => name === 'imeta');
  }

  /**
   * Calculate engagement score (placeholder implementation)
   */
  private calculateEngagementScore(history: NostrEvent[]): number {
    if (history.length === 0) return 0;
    
    // Simple heuristic based on content length and recency
    let score = 0;
    const now = Math.floor(Date.now() / 1000);
    
    for (const event of history) {
      const age = now - event.created_at;
      const recencyFactor = Math.max(0, 1 - (age / (24 * 60 * 60))); // Decay over 24 hours
      const contentFactor = Math.min(event.content.length / 280, 1); // Normalize to tweet length
      
      score += recencyFactor * contentFactor;
    }
    
    return Math.min(score / history.length, 1);
  }

  /**
   * Calculate subscription health based on relay performance
   */
  private calculateSubscriptionHealth(relayResponseTimes: Record<string, number>): number {
    const responseTimes = Object.values(relayResponseTimes);
    
    if (responseTimes.length === 0) return 1;
    
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    
    // Health decreases as response time increases (normalized to 5000ms max)
    return Math.max(0, 1 - (averageResponseTime / 5000));
  }
}

// Export singleton instance
export const timelineAnalyticsService = new TimelineAnalyticsService();