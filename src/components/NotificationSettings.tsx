import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function NotificationSettings() {
  const {
    permission,
    isSupported,
    isSubscribed,
    isSubscribing,
    error,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    clearError,
  } = usePushNotifications();

  const { toast } = useToast();

  const handleToggleNotifications = async () => {
    clearError();
    
    if (isSubscribed) {
      const success = await unsubscribeFromPush();
      if (success) {
        toast({
          title: 'Notifications Disabled',
          description: 'You will no longer receive push notifications',
        });
      }
    } else {
      const success = await subscribeToPush();
      if (success) {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications for zaps, comments, and more',
        });
      }
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      toast({
        title: 'Test Sent',
        description: 'Check your notifications!',
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To receive push notifications, please use a modern browser like Chrome, Firefox, or Safari 16.4+
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about zaps, comments, follows, and more
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="font-medium">Status</p>
            <p className="text-sm text-muted-foreground">
              {permission === 'granted' ? (
                isSubscribed ? (
                  <span className="text-green-500">✓ Enabled</span>
                ) : (
                  <span className="text-yellow-500">Permission granted, not subscribed</span>
                )
              ) : permission === 'denied' ? (
                <span className="text-red-500">Permission denied</span>
              ) : (
                <span className="text-gray-500">Not enabled</span>
              )}
            </p>
          </div>
          {isSubscribed ? (
            <BellOff className="w-8 h-8 text-muted-foreground" />
          ) : (
            <Bell className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Permission Denied Help */}
        {permission === 'denied' && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              You've blocked notifications. To enable them, click the lock icon in your browser's address bar and allow notifications.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleToggleNotifications}
            disabled={isSubscribing || permission === 'denied'}
            className="flex-1"
            variant={isSubscribed ? "outline" : "default"}
          >
            {isSubscribing ? (
              'Processing...'
            ) : isSubscribed ? (
              <>
                <BellOff className="w-4 h-4 mr-2" />
                Disable Notifications
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>

          {isSubscribed && (
            <Button
              onClick={handleTestNotification}
              variant="secondary"
              className="flex-1 sm:flex-initial"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Send Test
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>You'll receive notifications for:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>⚡ Lightning payments and zaps</li>
            <li>🥜 Cashu token receipts</li>
            <li>💬 Comments on your videos</li>
            <li>👤 New followers</li>
            <li>🔄 Reposts of your content</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
