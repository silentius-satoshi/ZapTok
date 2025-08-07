import { useState } from 'react';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionHistoryWarning } from '@/components/TransactionHistoryWarning';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
interface CashuHistoryCardProps {
  limit?: number;
  className?: string;
}

export function CashuHistoryCard({
  limit = 10,
  className
}: CashuHistoryCardProps) {
  const { transactions, isLoading } = useCashuHistory();
  const [visibleEntries, setVisibleEntries] = useState(limit);
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: btcPrice } = useBitcoinPrice();

  // Check if we should show the warning icon
  const hasOnlyReceiveTransactions = transactions.length > 0 && 
    transactions.every(t => ['receive', 'nutzap_receive', 'mint'].includes(t.type));
  
  const hasOnlySendTransactions = transactions.length > 0 && 
    transactions.every(t => ['send', 'nutzap_send', 'melt'].includes(t.type));
  
  const hasVeryFewTransactions = transactions.length > 0 && transactions.length < 3;
  const hasNoTransactions = transactions.length === 0;

  const shouldShowWarning = hasNoTransactions || 
    hasOnlyReceiveTransactions || 
    hasOnlySendTransactions || 
    hasVeryFewTransactions;

  const displayTransactions = transactions.slice(0, visibleEntries);

  // Format amount in USD like Chorus
  const formatAmount = (sats: number) => {
    if (!btcPrice) {
      return `${sats.toLocaleString()} sats`;
    }
    const usdAmount = (sats * btcPrice.USD) / 100000000;
    return `${usdAmount.toFixed(2)} usd`;
  };

  // Format timestamp like Chorus
  const formatTimestamp = (timestamp: number) => {
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
    setIsExpanded(!isExpanded);
  };

  const loadMore = () => {
    setVisibleEntries(prev => prev + 5);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Transaction History</h2>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Transaction History</h2>
            {shouldShowWarning && (
              <TransactionHistoryWarning 
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-yellow-500 hover:text-yellow-400"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </Button>
                }
                compact={true}
              />
            )}
          </div>
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
            {displayTransactions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayTransactions.map((transaction, index) => (
                  <div
                    key={transaction.id || index}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-4">
                      {/* Circular icon with arrow */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        ['receive', 'nutzap_receive', 'mint'].includes(transaction.type)
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {['receive', 'nutzap_receive', 'mint'].includes(transaction.type) ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>

                      {/* Transaction details */}
                      <div>
                        <p className="font-medium text-white">
                          {transaction.type === 'nutzap_send' && 'Nutzap Sent'}
                          {transaction.type === 'nutzap_receive' && 'Nutzap Received'}
                          {transaction.type === 'send' && 'Sent'}
                          {transaction.type === 'receive' && 'Received'}
                          {transaction.type === 'mint' && 'Minted'}
                          {transaction.type === 'melt' && 'Melted'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {formatTimestamp(transaction.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className={`font-medium ${
                        ['receive', 'nutzap_receive', 'mint'].includes(transaction.type)
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                        {['receive', 'nutzap_receive', 'mint'].includes(transaction.type) ? '+' : '-'}{formatAmount(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}

                {transactions.length > visibleEntries && (
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
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}