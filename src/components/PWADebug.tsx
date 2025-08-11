import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Smartphone,
  Bell,
  Wifi,
  Download,
  RefreshCw,
  Settings,
  Eye,
  Play,
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { usePWA } from '@/hooks/usePWA';
import { usePushNotifications, showLocalNotification } from '@/hooks/usePushNotifications';
import { PWACapabilityCheck } from '@/components/PWAStatusIndicator';

export function PWADebug() {
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isOnline,
    serviceWorkerRegistration,
    hasUpdate,
    installPWA,
    updateServiceWorker,
  } = usePWA();

  const {
    permission,
    isSupported: pushSupported,
    isSubscribed,
    subscribeToPush,
    sendTestNotification,
    requestPermission,
  } = usePushNotifications();

  const [testResults, setTestResults] = React.useState<Record<string, any>>({});
  const [isRunningTests, setIsRunningTests] = React.useState(false);
  const [manifestData, setManifestData] = React.useState<any>(null);

  // Fetch manifest data
  React.useEffect(() => {
    fetch('/manifest.webmanifest')
      .then(res => res.json())
      .then(data => setManifestData(data))
      .catch(err => console.error('Failed to fetch manifest:', err));
  }, []);

  // Test Service Worker functionality
  const testServiceWorker = async () => {
    const results: any = {};

    try {
      // Check if service worker is registered
      results.registered = !!serviceWorkerRegistration;
      results.state = serviceWorkerRegistration?.active?.state || 'unknown';

      // Check cache functionality
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        results.cacheNames = cacheNames;
        results.cacheCount = cacheNames.length;

        // Test cache storage
        const testCache = await caches.open('pwa-debug-test');
        await testCache.put('/test', new Response('test'));
        const testResponse = await testCache.match('/test');
        results.cacheWorking = !!testResponse;
        await testCache.delete('/test');
      }

      // Check background sync
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        results.backgroundSyncSupported = true;
      }

    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return results;
  };

  // Test Push Notifications
  const testPushNotifications = async () => {
    const results: any = {};

    try {
      results.supported = pushSupported;
      results.permission = permission;
      results.subscribed = isSubscribed;

      // Test local notification
      if (permission === 'granted') {
        showLocalNotification({
          type: 'zap',
          title: 'PWA Debug Test',
          body: 'Push notifications are working!',
          data: { test: true }
        });
        results.localNotificationSent = true;
      }

    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return results;
  };

  // Test PWA Installation
  const testInstallation = async () => {
    const results: any = {};

    try {
      results.installable = isInstallable;
      results.installed = isInstalled;
      results.standalone = isStandalone;

      // Check display mode
      results.displayMode = window.matchMedia('(display-mode: standalone)').matches
        ? 'standalone'
        : window.matchMedia('(display-mode: fullscreen)').matches
        ? 'fullscreen'
        : window.matchMedia('(display-mode: minimal-ui)').matches
        ? 'minimal-ui'
        : 'browser';

      // Check if beforeinstallprompt event is available
      results.beforeInstallPromptSupported = 'onbeforeinstallprompt' in window;

    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return results;
  };

  // Test Network and Offline functionality
  const testNetwork = async () => {
    const results: any = {};

    try {
      results.online = isOnline;
      results.connectionType = (navigator as any).connection?.effectiveType || 'unknown';
      results.downlink = (navigator as any).connection?.downlink || 'unknown';

      // Test offline cache
      if ('caches' in window) {
        const response = await fetch('/manifest.webmanifest', { cache: 'force-cache' });
        results.offlineCacheWorking = response.ok;
      }

    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return results;
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);

    try {
      const [swResults, pushResults, installResults, networkResults] = await Promise.all([
        testServiceWorker(),
        testPushNotifications(),
        testInstallation(),
        testNetwork(),
      ]);

      setTestResults({
        serviceWorker: swResults,
        pushNotifications: pushResults,
        installation: installResults,
        network: networkResults,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Force cache refresh
  const forceCacheRefresh = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Unregister service worker
      if (serviceWorkerRegistration) {
        await serviceWorkerRegistration.unregister();
      }

      // Force hard reload
      window.location.reload();
    } catch (error) {
      console.error('Cache refresh failed:', error);
    }
  };

  // Manual install trigger
  const triggerManualInstall = async () => {
    try {
      if (isInstallable && installPWA) {
        await installPWA();
      } else {
        alert('PWA is not installable at this time. Check the installation requirements.');
      }
    } catch (error) {
      console.error('Manual install failed:', error);
    }
  };

  const getStatusBadge = (condition: boolean, trueText: string, falseText: string) => (
    <Badge variant={condition ? "default" : "secondary"} className="ml-2">
      {condition ? (
        <CheckCircle2 className="w-3 h-3 mr-1" />
      ) : (
        <XCircle className="w-3 h-3 mr-1" />
      )}
      {condition ? trueText : falseText}
    </Badge>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">PWA Debug Center</h2>
        <p className="text-muted-foreground">
          Comprehensive testing and debugging for Progressive Web App functionality
        </p>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Tests
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="manifest" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Manifest
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                PWA Status Overview
              </CardTitle>
              <CardDescription>
                Current state of Progressive Web App features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Installation Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Installable</span>
                      {getStatusBadge(isInstallable, "Yes", "No")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Installed</span>
                      {getStatusBadge(isInstalled, "Yes", "No")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Standalone Mode</span>
                      {getStatusBadge(isStandalone, "Yes", "No")}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Service Worker</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Registered</span>
                      {getStatusBadge(!!serviceWorkerRegistration, "Yes", "No")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Update Available</span>
                      {getStatusBadge(hasUpdate, "Yes", "No")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>State</span>
                      <Badge variant="outline">
                        {serviceWorkerRegistration?.active?.state || 'unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Push Notifications</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Supported</span>
                      {getStatusBadge(pushSupported, "Yes", "No")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Permission</span>
                      <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
                        {permission}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Subscribed</span>
                      {getStatusBadge(isSubscribed, "Yes", "No")}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Network</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Online</span>
                      {getStatusBadge(isOnline, "Yes", "No")}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Connection</span>
                      <Badge variant="outline">
                        {(navigator as any).connection?.effectiveType || 'unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <PWACapabilityCheck />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                PWA Functionality Tests
              </CardTitle>
              <CardDescription>
                Run comprehensive tests to verify PWA features are working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={runAllTests}
                  disabled={isRunningTests}
                  className="flex items-center gap-2"
                >
                  {isRunningTests ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
                </Button>
              </div>

              {Object.keys(testResults).length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Test Results</h4>
                  <p className="text-sm text-muted-foreground">
                    Last run: {new Date(testResults.timestamp).toLocaleString()}
                  </p>

                  <div className="grid gap-4">
                    {Object.entries(testResults).map(([category, results]) => {
                      if (category === 'timestamp') return null;

                      return (
                        <Card key={category}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg capitalize">
                              {category.replace(/([A-Z])/g, ' $1').trim()}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre className="text-sm bg-muted p-3 rounded overflow-auto">
                              {JSON.stringify(results, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
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
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Update Service Worker
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Push Notifications</h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={requestPermission}
                      disabled={permission === 'granted'}
                      variant="outline"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Request Permission
                    </Button>
                    <Button
                      onClick={subscribeToPush}
                      disabled={!pushSupported || permission !== 'granted'}
                      variant="outline"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Subscribe to Push
                    </Button>
                    <Button
                      onClick={sendTestNotification}
                      disabled={permission !== 'granted'}
                      variant="outline"
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
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Force Cache Refresh & Reload
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manifest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                PWA Manifest
              </CardTitle>
              <CardDescription>
                Current manifest.webmanifest configuration and icon definitions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {manifestData ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">App Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Name:</strong> {manifestData.name}</div>
                      <div><strong>Short Name:</strong> {manifestData.short_name}</div>
                      <div><strong>Version:</strong> {manifestData.version}</div>
                      <div><strong>Theme Color:</strong> {manifestData.theme_color}</div>
                      <div><strong>Background Color:</strong> {manifestData.background_color}</div>
                      <div><strong>Display:</strong> {manifestData.display}</div>
                      <div><strong>Start URL:</strong> {manifestData.start_url}</div>
                      <div><strong>Scope:</strong> {manifestData.scope}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Icons ({manifestData.icons?.length || 0})</h4>
                    <div className="grid gap-2">
                      {manifestData.icons?.map((icon: any, index: number) => (
                        <div key={index} className="flex items-center gap-4 p-2 bg-muted rounded">
                          <img
                            src={icon.src}
                            alt={`Icon ${icon.sizes}`}
                            className="w-8 h-8 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="text-sm space-y-1">
                            <div><strong>Size:</strong> {icon.sizes}</div>
                            <div><strong>Type:</strong> {icon.type}</div>
                            <div><strong>Purpose:</strong> {icon.purpose || 'any'}</div>
                            <div><strong>Source:</strong> {icon.src}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Raw Manifest Data</h4>
                    <pre className="text-sm bg-muted p-3 rounded overflow-auto max-h-96">
                      {JSON.stringify(manifestData, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Loading manifest data...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}