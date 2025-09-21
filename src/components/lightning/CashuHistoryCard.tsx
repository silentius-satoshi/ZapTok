import { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useTransactionHistoryStore, PendingTransaction } from '@/stores/transactionHistoryStore';
import { useCashuStore } from '@/stores/cashuStore';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ManualRecoveryModal } from './ManualRecoveryModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ArrowDownLeft, ArrowUpRight, Clock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashuHistoryCardProps {
  className?: string;
}

export function CashuHistoryCard({ className }: CashuHistoryCardProps = {}) {
  const { user } = useCurrentUser();
  const { isLoading, history } = useCashuHistory();
  const transactionHistoryStore = useTransactionHistoryStore();
  const cashuStore = useCashuStore();
  const { updateProofs } = useCashuWallet();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isManualRecoveryOpen, setIsManualRecoveryOpen] = useState(false);
  const walletUiStore = useWalletUiStore();
  const isExpanded = walletUiStore.expandedCards.history;
  const [visibleEntries, setVisibleEntries] = useState(5);
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Reset visible entries when user changes to ensure fresh display
  useEffect(() => {
    setVisibleEntries(5);
  }, [user?.pubkey]);

  // Convert sats to display string honoring user preference
  const formatAmount = (sats: number) => {
    if (showSats || !btcPrice) {
      return `${sats.toLocaleString()} sats`;
    }
    return formatUSD(satsToUSD(sats, btcPrice.USD));
  };

  // Robust timestamp formatter (seconds or ms)
  const formatTimestamp = (raw: number | string | undefined) => {
    if (raw == null) return '';
    let n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    if (n < 2_000_000_000) n *= 1000; // treat as seconds
    const date = new Date(n);
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

  const loadMore = () => setVisibleEntries(prev => prev + 5);

  // Obtain combined history (includes pending) and memoize slice; prefer store entries enriched by hook
  const combined = history.length ? history : transactionHistoryStore.getCombinedHistory();
  const visible = useMemo(() => combined.slice(0, visibleEntries), [combined, visibleEntries]);

  interface HistoryLike { id: string; direction: 'in' | 'out'; amount: string | number; timestamp?: number; amountSats?: number; }

  const formatType = (t: HistoryLike) => t.direction === 'in' ? 'Received' : 'Sent';

  const isReceive = (t: HistoryLike) => t.direction === 'in';

  const extractSats = (t: HistoryLike): number => {
    if (typeof t.amount === 'number') return t.amount;
    const fromField = parseInt(String(t.amount || t.amountSats), 10);
    return isNaN(fromField) ? 0 : fromField;
  };

  const checkPendingTransaction = async (pendingTx: any) => {
    setProcessingId(pendingTx.id);

    try {
      const activeMintUrl = cashuStore.activeMintUrl;
      if (!activeMintUrl) {
        throw new Error('No active mint found');
      }

      // Use the recovery function to check this specific pending transaction
      const mintTokensFromPaidInvoice = (await import('@/lib/cashuLightning')).mintTokensFromPaidInvoice;
      const proofs = await mintTokensFromPaidInvoice(
        activeMintUrl,
        pendingTx.quoteId,
        parseInt(pendingTx.amount)
      );

      if (proofs && proofs.length > 0) {
        const totalAmount = proofs.reduce((sum: number, proof: any) => sum + proof.amount, 0);

        // Update wallet with recovered proofs
        await updateProofs({
          mintUrl: activeMintUrl,
          proofsToAdd: proofs,
          proofsToRemove: []
        });

        // Remove the pending transaction
        transactionHistoryStore.removePendingTransaction(pendingTx.id);

        console.log(`Successfully recovered ${totalAmount} sats from pending transaction`);
      } else {
        console.log('Payment not yet received - still pending');
      }
    } catch (error: any) {
      console.error('Failed to check pending transaction:', error);
      // Don't show error for expected "not paid yet" cases
      if (!error.message?.includes('not been paid yet')) {
        console.error('Unexpected error checking pending transaction:', error.message);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const Row = useCallback(({ tx }: { tx: HistoryLike }) => {
    const sats = extractSats(tx);
    const isPending = (tx as any).status === 'pending';

    return (
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isPending
              ? 'bg-yellow-100 text-yellow-600'
              : isReceive(tx)
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-600'
          }`}>
            {isPending ? (
              <Clock className="w-5 h-5" />
            ) : isReceive(tx) ? (
              <ArrowDownLeft className="w-5 h-5" />
            ) : (
              <ArrowUpRight className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-white">
              {isPending ? 'Pending' : formatType(tx)}
            </p>
            {tx.timestamp && (
              <p className="text-sm text-gray-400">{formatTimestamp(tx.timestamp)}</p>
            )}
            {isPending && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => checkPendingTransaction(tx)}
                  disabled={processingId === tx.id}
                  className="h-7 px-2 text-xs"
                >
                  {processingId === tx.id ? (
                    <>
                      <Clock className="w-3 h-3 mr-1 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Check Pending'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className={`font-medium ${
            isPending
              ? 'text-yellow-500'
              : isReceive(tx)
                ? 'text-green-500'
                : 'text-red-500'
          }`}>
            {isPending ? '+' : (isReceive(tx) ? '+' : '-')}{formatAmount(sats)}
          </p>
        </div>
      </div>
    );
  }, [formatAmount, processingId, checkPendingTransaction, showSats, btcPrice]);

  const MemoRow = memo(Row);

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Transaction History</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsManualRecoveryOpen(true)}
              className="h-8 px-3"
            >
              <Search className="w-3 h-3 mr-1" />
              Manual Recovery
            </Button>
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
        </div>

        {isExpanded && (
          <>
            {isLoading ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">Loading transactions...</p>
              </div>
      ) : combined && combined.length > 0 ? (
              <div className="space-y-4">
                {visible.map((tx: any) => (
                  <MemoRow key={tx.id} tx={tx} />
                ))}
        {combined.length > visibleEntries && (
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

      <ManualRecoveryModal
        isOpen={isManualRecoveryOpen}
        onClose={() => setIsManualRecoveryOpen(false)}
      />
    </Card>
  );
}
