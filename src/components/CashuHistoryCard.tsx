import { useCashuHistory, useCashuStats } from '@/hooks/useCashuHistory';
import { useAuthor } from '@/hooks/useAuthor';
import { formatBalance } from '@/lib/cashu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Zap, 
  Coins,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import type { CashuTransaction } from '@/hooks/useCashuHistory';
import { cn } from '@/lib/utils';

interface CashuHistoryCardProps {
  limit?: number;
  showStats?: boolean;
  className?: string;
}

function TransactionIcon({ type }: { type: CashuTransaction['type'] }) {
  switch (type) {
    case 'send':
    case 'nutzap_send':
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    case 'receive':
    case 'nutzap_receive':
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    case 'mint':
      return <Coins className="h-4 w-4 text-blue-500" />;
    case 'melt':
      return <Zap className="h-4 w-4 text-orange-500" />;
    default:
      return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
  }
}

function TransactionItem({ transaction }: { transaction: CashuTransaction }) {
  const author = useAuthor(transaction.counterparty);
  const isOutgoing = ['send', 'nutzap_send', 'melt'].includes(transaction.type);
  
  return (
    <div className="flex items-center space-x-3 py-3">
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <TransactionIcon type={transaction.type} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">
                {transaction.type === 'nutzap_send' && 'Nutzap Sent'}
                {transaction.type === 'nutzap_receive' && 'Nutzap Received'}
                {transaction.type === 'send' && 'Sent'}
                {transaction.type === 'receive' && 'Received'}
                {transaction.type === 'mint' && 'Minted'}
                {transaction.type === 'melt' && 'Melted'}
              </p>
              <Badge 
                variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {transaction.status}
              </Badge>
            </div>
            
            {transaction.description && (
              <p className="text-xs text-muted-foreground truncate">
                {transaction.description}
              </p>
            )}
            
            {transaction.counterparty && (
              <div className="flex items-center space-x-2">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={author.data?.metadata?.picture} />
                  <AvatarFallback className="text-xs">
                    {author.data?.metadata?.name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {author.data?.metadata?.name || 
                   `${transaction.counterparty.slice(0, 8)}...`}
                </span>
              </div>
            )}
          </div>
          
          <div className="text-right space-y-1">
            <p className={cn(
              "text-sm font-semibold",
              isOutgoing ? "text-red-600" : "text-green-600"
            )}>
              {isOutgoing ? '-' : '+'}{formatBalance(transaction.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(transaction.timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsSection() {
  const stats = useCashuStats();
  
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
      <div className="space-y-1">
        <div className="flex items-center space-x-1">
          <TrendingUp className="h-3 w-3 text-green-600" />
          <span className="text-xs text-muted-foreground">Received</span>
        </div>
        <p className="text-sm font-semibold text-green-600">
          +{formatBalance(stats.totalReceived)}
        </p>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center space-x-1">
          <TrendingDown className="h-3 w-3 text-red-600" />
          <span className="text-xs text-muted-foreground">Sent</span>
        </div>
        <p className="text-sm font-semibold text-red-600">
          -{formatBalance(stats.totalSent)}
        </p>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center space-x-1">
          <Coins className="h-3 w-3 text-blue-600" />
          <span className="text-xs text-muted-foreground">Minted</span>
        </div>
        <p className="text-sm font-semibold text-blue-600">
          +{formatBalance(stats.totalMinted)}
        </p>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center space-x-1">
          <Zap className="h-3 w-3 text-orange-600" />
          <span className="text-xs text-muted-foreground">Melted</span>
        </div>
        <p className="text-sm font-semibold text-orange-600">
          -{formatBalance(stats.totalMelted)}
        </p>
      </div>
    </div>
  );
}

export function CashuHistoryCard({ 
  limit = 10, 
  showStats = true,
  className 
}: CashuHistoryCardProps) {
  const { transactions, isLoading, refetch } = useCashuHistory();
  
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Transaction History</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showStats && (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          )}
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Transaction History</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showStats && <StatsSection />}
        
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Recent Transactions</h4>
            {transactions.length > limit && (
              <Button variant="ghost" size="sm">
                <span className="text-xs">View All</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
          
          {displayTransactions.length === 0 ? (
            <div className="py-8 text-center">
              <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-0">
                {displayTransactions.map((transaction, index) => (
                  <div key={transaction.id}>
                    <TransactionItem transaction={transaction} />
                    {index < displayTransactions.length - 1 && (
                      <div className="border-b border-border/50" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}