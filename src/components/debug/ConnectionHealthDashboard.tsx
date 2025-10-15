import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useNostrConnectionState } from '@/components/NostrProvider';
import { relayHealthMonitor } from '@/services/relayHealthMonitor';
import { connectionPoolManager } from '@/services/connectionPoolManager';

interface RelayHealthDisplay {
  url: string;
  metrics: {
    healthScore: number;
    latency: number;
    successRate: number;
    totalRequests: number;
    isHealthy: boolean;
    uptime: number;
  };
}

export function ConnectionHealthDashboard() {
  const { activeRelays, getConnectionStats, getRelayHealth } = useNostrConnectionState();
  const [relayData, setRelayData] = useState<RelayHealthDisplay[]>([]);
  const [connectionStats, setConnectionStats] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);

  // Update relay health data
  useEffect(() => {
    const updateData = () => {
      const data: RelayHealthDisplay[] = activeRelays.map(url => {
        const metrics = relayHealthMonitor.getMetrics(url);
        return {
          url,
          metrics: metrics || {
            healthScore: 0,
            latency: 0,
            successRate: 0,
            totalRequests: 0,
            isHealthy: false,
            uptime: 0,
          },
        };
      });

      setRelayData(data);
      setConnectionStats(getConnectionStats());
    };

    updateData();
    const interval = setInterval(updateData, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [activeRelays, getConnectionStats]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          📊 Health Dashboard
        </Button>
      </div>
    );
  }

  const getHealthBadgeVariant = (score: number) => {
    if (score >= 0.7) return 'default'; // Healthy (green)
    if (score >= 0.4) return 'secondary'; // Degraded (yellow)
    return 'destructive'; // Unhealthy (red)
  };

  const getHealthStatus = (score: number) => {
    if (score >= 0.7) return 'Healthy';
    if (score >= 0.4) return 'Degraded';
    return 'Unhealthy';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-auto">
      <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Connection Health</CardTitle>
              <CardDescription>Phase 2 Performance Monitor</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Connection Pool Stats */}
          <div>
            <h4 className="text-sm font-medium mb-2">Connection Pool</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-1 font-medium">{connectionStats.pool?.totalConnections || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Active:</span>
                <span className="ml-1 font-medium">{connectionStats.pool?.activeConnections || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Healthy:</span>
                <span className="ml-1 font-medium text-green-600">{connectionStats.health?.healthy || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Unhealthy:</span>
                <span className="ml-1 font-medium text-red-600">{connectionStats.health?.unhealthy || 0}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Relay Health Details */}
          <div>
            <h4 className="text-sm font-medium mb-3">Relay Health</h4>
            <div className="space-y-3">
              {relayData.map(({ url, metrics }) => (
                <div key={url} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate max-w-32">
                        {new URL(url).hostname}
                      </span>
                      <Badge 
                        variant={getHealthBadgeVariant(metrics.healthScore)}
                        className="text-xs px-1 py-0"
                      >
                        {getHealthStatus(metrics.healthScore)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(metrics.healthScore * 100)}%
                    </span>
                  </div>

                  <Progress 
                    value={metrics.healthScore * 100} 
                    className="h-1.5"
                  />

                  <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                    <div>
                      <span>Latency:</span>
                      <span className="ml-1 font-medium">
                        {metrics.latency > 0 ? `${Math.round(metrics.latency)}ms` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span>Success:</span>
                      <span className="ml-1 font-medium">
                        {Math.round(metrics.successRate * 100)}%
                      </span>
                    </div>
                    <div>
                      <span>Requests:</span>
                      <span className="ml-1 font-medium">{metrics.totalRequests}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Health Summary */}
          <Separator />
          <div className="text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Phase 2 Optimization</span>
              <span className="text-green-600">Active</span>
            </div>
            <div className="mt-1 text-[10px]">
              Health-aware relay selection • Connection pooling • Adaptive timeouts
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}