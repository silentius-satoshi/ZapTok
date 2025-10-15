import { useState, useCallback, useEffect } from 'react';
import { timelineFilterService, type ContentFilter } from '@/services/timelineFilterService';
import { bundleLog } from '@/lib/logBundler';

/**
 * Hook for managing timeline content filters
 */
export function useTimelineFilters() {
  const [activeFilters, setActiveFilters] = useState<ContentFilter[]>([]);

  // Get available preset filters
  const presetFilters = timelineFilterService.createPresetFilters();

  // Add content filter
  const addFilter = useCallback((filter: ContentFilter) => {
    timelineFilterService.registerFilter(filter);
    setActiveFilters(timelineFilterService.getFilters());
    bundleLog('timelineFilters', `➕ Added filter: ${filter.name}`);
  }, []);

  // Remove content filter
  const removeFilter = useCallback((filterId: string) => {
    timelineFilterService.removeFilter(filterId);
    setActiveFilters(timelineFilterService.getFilters());
    bundleLog('timelineFilters', `➖ Removed filter: ${filterId}`);
  }, []);

  // Toggle filter enabled/disabled
  const toggleFilter = useCallback((filterId: string, enabled: boolean) => {
    timelineFilterService.toggleFilter(filterId, enabled);
    setActiveFilters(timelineFilterService.getFilters());
    bundleLog('timelineFilters', `🔄 Toggled filter: ${filterId} → ${enabled}`);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const filters = timelineFilterService.getFilters();
    filters.forEach(filter => timelineFilterService.removeFilter(filter.id));
    setActiveFilters([]);
    bundleLog('timelineFilters', '🧹 Cleared all filters');
  }, []);

  // Apply preset filter by ID
  const applyPresetFilter = useCallback((presetId: string) => {
    const preset = presetFilters.find(filter => filter.id === presetId);
    if (preset) {
      addFilter(preset);
      bundleLog('timelineFilters', `🎯 Applied preset filter: ${preset.name}`);
    }
  }, [presetFilters, addFilter]);

  // Get filter statistics
  const getFilterStats = useCallback(() => {
    return timelineFilterService.getStats();
  }, []);

  // Update active filters when service changes
  useEffect(() => {
    const updateFilters = () => {
      setActiveFilters(timelineFilterService.getFilters());
    };

    // Initial load
    updateFilters();

    // Set up periodic updates if needed
    const interval = setInterval(updateFilters, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    // Filter state
    activeFilters,
    presetFilters,

    // Filter actions
    addFilter,
    removeFilter,
    toggleFilter,
    clearFilters,
    applyPresetFilter,

    // Filter info
    getFilterStats,
    filterCount: activeFilters.length,
    isFiltering: activeFilters.some(f => f.enabled),
    enabledFilters: activeFilters.filter(f => f.enabled),
  };
}

/**
 * Hook for timeline real-time event management
 */
export function useTimelineRealTime() {
  const [bufferSize, setBufferSize] = useState(0);
  const [processingStats, setProcessingStats] = useState({
    totalProcessed: 0,
    duplicatesFiltered: 0,
    averageFlushTime: 0,
  });

  // Get buffer size
  const updateBufferSize = useCallback(() => {
    const stats = timelineFilterService.getStats();
    setBufferSize(stats.filtered);
  }, []);

  // Force flush buffer (placeholder - would integrate with real-time service)
  const flushBuffer = useCallback(() => {
    bundleLog('timelineRealTime', '🚀 Manually flushed real-time buffer');
    updateBufferSize();
  }, [updateBufferSize]);

  // Get processing statistics
  const updateStats = useCallback(() => {
    const stats = timelineFilterService.getStats();
    setProcessingStats({
      totalProcessed: stats.totalProcessed,
      duplicatesFiltered: stats.filtered,
      averageFlushTime: 0, // Would come from real-time service
    });
  }, []);

  // Update buffer size and stats periodically
  useEffect(() => {
    const updateData = () => {
      updateBufferSize();
      updateStats();
    };

    updateData();
    const interval = setInterval(updateData, 2000);

    return () => clearInterval(interval);
  }, [updateBufferSize, updateStats]);

  return {
    // Real-time state
    bufferSize,
    processingStats,

    // Real-time actions
    flushBuffer,

    // Real-time info
    isBuffering: bufferSize > 0,
    shouldFlush: bufferSize > 10, // Suggest manual flush
  };
}

/**
 * Hook for timeline analytics and health monitoring
 */
export function useTimelineAnalytics(feedId?: string) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [feedHealth, setFeedHealth] = useState<any>(null);

  // Update analytics data
  const updateAnalytics = useCallback(() => {
    if (!feedId) return;

    // Get filter statistics as a base for analytics
    const stats = timelineFilterService.getStats();
    setAnalytics({
      totalProcessed: stats.totalProcessed,
      totalFiltered: stats.filtered,
      passed: stats.passed,
      filterBreakdown: stats.filterBreakdown,
    });

    // Calculate basic feed health based on available data
    const healthScore = stats.totalProcessed > 0 ?
      (stats.passed / stats.totalProcessed) : 1;

    setFeedHealth({
      overall: healthScore > 0.7 ? 'healthy' :
               healthScore > 0.4 ? 'degraded' : 'poor',
      issues: [],
      recommendations: [],
      metrics: {
        eventFlow: Math.min(stats.totalProcessed / 100, 1),
        contentQuality: healthScore,
        relayHealth: 0.9, // Placeholder
        userEngagement: 0.6, // Placeholder
      },
    });
  }, [feedId]);

  // Reset analytics for feed
  const resetAnalytics = useCallback(() => {
    if (!feedId) return;
    timelineFilterService.resetStats();
    setAnalytics(null);
    setFeedHealth(null);
    bundleLog('timelineAnalytics', `📊 Reset analytics for feed: ${feedId}`);
  }, [feedId]);

  // Update analytics periodically
  useEffect(() => {
    if (!feedId) return;

    updateAnalytics();
    const interval = setInterval(updateAnalytics, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [feedId, updateAnalytics]);

  return {
    // Analytics data
    analytics,
    feedHealth,

    // Analytics actions
    resetAnalytics,

    // Analytics info
    hasAnalytics: !!analytics,
    isHealthy: feedHealth?.overall === 'healthy',
  };
}