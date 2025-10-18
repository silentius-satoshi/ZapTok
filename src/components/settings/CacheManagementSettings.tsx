import React, { useState } from 'react';
import { 
  RefreshCw, 
  Trash2, 
  Database,
  HardDrive,
  Archive,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DebugSection } from '@/components/debug/DebugSection';
import { useVideoCache } from '@/hooks/useVideoCache';
import { clearCashuStoreCache } from '@/stores/userCashuStore';
import { useCacheSize } from '@/hooks/useCacheSize';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface CacheManagementSettingsProps {
  className?: string;
}

export function CacheManagementSettings({ className }: CacheManagementSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingSpecific, setIsClearingSpecific] = useState<string | null>(null);

  const { cleanCache } = useVideoCache();
  const { breakdown, isLoading: isCacheLoading, formatSize, refresh: refreshCacheSize } = useCacheSize();
  const isMobile = useIsMobile();

  // Calculate total cache size
  const totalSize = Object.values(breakdown).reduce((sum, size) => sum + size, 0);

  // Refresh all caches
  const handleRefreshCache = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Clear and refresh service worker caches
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => 
            caches.open(cacheName).then(cache => {
              console.log(`🔄 Refreshing cache: ${cacheName}`);
            })
          )
        );
      }

      // Refresh cache size calculations
      await refreshCacheSize();
      console.log('✅ Cache refresh completed');
    } catch (error) {
      console.error('❌ Cache refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Clear all caches
  const handleClearAllCache = async () => {
    if (isClearing) return;
    
    setIsClearing(true);
    try {
      // Clear IndexedDB video cache
      await cleanCache();
      
      // Clear Cashu store cache
      clearCashuStoreCache();
      
      // Clear service worker caches
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }
      
      // Clear localStorage (except for essential settings)
      const keysToPreserve = ['nostr:login', 'nostr:relay-url', 'app:theme'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToPreserve.some(preserve => key.startsWith(preserve))) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('🗑️ All caches cleared successfully');
      
      // Refresh cache size calculations after clearing
      await refreshCacheSize();
    } catch (error) {
      console.error('❌ Cache clearing failed:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Clear specific cache type
  const handleClearSpecificCache = async (cacheType: string) => {
    if (isClearingSpecific) return;
    
    setIsClearingSpecific(cacheType);
    try {
      switch (cacheType) {
        case 'video':
          await cleanCache();
          console.log('🗑️ Video cache cleared');
          break;
        case 'cashu':
          clearCashuStoreCache();
          console.log('🗑️ Cashu store cache cleared');
          break;
        case 'serviceworker':
          if ('serviceWorker' in navigator && 'caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
            console.log('🗑️ Service Worker caches cleared');
          }
          break;
      }
      
      // Refresh cache size calculations
      await refreshCacheSize();
    } catch (error) {
      console.error(`❌ ${cacheType} cache clearing failed:`, error);
    } finally {
      setIsClearingSpecific(null);
    }
  };

  // Force cache refresh and reload
  const handleForceRefreshAndReload = async () => {
    try {
      // Clear all caches first
      await handleClearAllCache();
      
      // Force reload the page
      window.location.reload();
    } catch (error) {
      console.error('❌ Force refresh and reload failed:', error);
    }
  };

  // Generate data for copy functionality
  const debugData = {
    timestamp: new Date().toISOString(),
    totalSize: formatSize(totalSize),
    breakdown: {
      videoCache: formatSize(breakdown.videoCache),
      profileImages: formatSize(breakdown.profileImages),
      appResources: formatSize(breakdown.appResources),
      cashuData: formatSize(breakdown.other),
    }
  };

  return (
    <DebugSection
      title="Cache Management"
      icon={<Database className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      copyData={debugData}
      className={className}
    >
      <div className="space-y-6">
        {/* Cache Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Cache Overview
            </CardTitle>
            <CardDescription>
              Monitor and manage application cache usage
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
          {/* Total Cache Size */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Total Cache Size</p>
              <p className="text-sm text-muted-foreground">All cached data combined</p>
            </div>
            <Badge variant="outline" className="font-mono">
              {isCacheLoading ? 'Loading...' : formatSize(totalSize)}
            </Badge>
          </div>

          {/* Cache Breakdown */}
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-blue-500" />
                <span>Video Cache</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {isCacheLoading ? 'Loading...' : formatSize(breakdown.videoCache)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleClearSpecificCache('video')}
                  disabled={isClearingSpecific === 'video'}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-green-500" />
                <span>Profile Images</span>
              </div>
              <Badge variant="secondary">
                {isCacheLoading ? 'Loading...' : formatSize(breakdown.profileImages)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-purple-500" />
                <span>App Resources</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {isCacheLoading ? 'Loading...' : formatSize(breakdown.appResources)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleClearSpecificCache('serviceworker')}
                  disabled={isClearingSpecific === 'serviceworker'}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-orange-500" />
                <span>Cashu Data</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {isCacheLoading ? 'Loading...' : formatSize(breakdown.other)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleClearSpecificCache('cashu')}
                  disabled={isClearingSpecific === 'cashu'}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>
            Refresh, clear, or reset application cache
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {/* Refresh Cache */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleRefreshCache}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Cache'}
              </Button>
            </div>

            <Separator />

            {/* Clear Actions */}
            <div className="grid gap-2">
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleClearAllCache}
                disabled={isClearing}
              >
                <Trash2 className={`h-4 w-4 mr-2 ${isClearing ? 'animate-pulse' : ''}`} />
                {isClearing ? 'Clearing All...' : 'Clear All Cache'}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                onClick={handleForceRefreshAndReload}
                disabled={isClearing}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Cache Refresh & Reload
              </Button>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Clear All Cache</strong> removes all cached data but preserves login, theme, and relay settings.
              <br />
              <strong>Force Refresh & Reload</strong> clears cache and immediately reloads the application.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      </div>
    </DebugSection>
  );
}
