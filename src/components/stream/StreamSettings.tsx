import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  User, 
  Key, 
  Bell,
  Shield,
  Wallet,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useZapStreamAPI } from '@/hooks/useZapStreamAPI';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';

export function StreamSettings() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { useAccountInfo, useUpdateAccount } = useZapStreamAPI();

  const { data: accountInfo, isLoading } = useAccountInfo();
  const updateAccount = useUpdateAccount();

  const [notifications, setNotifications] = useState({
    streamStart: true,
    newFollowers: true,
    donations: true,
    chatMessages: false,
  });

  const handleAcceptTOS = async () => {
    try {
      await updateAccount.mutateAsync({ accept_tos: true });
      toast({
        title: 'Terms Accepted',
        description: 'Terms of Service have been accepted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept terms',
        variant: 'destructive',
      });
    }
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    toast({
      title: 'Notification Settings Updated',
      description: `${key} notifications ${value ? 'enabled' : 'disabled'}`,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-500" />
            <span>Stream Settings</span>
          </CardTitle>
          <CardDescription>
            Manage your streaming account and preferences
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gray-900">
          <TabsTrigger value="account">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="streaming">
            <Key className="w-4 h-4 mr-2" />
            Streaming
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing">
            <Wallet className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">Account Information</CardTitle>
              <CardDescription>Your Nostr identity and zap.stream account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nostr Public Key</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={user?.pubkey || ''}
                    readOnly
                    className="bg-gray-800 border-gray-700 font-mono text-sm"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(user?.pubkey || '');
                      toast({ title: 'Copied!', description: 'Public key copied to clipboard' });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {accountInfo && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Account Balance</Label>
                      <div className="text-2xl font-bold text-green-400">{accountInfo.balance} sats</div>
                    </div>
                    <div>
                      <Label>Account Status</Label>
                      <div className={`text-sm font-medium ${accountInfo.tos.accepted ? 'text-green-400' : 'text-yellow-400'}`}>
                        {accountInfo.tos.accepted ? 'Active' : 'Pending TOS Acceptance'}
                      </div>
                    </div>
                  </div>

                  {!accountInfo.tos.accepted && (
                    <Alert className="bg-yellow-950 border-yellow-800">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <AlertDescription className="text-yellow-100">
                        <div className="flex items-center justify-between">
                          <span>
                            Please accept the{' '}
                            <a href={accountInfo.tos.link} target="_blank" rel="noopener noreferrer" className="underline">
                              Terms of Service
                            </a>{' '}
                            to use all streaming features.
                          </span>
                          <Button 
                            onClick={handleAcceptTOS}
                            disabled={updateAccount.isPending}
                            size="sm" 
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            {updateAccount.isPending ? 'Processing...' : 'Accept Terms'}
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Access */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">API Access</CardTitle>
              <CardDescription>Manage your zap.stream API credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-950 border-blue-800">
                <Shield className="w-4 h-4 text-blue-400" />
                <AlertDescription className="text-blue-100">
                  Your API access is authenticated using NIP-98 HTTP Auth with your Nostr keys. 
                  No separate API keys are required.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <Input
                  value="https://api.zap.stream/api/v1"
                  readOnly
                  className="bg-gray-800 border-gray-700 font-mono text-sm"
                />
              </div>

              <div className="flex items-center space-x-4">
                <Button variant="outline" asChild>
                  <a href="https://zap.stream/docs" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    API Documentation
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Streaming Tab */}
        <TabsContent value="streaming" className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">Streaming Configuration</CardTitle>
              <CardDescription>Configure your streaming settings and endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>RTMP Ingest URL</Label>
                <Input
                  value="rtmp://ingest.zap.stream/live/"
                  readOnly
                  className="bg-gray-800 border-gray-700 font-mono text-sm"
                />
              </div>

              <Alert className="bg-purple-950 border-purple-800">
                <Key className="w-4 h-4 text-purple-400" />
                <AlertDescription className="text-purple-100">
                  <strong>How to stream:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                    <li>Create a new stream in the "Create Stream" tab to get a unique stream key</li>
                    <li>Configure your streaming software (OBS, Streamlabs, etc.) with the RTMP URL above</li>
                    <li>Use your generated stream key as the Stream Key in your software</li>
                    <li>Start streaming and your stream will be published to the Nostr network</li>
                  </ol>
                </AlertDescription>
              </Alert>

              {accountInfo?.endpoints && accountInfo.endpoints.length > 0 && (
                <div className="space-y-2">
                  <Label>Available Endpoints</Label>
                  <div className="space-y-2">
                    {accountInfo.endpoints.map((endpoint, index) => (
                      <div key={index} className="p-3 bg-gray-800 rounded border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{endpoint.name}</div>
                            <div className="text-sm text-gray-400">{endpoint.url}</div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {endpoint.cost.rate} {endpoint.cost.unit}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Capabilities: {endpoint.capabilities.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stream Quality Settings */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">Recommended Settings</CardTitle>
              <CardDescription>Optimal streaming settings for zap.stream</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400">Video Bitrate</Label>
                    <div className="font-medium">2000-6000 kbps</div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Audio Bitrate</Label>
                    <div className="font-medium">128-320 kbps</div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Frame Rate</Label>
                    <div className="font-medium">30 fps (60 fps for gaming)</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400">Video Codec</Label>
                    <div className="font-medium">H.264 (x264)</div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Audio Codec</Label>
                    <div className="font-medium">AAC</div>
                  </div>
                  <div>
                    <Label className="text-gray-400">Keyframe Interval</Label>
                    <div className="font-medium">2 seconds</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you'd like to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-950 border-blue-800">
                <Bell className="w-4 h-4 text-blue-400" />
                <AlertDescription className="text-blue-100">
                  Notifications are currently handled by your browser and Nostr client. 
                  These settings control local preferences only.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </Label>
                      <div className="text-sm text-gray-400">
                        {key === 'streamStart' && 'Get notified when your streams go live'}
                        {key === 'newFollowers' && 'Get notified when someone follows you'}
                        {key === 'donations' && 'Get notified when you receive zaps or donations'}
                        {key === 'chatMessages' && 'Get notified for new chat messages during streams'}
                      </div>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => handleNotificationChange(key, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">Billing & Usage</CardTitle>
              <CardDescription>Manage your account balance and view usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {accountInfo && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-800 rounded border border-gray-700">
                      <div className="text-2xl font-bold text-green-400">{accountInfo.balance}</div>
                      <div className="text-sm text-gray-400">Current Balance (sats)</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800 rounded border border-gray-700">
                      <div className="text-2xl font-bold text-purple-400">{accountInfo.forwards.length}</div>
                      <div className="text-sm text-gray-400">Payment Forwards</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800 rounded border border-gray-700">
                      <div className="text-2xl font-bold text-blue-400">
                        {accountInfo.endpoints.length}
                      </div>
                      <div className="text-sm text-gray-400">Available Endpoints</div>
                    </div>
                  </div>

                  <Alert className="bg-green-950 border-green-800">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <AlertDescription className="text-green-100">
                      Your account is active and ready for streaming. Add more funds in the Dashboard when needed.
                    </AlertDescription>
                  </Alert>

                  {accountInfo.forwards.length > 0 && (
                    <div className="space-y-2">
                      <Label>Payment Forwards</Label>
                      <div className="space-y-2">
                        {accountInfo.forwards.map((forward) => (
                          <div key={forward.id} className="p-3 bg-gray-800 rounded border border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{forward.name}</div>
                              <div className="text-sm text-gray-400">ID: {forward.id}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center space-x-4">
                <Button variant="outline" asChild>
                  <a href="https://zap.stream/billing" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Full Billing
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
