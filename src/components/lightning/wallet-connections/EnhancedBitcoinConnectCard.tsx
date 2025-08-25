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
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrLogin } from '@nostrify/react/login';
import { useBitcoinConnectConsent } from '@/hooks/useBitcoinConnectConsent';
import { BitcoinConnectConsentDialog } from '@/components/lightning/BitcoinConnectConsentDialog';

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
  const { user } = useCurrentUser();
  const { logins } = useNostrLogin();

  // Use global wallet state instead of local state
  const {
    isConnected,
    walletInfo,
    connect,
    disconnect,
    userHasLightningAccess
  } = useWallet();

  // Use consent hook for bunker signers
  const {
    isDialogOpen,
    detectedWallet,
    signerType,
    isBunkerSigner,
    closeDialog,
  } = useBitcoinConnectConsent();

  // Initialize Bitcoin Connect for mobile PWA only for appropriate signer types
  useEffect(() => {
    if (!user?.pubkey) return;

    // Get user's login type to determine signer type
    const currentUserLogin = logins.find(login => login.pubkey === user.pubkey);
    const loginType = currentUserLogin?.type;

    // Only initialize for bunker signers
    const isBunkerSigner = loginType === 'bunker' ||
                          loginType === 'x-bunker-nostr-tools' ||
                          user?.signer?.constructor?.name?.includes('bunker');

    if (isBunkerSigner) {
      console.log('[EnhancedBitcoinConnect] Initializing for bunker signer:', loginType);
      init({
        appName: 'ZapTok',
        filters: ['nwc'],
        showBalance: true,
        autoConnect: false, // Disable auto-connection to prevent unwanted connections
      });
      // Consent dialog will handle any auto-connection scenarios
    } else {
      console.log('[EnhancedBitcoinConnect] Skipping initialization for non-bunker signer:', loginType);
    }
  }, [user?.pubkey, logins]);

  const handleConnected = async (provider: any) => {
    try {
      // Bitcoin Connect should have set up window.webln, but it might need a moment
      // Wait a bit for window.webln to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      if (window.webln) {
        await connect(); // This will detect the new WebLN provider
        toast({
          title: "Wallet Connected",
          description: `Successfully connected to your Lightning wallet`,
        });
      } else {
        // Try again after a longer delay
        await new Promise(resolve => setTimeout(resolve, 500));
        if (window.webln) {
          await connect();
          toast({
            title: "Wallet Connected",
            description: `Successfully connected to your Lightning wallet`,
          });
        } else {
          throw new Error("WebLN provider not available after Bitcoin Connect");
        }
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnected = async () => {
    try {
      // Use the global disconnect function
      await disconnect();
      toast({
        title: "Wallet Disconnected",
        description: "Lightning wallet has been disconnected successfully",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
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

      {/* Consent Dialog for Bunker Signers */}
      {isBunkerSigner && (
        <BitcoinConnectConsentDialog
          isOpen={isDialogOpen}
          onClose={closeDialog}
          detectedWallet={detectedWallet || undefined}
          signerType={signerType}
        />
      )}
    </Card>
  );
}