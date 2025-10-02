/**
 * Video Cache Debug Component
 * Shows cache statistics and performance metrics for relay optimization
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';
import { useVideoCache } from '@/lib/unifiedVideoCache';
import { bundleLog } from '@/lib/logBundler';

export function VideoCacheDebug() {
  const cache = useVideoCache();
  const [stats, setStats] = useState(cache.getStats());
  const [isVisible, setIsVisible] = useState(false);

  // Update stats every 5 seconds
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setStats(cache.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [cache, isVisible]);

  const handleRefresh = () => {
    setStats(cache.getStats());
    bundleLog('videoCaching', 'Cache stats refreshed');
  };

  const handleClear = () => {
    cache.clear();
    setStats(cache.getStats());
    bundleLog('videoCaching', 'Cache cleared manually');
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-background/80 backdrop-blur-sm"
      >
        <Eye className="h-4 w-4 mr-2" />
        Cache Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 bg-background/95 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Video Cache Debug</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-7 w-7 p-0"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cache Size Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total:</span>
            <Badge variant="secondary" className="text-xs">
              {stats.totalEntries}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valid:</span>
            <Badge variant="outline" className="text-xs">
              {stats.validEntries}
            </Badge>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hit Rate:</span>
            <Badge 
              variant={stats.cacheHitRate > 0.7 ? "default" : stats.cacheHitRate > 0.4 ? "secondary" : "destructive"}
              className="text-xs"
            >
              {formatPercentage(stats.cacheHitRate)}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Access:</span>
            <Badge variant="outline" className="text-xs">
              {stats.averageAccess.toFixed(1)}
            </Badge>
          </div>
        </div>

        {/* Expired Entries */}
        {stats.expiredEntries > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Expired:</span>
            <Badge variant="destructive" className="text-xs">
              {stats.expiredEntries}
            </Badge>
          </div>
        )}

        {/* Cache Performance Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <BarChart3 className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Performance:</span>
          <Badge 
            variant={
              stats.cacheHitRate > 0.8 ? "default" : 
              stats.cacheHitRate > 0.5 ? "secondary" : 
              "destructive"
            }
            className="text-xs"
          >
            {stats.cacheHitRate > 0.8 ? "Excellent" : 
             stats.cacheHitRate > 0.5 ? "Good" : 
             "Poor"}
          </Badge>
        </div>

        {/* Optimization Tips */}
        {stats.cacheHitRate < 0.5 && (
          <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
            💡 Low cache hit rate. Videos may be loading too fast or cache size too small.
          </div>
        )}

        {stats.expiredEntries > stats.validEntries && (
          <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
            ⚠️ Many expired entries. Consider increasing cache duration.
          </div>
        )}
      </CardContent>
    </Card>
  );
}