import React from 'react';
import { 
  Bell, 
  BellOff, 
  Zap,
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
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface PushNotificationsProps {
  className?: string;
}

export function PushNotifications({ className }: PushNotificationsProps) {
  const {
    permission,
    isSupported: pushSupported,
    isSubscribed,
    isSubscribing,
    error: pushError,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    clearError,
  } = usePushNotifications();

  const [notificationSettings, setNotificationSettings] = React.useState({
    lightningPayments: true,
    cashuTokens: true,
    zaps: true,
    comments: true,
    follows: false,
    reposts: false,
  });

  const handleNotificationToggle = async (enabled: boolean) => {
    clearError();
    
    if (enabled) {
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return;
      }
      await subscribeToPush();
    } else {
      await unsubscribeFromPush();
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
    } catch (error) {
      console.error('[PWA] Test notification failed:', error);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Real-time alerts for Lightning payments and app activity
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!pushSupported && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported in this browser.
            </AlertDescription>
          </Alert>
        )}
        
        {pushSupported && (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="notifications-enabled" className="text-sm font-medium">
                  Enable Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about payments, zaps, and activity
                </p>
              </div>
              <div className="flex items-center gap-2">
                {permission === 'granted' && isSubscribed && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
                <Switch
                  id="notifications-enabled"
                  checked={isSubscribed}
                  onCheckedChange={handleNotificationToggle}
                  disabled={isSubscribing}
                />
              </div>
            </div>
            
            {pushError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{pushError}</AlertDescription>
              </Alert>
            )}
            
            {isSubscribed && (
              <>
                <Separator />
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Notification Types</Label>
                  
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-600" />
                        <div>
                          <Label className="text-sm">Lightning Payments</Label>
                          <p className="text-xs text-muted-foreground">
                            Incoming sats and payment confirmations
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.lightningPayments}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({
                            ...prev,
                            lightningPayments: checked
                          }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-amber-600 flex items-center justify-center text-xs text-white">
                          🥜
                        </div>
                        <div>
                          <Label className="text-sm">Cashu Tokens</Label>
                          <p className="text-xs text-muted-foreground">
                            New tokens and redemption alerts
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.cashuTokens}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({
                            ...prev,
                            cashuTokens: checked
                          }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <div>
                          <Label className="text-sm">Zaps</Label>
                          <p className="text-xs text-muted-foreground">
                            Zaps received on your content
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.zaps}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({
                            ...prev,
                            zaps: checked
                          }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">
                          💬
                        </div>
                        <div>
                          <Label className="text-sm">Comments</Label>
                          <p className="text-xs text-muted-foreground">
                            New comments on your videos
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notificationSettings.comments}
                        onCheckedChange={(checked) =>
                          setNotificationSettings(prev => ({
                            ...prev,
                            comments: checked
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestNotification}
                    className="flex-1"
                  >
                    Send Test
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => unsubscribeFromPush()}
                    className="text-destructive hover:text-destructive"
                  >
                    <BellOff className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
