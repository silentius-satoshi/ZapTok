import React from 'react';
import {
  Bell,
  RefreshCw,
  Download,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { usePWA } from '@/hooks/usePWA';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useIsMobile } from '@/hooks/useIsMobile';

interface PWAActionsProps {
  className?: string;
}

export function PWAActions({ className }: PWAActionsProps) {
  const {
    isInstallable,
    hasUpdate,
    installPWA,
    updateServiceWorker,
  } = usePWA();

  const {
    permission,
    isSupported: pushSupported,
    subscribeToPush,
    sendTestNotification,
    requestPermission,
  } = usePushNotifications();

  const isMobile = useIsMobile();

  const triggerManualInstall = async () => {
    try {
      await installPWA();
    } catch (error) {
      console.error('[PWA] Manual install failed:', error);
    }
  };

  const forceCacheRefresh = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear service worker cache and reload
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      }
      
      // Force reload
      window.location.reload();
    } catch (error) {
      console.error('[PWA] Cache refresh failed:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className={isMobile ? 'pb-3' : ''}>
        <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : ''}`}>
          <Wrench className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
          PWA Actions
        </CardTitle>
        <CardDescription className={isMobile ? 'text-xs' : ''}>
          Manual controls for testing and debugging PWA functionality
        </CardDescription>
      </CardHeader>
      <CardContent className={`space-y-4 ${isMobile ? 'space-y-3 pt-0' : ''}`}>
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>Installation</h4>
            <div className="flex gap-2">
              <Button
                onClick={triggerManualInstall}
                disabled={!isInstallable}
                variant="outline"
                size="sm"
                className={isMobile ? 'text-xs' : ''}
              >
                <Download className={`${isMobile ? 'w-3 h-3 mr-2' : 'w-4 h-4 mr-2'}`} />
                Trigger Install
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>Service Worker</h4>
            <div className="flex gap-2">
              <Button
                onClick={updateServiceWorker}
                disabled={!hasUpdate}
                variant="outline"
                size="sm"
                className={isMobile ? 'text-xs' : ''}
              >
                <RefreshCw className={`${isMobile ? 'w-3 h-3 mr-2' : 'w-4 h-4 mr-2'}`} />
                Update Service Worker
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>Push Notifications</h4>
            <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
              <Button
                onClick={requestPermission}
                disabled={permission === 'granted'}
                variant="outline"
                size="sm"
                className={`${isMobile ? 'text-xs w-full' : ''}`}
              >
                <Bell className={`${isMobile ? 'w-3 h-3 mr-2' : 'w-4 h-4 mr-2'}`} />
                Request Permission
              </Button>
              <Button
                onClick={subscribeToPush}
                disabled={!pushSupported || permission !== 'granted'}
                variant="outline"
                size="sm"
                className={`${isMobile ? 'text-xs w-full' : ''}`}
              >
                <Bell className={`${isMobile ? 'w-3 h-3 mr-2' : 'w-4 h-4 mr-2'}`} />
                Subscribe to Push
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>Cache Management</h4>
            <Alert>
              <AlertCircle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              <AlertDescription className={isMobile ? 'text-xs' : ''}>
                Warning: This will clear all cached data and reload the page.
              </AlertDescription>
            </Alert>
            <Button
              onClick={forceCacheRefresh}
              variant="destructive"
              size="sm"
              className={`${isMobile ? 'text-xs w-full' : ''}`}
            >
              <RefreshCw className={`${isMobile ? 'w-3 h-3 mr-2' : 'w-4 h-4 mr-2'}`} />
              Force Cache Refresh & Reload
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
