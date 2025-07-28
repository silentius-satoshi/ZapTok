import { useState } from 'react';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useTransactionHistoryStore } from '@/stores/transactionHistoryStore';
import { useCashuStore } from '@/stores/cashuStore';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashuHistoryCardProps {
  className?: string;
}

export function CashuHistoryCard({ className }: CashuHistoryCardProps = {}) {
  const { transactions: queryHistory, isLoading, createHistory } = useCashuHistory();
  const transactionHistoryStore = useTransactionHistoryStore();
  const cashuStore = useCashuStore();
  const { updateProofs } = useCashuWallet();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const walletUiStore = useWalletUiStore();
  const isExpanded = walletUiStore.expandedCards.history;
  const [visibleEntries, setVisibleEntries] = useState(5);
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Format amount based on user preference
  const formatAmount = (sats: number) => {
    if (showSats || !btcPrice) {
      return `${sats.toLocaleString()} sats`;
    } else {
      const usdAmount = (sats * btcPrice.USD) / 100000000;
      return `$${usdAmount.toFixed(2)}`;
    }
  };

  const toggleExpanded = () => {
    walletUiStore.toggleCardExpansion('history');
  };

  const loadMore = () => {
    setVisibleEntries(prev => prev + 5);
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <CardTitle className="font-medium">Transaction History</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">Your Cashu transaction history</p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">Loading transactions...</p>
            </div>
          ) : queryHistory && queryHistory.length > 0 ? (
            <div className="space-y-3">
              {queryHistory.slice(0, visibleEntries).map((transaction: any, index: number) => (
                <div
                  key={transaction.id || index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      transaction.type === 'received' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {transaction.type === 'received' ? 'Received' : 'Sent'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(transaction.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      transaction.type === 'received' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'received' ? '+' : '-'}{formatAmount(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
              
              {queryHistory.length > visibleEntries && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  className="w-full"
                >
                  Load More
                </Button>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
