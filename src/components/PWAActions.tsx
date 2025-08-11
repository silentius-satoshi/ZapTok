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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          PWA Actions
        </CardTitle>
        <CardDescription>
          Manual controls for testing and debugging PWA functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Installation</h4>
            <div className="flex gap-2">
              <Button
                onClick={triggerManualInstall}
                disabled={!isInstallable}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Trigger Install
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Service Worker</h4>
            <div className="flex gap-2">
              <Button
                onClick={updateServiceWorker}
                disabled={!hasUpdate}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Service Worker
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Push Notifications</h4>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={requestPermission}
                disabled={permission === 'granted'}
                variant="outline"
                size="sm"
              >
                <Bell className="w-4 h-4 mr-2" />
                Request Permission
              </Button>
              <Button
                onClick={subscribeToPush}
                disabled={!pushSupported || permission !== 'granted'}
                variant="outline"
                size="sm"
              >
                <Bell className="w-4 h-4 mr-2" />
                Subscribe to Push
              </Button>
              <Button
                onClick={sendTestNotification}
                disabled={permission !== 'granted'}
                variant="outline"
                size="sm"
              >
                <Bell className="w-4 h-4 mr-2" />
                Send Test Notification
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Cache Management</h4>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Warning: This will clear all cached data and reload the page.
              </AlertDescription>
            </Alert>
            <Button
              onClick={forceCacheRefresh}
              variant="destructive"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Force Cache Refresh & Reload
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
