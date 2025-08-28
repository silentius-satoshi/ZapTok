import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Zap, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Bitcoin,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';

interface BunkerWalletDashboardProps {
  className?: string;
}

interface WalletCapabilities {
  getBalance?: boolean;
  sendPayment?: boolean;
  makeInvoice?: boolean;
  getInfo?: boolean;
}

interface WalletData {
  balance?: number;
  capabilities?: WalletCapabilities;
  connected: boolean;
  info?: {
    alias?: string;
    pubkey?: string;
    version?: string;
  };
}

export function BunkerWalletDashboard({ className }: BunkerWalletDashboardProps) {
  const [walletData, setWalletData] = useState<WalletData>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState<'checking' | 'healthy' | 'degraded' | 'offline'>('checking');
  const { toast } = useToast();
  const { data: btcPrice } = useBitcoinPrice();
  const { showSats, toggleCurrency } = useCurrencyDisplayStore();

  // Check if Bitcoin Connect is available
  const checkBitcoinConnect = useCallback(async () => {
    try {
      // @ts-ignore - Bitcoin Connect API
      if (typeof window !== 'undefined' && window.webln) {
        setConnectionHealth('healthy');
        setWalletData(prev => ({ ...prev, connected: true }));
      } else {
        setConnectionHealth('offline');
        setWalletData(prev => ({ ...prev, connected: false }));
      }
    } catch (error) {
      console.error('Bitcoin Connect check failed:', error);
      setConnectionHealth('offline');
      setWalletData(prev => ({ ...prev, connected: false }));
    }
  }, []);

  // Simulate wallet data refresh
  const refreshWalletData = useCallback(async () => {
    setIsLoading(true);
    try {
      await checkBitcoinConnect();
      
      // Simulate getting wallet capabilities and basic info
      if (walletData.connected) {
        setWalletData(prev => ({
          ...prev,
          capabilities: {
            getBalance: true,
            sendPayment: true,
            makeInvoice: true,
            getInfo: true,
          },
          info: {
            alias: 'Lightning Node',
            pubkey: '02...',
            version: '1.0.0',
          },
          balance: Math.floor(Math.random() * 50000), // Demo balance
        }));
        setConnectionHealth('healthy');
      }
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
      setConnectionHealth('degraded');
      toast({
        title: "Connection Issue",
        description: "Unable to refresh wallet data. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [walletData.connected, toast, checkBitcoinConnect]);

  // Initial load
  useEffect(() => {
    refreshWalletData();
  }, []);

  const formatBalance = (sats: number) => {
    if (showSats) {
      return `${sats.toLocaleString()} sats`;
    } else if (btcPrice) {
      return formatUSD(satsToUSD(sats, btcPrice.USD));
    }
    return `${sats.toLocaleString()} sats`;
  };

  const getConnectionStatusIcon = () => {
    switch (connectionHealth) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionHealth) {
      case 'healthy':
        return 'Connected';
      case 'degraded':
        return 'Limited';
      case 'offline':
        return 'Offline';
      default:
        return 'Checking...';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-orange-500" />
            Lightning Wallet
          </h2>
          <p className="text-gray-400 mt-1">Enhanced dashboard for bunker signers</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshWalletData}
          disabled={isLoading}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Connection Status */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Connection Status
            </span>
            <Badge variant={connectionHealth === 'healthy' ? 'default' : 'destructive'} className="flex items-center gap-1">
              {getConnectionStatusIcon()}
              {getConnectionStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-400">
            {connectionHealth === 'healthy' 
              ? "Your Lightning wallet is connected and ready for payments."
              : connectionHealth === 'offline'
              ? "Connect to Bitcoin Connect to enable Lightning payments."
              : "Connection detected but some features may be limited."
            }
          </div>
        </CardContent>
      </Card>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance Card */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Bitcoin className="h-5 w-5 text-orange-500" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">
                  {walletData.balance !== undefined 
                    ? formatBalance(walletData.balance)
                    : '---'
                  }
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCurrency}
                  className="text-xs text-gray-400 hover:text-white mt-2"
                >
                  Show in {showSats ? "USD" : "sats"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Capabilities */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(walletData.capabilities || {}).map(([capability, available]) => (
                <div key={capability} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 capitalize">
                    {capability.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <Badge variant={available ? 'default' : 'secondary'} className="text-xs">
                    {available ? 'Available' : 'Limited'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="bg-blue-900/20 border-blue-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-blue-400">Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• Connect your Lightning wallet through Bitcoin Connect</p>
            <p>• Send and receive Lightning payments securely</p>
            <p>• Enhanced payment flows coming in Phase 2!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
