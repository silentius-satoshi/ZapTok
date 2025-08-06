import { useState } from 'react';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useTransactionHistoryStore } from '@/stores/transactionHistoryStore';
import { useCashuStore } from '@/stores/cashuStore';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
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

  // Format amount in USD like Chorus
  const formatAmount = (sats: number) => {
    if (!btcPrice) {
      return `${sats.toLocaleString()} sats`;
    }
    const usdAmount = (sats * btcPrice.USD) / 100000000;
    return `${usdAmount.toFixed(2)} usd`;
  };

  // Format timestamp like Chorus
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const toggleExpanded = () => {
    walletUiStore.toggleCardExpansion('history');
  };

  const loadMore = () => {
    setVisibleEntries(prev => prev + 5);
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Transaction History</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {isExpanded && (
          <>
            {isLoading ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">Loading transactions...</p>
              </div>
            ) : queryHistory && queryHistory.length > 0 ? (
              <div className="space-y-4">
                {queryHistory.slice(0, visibleEntries).map((transaction: any, index: number) => (
                  <div
                    key={transaction.id || index}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-4">
                      {/* Circular icon with arrow */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'received' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {transaction.type === 'received' ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      
                      {/* Transaction details */}
                      <div>
                        <p className="font-medium text-white">
                          {transaction.type === 'received' ? 'Received' : 'Sent'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formatTimestamp(transaction.timestamp)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'received' ? 'text-green-500' : 'text-red-500'
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
                    className="w-full mt-4"
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
