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

interface EnhancedBitcoinConnectCardProps {
  className?: string;
  onTestConnection?: () => Promise<void>;
}

export function EnhancedBitcoinConnectCard({ className, onTestConnection }: EnhancedBitcoinConnectCardProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string>('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Initialize Bitcoin Connect for mobile PWA
  useEffect(() => {
    init({
      appName: 'ZapTok',
      filters: ['nwc'],
      showBalance: true,
    });
  }, []);

  const handleConnected = (provider: any) => {
    setIsConnected(true);
    setConnectedWallet(provider?.info?.alias || provider?.constructor?.name || 'Lightning Wallet');
    toast({
      title: "Wallet Connected",
      description: `Successfully connected to your Lightning wallet`,
    });
  };

  const handleDisconnected = () => {
    // Disconnect from Bitcoin Connect WebLN provider if available
    if (window.webln?.disable) {
      window.webln.disable().catch(console.error);
    }

    // Clear local state
    setIsConnected(false);
    setConnectedWallet('');

    toast({
      title: "Wallet Disconnected",
      description: "Lightning wallet has been disconnected successfully",
      variant: "destructive",
    });
  };

  const handleTestConnection = async () => {
    if (!isConnected) {
      toast({
        title: "No Connection",
        description: "Please connect a wallet first before testing",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      // Use the prop function if available, otherwise fall back to local implementation
      if (onTestConnection) {
        await onTestConnection();
      } else {
        // Fallback implementation
        if (window.webln) {
          await window.webln.enable();
          toast({
            title: "✅ Connection Test Successful",
            description: "Lightning wallet connection is working properly",
          });
        } else {
          toast({
            title: "❌ Connection Test Failed",
            description: "WebLN provider not found",
            variant: "destructive",
          });
        }
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
    <Card className={`relative overflow-hidden ${className}`}>
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
                <span>Lightning Wallet</span>
                <Badge variant="outline" className="text-xs">
                  <Smartphone className="w-3 h-3 mr-1" />
                  Mobile PWA
                </Badge>
              </CardTitle>
              <CardDescription>
                Enhanced Bitcoin Connect for mobile users
              </CardDescription>
            </div>
          </div>

          {/* Connection status indicator */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline">
                <AlertCircle className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Connection status section */}
        {isConnected && connectedWallet && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Connected to <strong>{connectedWallet}</strong>. You can now send and receive Lightning payments.
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
          {!isConnected ? (
            <div className="space-y-2">
              {/* Bitcoin Connect Button component */}
              <Button
                onConnected={handleConnected}
                onDisconnected={handleDisconnected}
              />
            </div>
          ) : (
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
          )}
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