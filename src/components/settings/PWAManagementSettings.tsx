import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  RefreshCw,
  CheckCircle2,
  WifiOff,
  Bell,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { usePWA } from '@/hooks/usePWA';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface PWAManagementSettingsProps {
  className?: string;
}

export function PWAManagementSettings({ className }: PWAManagementSettingsProps) {
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

  const {
    permission,
    isSupported: pushSupported,
    subscribeToPush,
    requestPermission,
  } = usePushNotifications();

  const isMobile = useIsMobile();

  const handleInstall = async () => {
    try {
      await installPWA();
    } catch (error) {
      console.error('[PWA] Install failed:', error);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateServiceWorker();
    } catch (error) {
      console.error('[PWA] Update failed:', error);
    }
  };

  const handleNotificationPermission = async () => {
    try {
      await requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('[PWA] Notification setup failed:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* PWA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            PWA Status
          </CardTitle>
          <CardDescription>
            Progressive Web App installation and status
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Current Status</p>
              <p className="text-xs text-muted-foreground">
                {isStandalone ? 'Running as installed app' : 'Running in browser'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isInstalled ? (
                <Badge variant="default" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {isStandalone ? 'PWA Active' : 'Installed'}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Browser Mode
                </Badge>
              )}
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Connection</p>
              <p className="text-xs text-muted-foreground">
                Network connectivity status
              </p>
            </div>
            <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>

          {/* Offline Status Alert */}
          {!isOnline && (
            <Alert>
              <WifiOff className="h-4 w-4" />
              <AlertDescription>
                You're offline. Some features may be limited, but cached content is still available.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* PWA Actions */}
      <Card>
        <CardHeader>
          <CardTitle>PWA Management</CardTitle>
          <CardDescription>
            Install, update, and configure PWA features
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
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

            {/* Already Installed Message */}
            {isInstalled && !hasUpdate && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">PWA Installed</p>
                    <p className="text-xs text-muted-foreground">
                      You're using the optimized app experience
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Configure push notification preferences
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {pushSupported ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Notification Status</p>
                  <p className="text-xs text-muted-foreground">
                    Current permission level
                  </p>
                </div>
                <Badge 
                  variant={
                    permission === 'granted' ? 'default' : 
                    permission === 'denied' ? 'destructive' : 
                    'secondary'
                  }
                  className="text-xs"
                >
                  {permission === 'granted' ? 'Enabled' : 
                   permission === 'denied' ? 'Blocked' : 
                   'Not Set'}
                </Badge>
              </div>

              {permission !== 'granted' && permission !== 'denied' && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleNotificationPermission}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </Button>
              )}

              {permission === 'denied' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Notifications are blocked. To enable them, please allow notifications in your browser settings.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Push notifications are not supported in this browser or environment.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* PWA Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            Learn more about PWA features and benefits
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>PWA Benefits Guide</span>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Offline Features Help</span>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Installation Troubleshooting</span>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
