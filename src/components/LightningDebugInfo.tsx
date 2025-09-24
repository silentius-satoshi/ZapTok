import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ZAPTOK_CONFIG } from '@/constants';
import { DEBUG_CONFIG, enableAllDebugging, disableAllDebugging } from '@/lib/debug';

export function LightningDebugInfo() {
  const { user } = useCurrentUser();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(DEBUG_CONFIG.enableAll || DEBUG_CONFIG.lightning.enabled);

  const toggleDebug = (enabled: boolean) => {
    setDebugEnabled(enabled);
    if (enabled) {
      enableAllDebugging();
    } else {
      disableAllDebugging();
    }
  };

  const generateDebugInfo = () => {
    setIsGenerating(true);

    try {
      // Generate comprehensive debug information similar to what we use in lightning service
      const debug = {
        timestamp: new Date().toISOString(),
        user: {
          hasUser: !!user,
          pubkey: user?.pubkey?.substring(0, 16) + '...' || 'none',
          userKeys: user ? Object.keys(user) : [],
        },
        signer: user?.signer ? {
          hasSigner: !!user.signer,
          signerConstructor: user.signer.constructor?.name || 'unknown',
          signerKeys: Object.keys(user.signer),
          prototypeKeys: Object.getOwnPropertyNames(Object.getPrototypeOf(user.signer)),
          hasSignEventDirectly: !!user.signer.signEvent,
          signEventType: typeof user.signer.signEvent,
          signEventOnPrototype: typeof Object.getPrototypeOf(user.signer).signEvent === 'function',
          allSignerMethods: Object.getOwnPropertyNames(user.signer).concat(
            Object.getOwnPropertyNames(Object.getPrototypeOf(user.signer))
          ).filter(name => typeof user.signer[name] === 'function'),
          isReady: (user.signer as any).isReady,
          // Bunker-specific debugging
          bunkerDebug: user.signer.constructor?.name === 'NostrToolsSigner' ? {
            hasBunkerSigner: !!(user.signer as any).bunkerSigner,
            bunkerSignerType: (user.signer as any).bunkerSigner?.constructor?.name,
            bunkerSignerMethods: (user.signer as any).bunkerSigner ? Object.getOwnPropertyNames((user.signer as any).bunkerSigner).concat(
              Object.getOwnPropertyNames(Object.getPrototypeOf((user.signer as any).bunkerSigner))
            ).filter(name => typeof (user.signer as any).bunkerSigner[name] === 'function') : [],
            bunkerSignerHasSignEvent: !!(user.signer as any).bunkerSigner?.signEvent,
            bunkerSignerSignEventType: typeof (user.signer as any).bunkerSigner?.signEvent
          } : null
        } : null,
        webln: {
          hasWebLN: typeof window !== 'undefined' && 'webln' in window,
          weblnEnabled: typeof window !== 'undefined' && window.webln?.isEnabled,
        },
        signEventMethodDetection: {
          // Simulate the method detection logic from lightning service
          directMethod: !!user?.signer?.signEvent && typeof user.signer.signEvent === 'function',
          prototypeMethod: !!user?.signer && typeof Object.getPrototypeOf(user.signer).signEvent === 'function',
          bunkerMethod: !!user?.signer && !!(user.signer as any).bunkerSigner?.signEvent && typeof (user.signer as any).bunkerSigner.signEvent === 'function',
          detectedMethod: user?.signer?.signEvent ? 'direct' :
                         user?.signer && typeof Object.getPrototypeOf(user.signer).signEvent === 'function' ? 'prototype' :
                         user?.signer && !!(user.signer as any).bunkerSigner?.signEvent ? 'bunker' : 'none'
        }
      };

      setDebugInfo(debug);
    } catch (error) {
      setDebugInfo({
        error: 'Failed to generate debug info',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (debugInfo) {
      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Lightning & Zap Debug
          <div className="flex gap-2 items-center">
            <div className="flex items-center space-x-2">
              <Switch
                id="debug-mode"
                checked={debugEnabled}
                onCheckedChange={toggleDebug}
              />
              <Label htmlFor="debug-mode" className="text-sm text-zinc-300">
                Debug Logs
              </Label>
            </div>
            <Button
              onClick={generateDebugInfo}
              disabled={isGenerating}
              size="sm"
              variant="outline"
            >
              {isGenerating ? 'Generating...' : 'Generate Debug Info'}
            </Button>
            {debugInfo && (
              <Button
                onClick={copyToClipboard}
                size="sm"
                variant="outline"
              >
                Copy
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Debug Toggle Info */}
        <div className="bg-zinc-800 p-3 rounded-md">
          <p className="text-zinc-300 text-sm mb-2">
            <span className="font-medium">Debug Logging:</span> {debugEnabled ? 'Enabled' : 'Disabled'}
          </p>
          <p className="text-zinc-400 text-xs">
            When enabled, detailed console logs will be shown for Lightning operations, bunker authentication, and zap requests.
          </p>
        </div>

        {!debugInfo ? (
          <p className="text-zinc-400 text-sm">
            Click "Generate Debug Info" to analyze Lightning and Zap authentication state.
          </p>
        ) : debugInfo.error ? (
          <div className="text-red-400 text-sm">
            <p className="font-medium">Error:</p>
            <p>{debugInfo.message}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* User Status */}
            <div>
              <h4 className="text-white font-medium mb-2">User Status</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge variant={debugInfo.user.hasUser ? "default" : "destructive"}>
                  {debugInfo.user.hasUser ? "Logged In" : "Not Logged In"}
                </Badge>
                <Badge variant="outline">
                  {debugInfo.user.pubkey}
                </Badge>
              </div>
              <p className="text-zinc-400 text-sm">
                Keys: {debugInfo.user.userKeys.join(', ')}
              </p>
            </div>

            <Separator className="bg-zinc-700" />

            {/* Signer Status */}
            {debugInfo.signer && (
              <>
                <div>
                  <h4 className="text-white font-medium mb-2">Signer Status</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant={debugInfo.signer.hasSigner ? "default" : "destructive"}>
                      {debugInfo.signer.hasSigner ? "Signer Available" : "No Signer"}
                    </Badge>
                    <Badge variant="outline">
                      {debugInfo.signer.signerConstructor}
                    </Badge>
                    {debugInfo.signer.isReady !== undefined && (
                      <Badge variant={debugInfo.signer.isReady ? "default" : "secondary"}>
                        {debugInfo.signer.isReady ? "Ready" : "Not Ready"}
                      </Badge>
                    )}
                  </div>
                  <div className="text-zinc-400 text-sm space-y-1">
                    <p>Methods: {debugInfo.signer.allSignerMethods.join(', ')}</p>
                  </div>
                </div>

                <Separator className="bg-zinc-700" />

                {/* SignEvent Method Detection */}
                <div>
                  <h4 className="text-white font-medium mb-2">SignEvent Method Detection</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant={debugInfo.signEventMethodDetection.directMethod ? "default" : "secondary"}>
                      Direct: {debugInfo.signEventMethodDetection.directMethod ? "✓" : "✗"}
                    </Badge>
                    <Badge variant={debugInfo.signEventMethodDetection.prototypeMethod ? "default" : "secondary"}>
                      Prototype: {debugInfo.signEventMethodDetection.prototypeMethod ? "✓" : "✗"}
                    </Badge>
                    <Badge variant={debugInfo.signEventMethodDetection.bunkerMethod ? "default" : "secondary"}>
                      Bunker: {debugInfo.signEventMethodDetection.bunkerMethod ? "✓" : "✗"}
                    </Badge>
                  </div>
                  <p className="text-zinc-400 text-sm">
                    <span className="font-medium">Detected Method:</span> {debugInfo.signEventMethodDetection.detectedMethod}
                  </p>
                </div>

                {/* Bunker-specific debugging */}
                {debugInfo.signer.bunkerDebug && (
                  <>
                    <Separator className="bg-zinc-700" />
                    <div>
                      <h4 className="text-white font-medium mb-2">Bunker Signer Details</h4>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant={debugInfo.signer.bunkerDebug.hasBunkerSigner ? "default" : "destructive"}>
                          {debugInfo.signer.bunkerDebug.hasBunkerSigner ? "Bunker Available" : "No Bunker"}
                        </Badge>
                        <Badge variant="outline">
                          {debugInfo.signer.bunkerDebug.bunkerSignerType}
                        </Badge>
                        <Badge variant={debugInfo.signer.bunkerDebug.bunkerSignerHasSignEvent ? "default" : "destructive"}>
                          SignEvent: {debugInfo.signer.bunkerDebug.bunkerSignerHasSignEvent ? "✓" : "✗"}
                        </Badge>
                      </div>
                      <p className="text-zinc-400 text-sm">
                        Methods: {debugInfo.signer.bunkerDebug.bunkerSignerMethods.join(', ')}
                      </p>
                    </div>
                  </>
                )}

                <Separator className="bg-zinc-700" />
              </>
            )}

            {/* WebLN Status */}
            <div>
              <h4 className="text-white font-medium mb-2">WebLN Status</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant={debugInfo.webln.hasWebLN ? "default" : "secondary"}>
                  WebLN: {debugInfo.webln.hasWebLN ? "Available" : "Not Available"}
                </Badge>
                <Badge variant={debugInfo.webln.weblnEnabled ? "default" : "secondary"}>
                  Enabled: {debugInfo.webln.weblnEnabled ? "Yes" : "No"}
                </Badge>
              </div>
            </div>

            <Separator className="bg-zinc-700" />

            {/* Debug Timestamp */}
            <div>
              <p className="text-zinc-500 text-xs">
                Generated: {new Date(debugInfo.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}