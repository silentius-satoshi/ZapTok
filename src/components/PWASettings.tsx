import React, { useState } from 'react';
import { 
  Settings, 
  Download, 
  Trash2, 
  RefreshCw,
  Smartphone,
  WifiOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePWA } from '@/hooks/usePWA';
import { PWAStatusIndicator, PWACapabilityCheck } from '@/components/PWAStatusIndicator';
import { useVideoCache } from '@/hooks/useVideoCache';
import { useCaching } from '@/contexts/CachingContext';
import { clearCashuStoreCache } from '@/stores/userCashuStore';
import { useCacheSize } from '@/hooks/useCacheSize';
import { cn } from '@/lib/utils';

interface PWASettingsProps {
  className?: string;
  showAdvanced?: boolean;
}

export function PWASettings({ className, showAdvanced = false }: PWASettingsProps) {
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isOnline,
    hasUpdate,
    installPWA,
    updateServiceWorker,
    dismissInstallPrompt,
  } = usePWA();
  
  const { cleanCache } = useVideoCache();
  const { disconnectCachingService } = useCaching();
  const { breakdown, isLoading, formatSize, refresh: refreshCacheSize } = useCacheSize();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleInstall = async () => {
    await installPWA();
  };

  const handleUpdate = async () => {
    try {
      await updateServiceWorker();
    } catch (error) {
      console.error('[PWA] Update failed:', error);
    }
  };

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
      
      // Disconnect from caching services
      disconnectCachingService();
      
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* PWA Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            PWA Status
          </CardTitle>
          <CardDescription>
            Progressive Web App installation and features
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Current Status</Label>
              <p className="text-xs text-muted-foreground">
                {isStandalone ? 'Running as installed app' : 'Running in browser'}
              </p>
            </div>
            <PWAStatusIndicator variant="badge" />
          </div>
          
          <div className="grid gap-3">
            {/* Installation */}
            {isInstallable && !isInstalled && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Download className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Install ZapTok</p>
                    <p className="text-xs text-muted-foreground">
                      Get the native app experience
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleInstall}>
                    Install
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissInstallPrompt}>
                    Later
                  </Button>
                </div>
              </div>
            )}
            
            {/* Update Available */}
            {hasUpdate && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Update Available</p>
                    <p className="text-xs text-muted-foreground">
                      New features and improvements
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={handleUpdate}>
                  Update
                </Button>
              </div>
            )}
            
            {/* Offline Status */}
            {!isOnline && (
              <Alert>
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  You're offline. Some features may be limited, but cached content is still available.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced PWA Information */}
      {showAdvanced && (
        <PWACapabilityCheck />
      )}

      {/* Storage and Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Storage & Cache
          </CardTitle>
          <CardDescription>
            Manage offline content and app data
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Offline video cache</span>
              <Badge variant="secondary">
                {isLoading ? 'Loading...' : formatSize(breakdown.videoCache)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Profile images</span>
              <Badge variant="secondary">
                {isLoading ? 'Loading...' : formatSize(breakdown.profileImages)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>App resources</span>
              <Badge variant="secondary">
                {isLoading ? 'Loading...' : formatSize(breakdown.appResources)}
              </Badge>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={handleRefreshCache}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Cache'}
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              className="flex-1"
              onClick={handleClearAllCache}
              disabled={isClearing}
            >
              <Trash2 className={`h-4 w-4 mr-2 ${isClearing ? 'animate-pulse' : ''}`} />
              {isClearing ? 'Clearing...' : 'Clear All'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
