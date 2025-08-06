import React from 'react';
import { 
  Settings, 
  Bell, 
  BellOff, 
  Download, 
  Trash2, 
  RefreshCw,
  Smartphone,
  WifiOff,
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
import { usePWA } from '@/hooks/usePWA';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { PWAStatusIndicator, PWACapabilityCheck } from '@/components/PWAStatusIndicator';
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

      {/* Push Notifications */}
      <Card>
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
              <Badge variant="secondary">~50MB</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Profile images</span>
              <Badge variant="secondary">~5MB</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>App resources</span>
              <Badge variant="secondary">~2MB</Badge>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Cache
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
