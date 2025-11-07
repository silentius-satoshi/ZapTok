import React, { useState } from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DebugSection } from '@/components/debug/DebugSection';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface PushNotificationsSettingsProps {
  className?: string;
}

export function PushNotificationsSettings({ className }: PushNotificationsSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    permission,
    isSupported: pushSupported,
    subscribeToPush,
    requestPermission,
  } = usePushNotifications();

  const isMobile = useIsMobile();

  const handleNotificationPermission = async () => {
    try {
      await requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('[Notifications] Setup failed:', error);
    }
  };

  // Generate data for copy functionality
  const debugData = {
    timestamp: new Date().toISOString(),
    notifications: {
      supported: pushSupported,
      permission,
    }
  };

  return (
    <DebugSection
      title="Push Notifications"
      icon={<Bell className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      className={className}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Notification Settings
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
      </div>
    </DebugSection>
  );
}
