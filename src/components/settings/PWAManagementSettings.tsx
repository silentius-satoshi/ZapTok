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
import { DebugSection } from '@/components/debug/DebugSection';
import { usePWA } from '@/hooks/usePWA';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface PWAManagementSettingsProps {
  className?: string;
}

export function PWAManagementSettings({ className }: PWAManagementSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  // Generate data for copy functionality
  const debugData = {
    timestamp: new Date().toISOString(),
    status: {
      isInstalled,
      isStandalone,
      isInstallable,
      isOnline,
      hasUpdate,
    }
  };

  return (
    <DebugSection
      title="PWA Management"
      icon={<Smartphone className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      copyData={debugData}
      className={className}
    >
      <div className="space-y-6">
        {/* PWA Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
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
      </div>
    </DebugSection>
  );
}
