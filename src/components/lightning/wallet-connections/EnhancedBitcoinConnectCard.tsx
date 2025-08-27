import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button as UIButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wallet,
  Zap,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Smartphone,
  Globe,
  Shield,
  RefreshCw,
  Info
} from 'lucide-react';
import { Button, Connect, init } from '@getalby/bitcoin-connect-react';
import { useToast } from '@/hooks/useToast';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useWallet } from '@/hooks/useWallet';

interface EnhancedBitcoinConnectCardProps {
  className?: string;
  onTestConnection?: () => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}

export function EnhancedBitcoinConnectCard({ className, onTestConnection, disabled = false, disabledReason }: EnhancedBitcoinConnectCardProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Use global wallet state instead of local state
  const {
    isConnected,
    walletInfo,
    connect,
    disconnect,
    userHasLightningAccess
  } = useWallet();

  // Initialize Bitcoin Connect for mobile PWA
  useEffect(() => {
    // Clear any broken WebLN objects before initializing
    if (window.webln && !(window as any).__bitcoinConnectActive) {
      const requiredMethods = ['enable', 'getInfo'];
      const hasValidMethods = requiredMethods.every(method =>
        typeof (window.webln as any)?.[method] === 'function'
      );

      if (!hasValidMethods) {
        console.log('[EnhancedBitcoinConnect] Clearing broken WebLN before initialization');
        delete (window as any).webln;
      }
    }

    init({
      appName: 'ZapTok',
      filters: ['nwc'],
      showBalance: true,
      autoConnect: false, // Prevent auto-connection to avoid conflicts
    });
  }, []);

  const handleConnected = async (provider: any) => {
    try {
      console.log('[EnhancedBitcoinConnect] Bitcoin Connect connected, initializing...');

      // Skip if we're already connected to avoid re-enabling an already working provider
      if (isConnected && userHasLightningAccess) {
        console.log('[EnhancedBitcoinConnect] Already connected, skipping re-connection process');
        return;
      }

      // Set Bitcoin Connect as active to enable protection
      (window as any).__bitcoinConnectActive = true;

      // Wait for Bitcoin Connect to establish WebLN
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if we have a valid WebLN provider
      if (!window.webln) {
        throw new Error("WebLN provider not available after Bitcoin Connect");
      }

      // Validate the WebLN object has required methods
      const requiredMethods = ['enable', 'getInfo'];
      const missingMethods = requiredMethods.filter(method =>
        typeof (window.webln as any)?.[method] !== 'function'
      );

      if (missingMethods.length > 0) {
        console.error('[EnhancedBitcoinConnect] WebLN provider missing methods:', missingMethods);

        // Clear the broken WebLN object
        delete (window as any).webln;

        // Wait a bit and check if Bitcoin Connect provides a new one
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!window.webln || missingMethods.some(method =>
          typeof (window.webln as any)?.[method] !== 'function'
        )) {
          throw new Error("Browser extension conflict detected. Please disable WebLN extensions and retry.");
        }
      }

      // Store Bitcoin Connect WebLN reference for protection
      (window as any).__bitcoinConnectWebLN = window.webln;

      // Test WebLN enable before proceeding (optional - Bitcoin Connect can work without WebLN)
      let weblnFailed = false;
      try {
        // Check if WebLN is already enabled to avoid re-enabling
        if (window.webln.isEnabled) {
          console.log('[EnhancedBitcoinConnect] WebLN already enabled, skipping enable() call');
        } else {
          console.log('[EnhancedBitcoinConnect] Enabling WebLN...');
          await window.webln.enable();
        }
        console.log('[EnhancedBitcoinConnect] WebLN enabled successfully');
      } catch (enableError) {
        console.warn('[EnhancedBitcoinConnect] WebLN enable failed (non-critical):', enableError);
        weblnFailed = true;

        // Temporarily disable WebLN to prevent Bitcoin Connect's internal enable() calls from failing
        if (window.webln) {
          const originalWebln = window.webln;
          const originalEnable = originalWebln.enable;

          // Override enable() to prevent further failures during Bitcoin Connect operations
          originalWebln.enable = async () => {
            console.log('[EnhancedBitcoinConnect] Preventing WebLN re-enable after previous failure');
            return Promise.resolve(); // Return resolved promise instead of throwing
          };

          // Restore after Bitcoin Connect's internal operations complete
          setTimeout(() => {
            if (originalWebln && originalEnable) {
              originalWebln.enable = originalEnable;
              console.log('[EnhancedBitcoinConnect] Restored WebLN enable() function');
            }
          }, 3000); // Longer timeout to ensure all Bitcoin Connect operations complete
        }
      }

      // Now connect via WalletContext
      await connect();

      toast({
        title: "Wallet Connected",
        description: `Successfully connected to your Lightning wallet`,
      });

    } catch (error) {
      console.error('[EnhancedBitcoinConnect] Connection failed:', error);

      // Clean up on failure
      (window as any).__bitcoinConnectActive = false;
      delete (window as any).__bitcoinConnectWebLN;

      // Provide specific error messages for common issues
      let errorMessage = error instanceof Error ? error.message : "Failed to connect wallet";

      // Don't fail for WebLN-specific errors that were already handled above
      if (errorMessage.includes("Prompt was closed") ||
          errorMessage.includes("webln.enable() failed") ||
          errorMessage.includes("Enable was rejected") ||
          errorMessage.includes("rejecting further window.webln calls")) {
        console.log('[EnhancedBitcoinConnect] WebLN prompt error handled gracefully');
        return; // Don't show error toast for these cases
      }

      if (errorMessage.includes("undefined") && errorMessage.includes("enabled")) {
        errorMessage = "Browser extension conflict detected. Please disable WebLN browser extensions and try again.";
      } else if (errorMessage.includes("WebLN provider missing methods")) {
        errorMessage = "Invalid WebLN provider. Please try a different wallet or disable browser extensions.";
      }

      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDisconnected = async () => {
    try {
      console.log('[EnhancedBitcoinConnect] Disconnecting...');

      // Clean up Bitcoin Connect protection
      (window as any).__bitcoinConnectActive = false;
      delete (window as any).__bitcoinConnectWebLN;

      // Use the global disconnect function
      await disconnect();

      // Clear window.webln to prevent stale connections
      if (window.webln) {
        delete (window as any).webln;
      }

      toast({
        title: "Wallet Disconnected",
        description: "Lightning wallet has been disconnected successfully",
        variant: "destructive",
      });
    } catch (error) {
      console.error('[EnhancedBitcoinConnect] Disconnect failed:', error);

      // Still clean up protection even if disconnect fails
      (window as any).__bitcoinConnectActive = false;
      delete (window as any).__bitcoinConnectWebLN;

      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async () => {
    // Debug: Check the actual state
    console.log('Test Connection Debug:', {
      isConnected,
      userHasLightningAccess,
      hasWindowWebln: !!window.webln,
      weblnEnabled: window.webln?.isEnabled,
      walletInfo
    });

    if (!isConnected || !userHasLightningAccess) {
      toast({
        title: "❌ Connection Test Failed",
        description: "No wallet connected",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      // Test the actual WebLN connection
      if (window.webln) {
        // First ensure WebLN is enabled
        await window.webln.enable();

        // Try to get wallet info to verify connection (if available)
        let walletAlias = 'Lightning wallet';
        if ('getInfo' in window.webln && typeof window.webln.getInfo === 'function') {
          try {
            const info = await window.webln.getInfo();
            walletAlias = info?.alias || 'Lightning wallet';
          } catch (infoError) {
            // getInfo failed but connection might still work
            console.warn('getInfo failed, but wallet may still be functional:', infoError);
          }
        }

        toast({
          title: "✅ Connection Test Successful",
          description: `Connected to ${walletAlias} - Ready for payments`,
        });
      } else {
        throw new Error("WebLN provider not available");
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast({
        title: "❌ Connection Test Failed",
        description: error instanceof Error ? error.message : "Failed to test wallet connection",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Card className={`relative overflow-hidden ${disabled ? 'opacity-50' : ''} ${className}`}>
      {/* Enhanced mobile PWA gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-yellow-500/5 to-amber-500/10" />

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Bitcoin Connect</span>
                <Badge variant="outline" className="text-xs">
                  <Smartphone className="w-3 h-3 mr-1" />
                  Mobile PWA
                </Badge>
              </CardTitle>
              <CardDescription>
                {disabled && disabledReason ? disabledReason : "Enhanced Bitcoin Connect for mobile users"}
              </CardDescription>
            </div>
          </div>

          {/* Connection status indicator */}
          <div className="flex items-center space-x-2">
            {isConnected && userHasLightningAccess && !disabled ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : disabled ? (
              <Badge variant="outline">
                <AlertCircle className="w-3 h-3 mr-1" />
                Disabled
              </Badge>
            ) : (
              <Badge variant="outline">
                <AlertCircle className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>

        {disabled && disabledReason && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{disabledReason}</AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Connection status section */}
        {isConnected && userHasLightningAccess && walletInfo && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Connected to <strong>{walletInfo.alias || 'Lightning Wallet'}</strong>. You can now send and receive Lightning payments.
            </AlertDescription>
          </Alert>
        )}

        {/* Supported wallet types info for mobile */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center space-x-2">
            <Info className="w-4 h-4" />
            <span>Supported Wallet Types</span>
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
              <Globe className="w-3 h-3" />
              <span>Nostr Wallet Connect (NWC)</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="space-y-3">
          {(!isConnected || !userHasLightningAccess) && !disabled ? (
            <div className="space-y-2">
              {/* Bitcoin Connect Button component */}
              <Button
                onConnected={handleConnected}
                onDisconnected={handleDisconnected}
              />
            </div>
          ) : isConnected && userHasLightningAccess && !disabled ? (
            <div className="grid grid-cols-2 gap-2">
              <UIButton
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                variant="outline"
                size={isMobile ? "default" : "sm"}
              >
                {isTestingConnection ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </UIButton>
              <UIButton
                onClick={handleDisconnected}
                variant="destructive"
                size={isMobile ? "default" : "sm"}
              >
                Disconnect
              </UIButton>
            </div>
          ) : disabled ? (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Connection controls disabled
              </p>
            </div>
          ) : null}
        </div>

        {/* Mobile PWA specific notes */}
        {isMobile && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Optimized for mobile PWA experience. The wallet connection modal will open in full-screen mode for better usability.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}