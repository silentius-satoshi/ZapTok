import { useUserTrust } from '@/providers/UserTrustProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, Users } from 'lucide-react';

export function WebOfTrustSettings() {
  const {
    isUserTrusted,
    hideUntrustedInteractions,
    setHideUntrustedInteractions,
    hideUntrustedNotifications,
    setHideUntrustedNotifications,
    hideUntrustedNotes,
    setHideUntrustedNotes,
    isInitializing,
    trustedCount,
  } = useUserTrust();

  return (
    <div className="space-y-6">
      {/* WoT Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Trust Network Status
          </CardTitle>
          <CardDescription>
            Your Web of Trust includes people you follow and people they follow (2 degrees)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {isInitializing ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Building your trust network...</p>
                  <p className="text-xs text-muted-foreground">This may take a minute</p>
                </div>
              </>
            ) : (
              <>
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{trustedCount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Trusted users</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert>
        <AlertDescription>
          <strong>How it works:</strong> Trusted users include people you follow and people they follow. 
          This creates a 2-degree social graph that helps filter spam and low-quality content.
        </AlertDescription>
      </Alert>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Controls</CardTitle>
          <CardDescription>
            Choose what content to hide from users outside your Web of Trust
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hide Untrusted Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hide-untrusted-notifications" className="text-base">
                Hide Untrusted Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Only show notifications from people in your Web of Trust
              </p>
            </div>
            <Switch
              id="hide-untrusted-notifications"
              checked={hideUntrustedNotifications}
              onCheckedChange={setHideUntrustedNotifications}
            />
          </div>

          {/* Hide Untrusted Interactions */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hide-untrusted-interactions" className="text-base">
                Hide Untrusted Interactions
              </Label>
              <p className="text-sm text-muted-foreground">
                Hide likes, replies, and reposts from untrusted users
              </p>
            </div>
            <Switch
              id="hide-untrusted-interactions"
              checked={hideUntrustedInteractions}
              onCheckedChange={setHideUntrustedInteractions}
            />
          </div>

          {/* Hide Untrusted Notes */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hide-untrusted-notes" className="text-base">
                Hide Untrusted Posts
              </Label>
              <p className="text-sm text-muted-foreground">
                Only show posts from people in your Web of Trust in your feed
              </p>
            </div>
            <Switch
              id="hide-untrusted-notes"
              checked={hideUntrustedNotes}
              onCheckedChange={setHideUntrustedNotes}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Alert>
        <AlertDescription className="text-xs">
          <strong>Privacy:</strong> Your Web of Trust is calculated locally in your browser. 
          No data is sent to any server. The trust network updates automatically when you follow or unfollow users.
        </AlertDescription>
      </Alert>
    </div>
  );
}
