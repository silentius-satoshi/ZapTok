import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wallet, 
  Zap, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  Copy,
  Eye,
  EyeOff 
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function WalletDashboard() {
  const { 
    isConnected, 
    walletInfo, 
    transactions, 
    isLoading,
    getWalletInfo,
    getTransactionHistory
  } = useWallet();
  const { toast } = useToast();
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        getWalletInfo(),
        getTransactionHistory(),
      ]);
      toast({
        title: "Wallet Updated",
        description: "Your wallet information has been refreshed",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh wallet",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat().format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Connect your Lightning wallet to view dashboard</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Lightning Wallet
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-24" />
            </div>
          ) : walletInfo ? (
            <div className="space-y-4">
              {/* Balance */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {showBalance 
                      ? `${formatAmount(walletInfo.balance)} sats`
                      : '••••••••'
                    }
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBalance(!showBalance)}
                  >
                    {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Badge variant="secondary">
                  ≈ ${((walletInfo.balance / 100000000) * 45000).toFixed(2)}
                </Badge>
              </div>

              <Separator />

              {/* Wallet Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {walletInfo.alias && (
                  <div>
                    <p className="text-muted-foreground">Wallet Name</p>
                    <p className="font-medium">{walletInfo.alias}</p>
                  </div>
                )}
                {walletInfo.implementation && (
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{walletInfo.implementation}</p>
                  </div>
                )}
                {walletInfo.pubkey && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Node ID</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs truncate">{walletInfo.pubkey}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(walletInfo.pubkey!, 'Node ID')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Failed to load wallet information</p>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transactions found
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.type === 'send' 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {tx.type === 'send' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {tx.type === 'send' ? 'Payment Sent' : 'Payment Received'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(tx.timestamp)}
                        </p>
                        {tx.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {tx.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        tx.type === 'send' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {tx.type === 'send' ? '-' : '+'}
                        {formatAmount(tx.amount)} sats
                      </p>
                      <Badge variant={tx.settled ? 'default' : 'secondary'}>
                        {tx.settled ? 'Settled' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
