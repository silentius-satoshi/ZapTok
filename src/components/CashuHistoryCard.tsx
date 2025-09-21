import { useState } from 'react';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionHistoryWarning } from '@/components/TransactionHistoryWarning';
import { formatBalance } from '@/lib/cashu';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Users,
  Zap,
  DollarSign,
  Bitcoin
} from 'lucide-react';

interface CashuHistoryCardProps {
  limit?: number;
  className?: string;
}

export function CashuHistoryCard({
  limit = 10,
  className
}: CashuHistoryCardProps) {
  const { history, isLoading } = useCashuHistory();
  const [visibleEntries, setVisibleEntries] = useState(limit);
  const { data: btcPrice } = useBitcoinPrice();
  const { displayCurrency, toggleCurrency } = useCurrencyDisplayStore();
  const { isExpanded, toggleExpanded } = useWalletUiStore();

  // Check if we should show the warning icon
  const hasOnlyReceiveTransactions = history.length > 0 &&
    history.every(t => t.direction === 'in');

  const hasOnlySendTransactions = history.length > 0 &&
    history.every(t => t.direction === 'out');

  const hasVeryFewTransactions = history.length > 0 && history.length < 3;
  const hasNoTransactions = history.length === 0;

  const shouldShowWarning = hasNoTransactions ||
    hasOnlyReceiveTransactions ||
    hasOnlySendTransactions ||
    hasVeryFewTransactions;

  const displayTransactions = history.slice(0, visibleEntries);

  // Currency display helpers
  const formatAmount = (sats: number) => {
    if (displayCurrency === 'usd' && btcPrice) {
      return formatUSD(satsToUSD(sats, btcPrice.usd));
    }
    return formatBalance(sats);
  };

  const getCurrencyLabel = () => {
    return displayCurrency === 'usd' ? 'USD' : 'sats';
  };

  // Format timestamp
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    const date = new Date(ms);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const loadMore = () => {
    setVisibleEntries(prev => prev + 5);
  };

  // Get transaction type icon and label
  const getTransactionDisplay = (transaction: any) => {
    if (transaction.isNutzap) {
      return {
        icon: <Zap className="w-5 h-5" />,
        label: transaction.direction === 'in' ? 'Nutzap Received' : 'Nutzap Sent',
        bgColor: transaction.direction === 'in' ? 'bg-yellow-100 text-yellow-600' : 'bg-orange-100 text-orange-600'
      };
    }

    if (transaction.groupId) {
      return {
        icon: <Users className="w-5 h-5" />,
        label: transaction.direction === 'in' ? 'Group Payment Received' : 'Group Payment Sent',
        bgColor: transaction.direction === 'in' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
      };
    }

    return {
      icon: transaction.direction === 'in' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />,
      label: transaction.direction === 'in' ? 'Received' : 'Sent',
      bgColor: transaction.direction === 'in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
    };
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Transaction History</CardTitle>
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

          <div className="flex items-center gap-2">
            {/* Currency toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCurrency}
              className="h-8 w-16"
            >
              {displayCurrency === 'usd' ? (
                <DollarSign className="h-4 w-4" />
              ) : (
                <Bitcoin className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded('history')}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {displayTransactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayTransactions.map((transaction, index) => {
                const { icon, label, bgColor } = getTransactionDisplay(transaction);

                return (
                  <div
                    key={transaction.id || index}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-4">
                      {/* Transaction type icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgColor}`}>
                        {icon}
                      </div>

                      {/* Transaction details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{label}</p>
                          {transaction.isNutzap && (
                            <Badge variant="outline" className="text-xs">
                              Nutzap
                            </Badge>
                          )}
                          {transaction.groupId && (
                            <Badge variant="outline" className="text-xs">
                              Group
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatTimestamp(transaction.timestamp)}</span>
                          {transaction.publicNote && (
                            <>
                              <span>•</span>
                              <span className="italic">{transaction.publicNote}</span>
                            </>
                          )}
                        </div>

                        {transaction.recipientPubkey && (
                          <div className="text-xs text-muted-foreground mt-1">
                            To: {transaction.recipientPubkey.slice(0, 16)}...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.direction === 'in'
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                        {transaction.direction === 'in' ? '+' : '-'}{formatAmount(parseInt(transaction.amount as any, 10) || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getCurrencyLabel()}
                      </p>
                    </div>
                  </div>
                );
              })}

              {history.length > visibleEntries && (
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
        </CardContent>
      )}
    </Card>
  );
}