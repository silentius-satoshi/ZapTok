import React, { useState } from 'react';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useCashuStore } from '@/stores/cashuStore';
import { useUserTransactionHistoryStore } from '@/stores/userTransactionHistoryStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ManualRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualRecoveryModal({ isOpen, onClose }: ManualRecoveryModalProps) {
  const { user } = useCurrentUser();
  const [paymentHash, setPaymentHash] = useState('');
  const [preimage, setPreimage] = useState('');
  const [quote, setQuote] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { updateProofs } = useCashuWallet();
  const { createHistory } = useCashuHistory();
  const cashuStore = useCashuStore();
  const transactionHistoryStore = useUserTransactionHistoryStore(user?.pubkey);

  const resetForm = () => {
    setPaymentHash('');
    setPreimage('');
    setQuote('');
    setResult(null);
    setIsRecovering(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleRecoverWithPaymentDetails = async () => {
    if (!paymentHash.trim()) {
      setResult({ type: 'error', message: 'Payment hash is required' });
      return;
    }

    setIsRecovering(true);
    setResult(null);

    try {
      const wallet = cashuStore.wallet;
      const activeMintUrl = cashuStore.activeMintUrl;
      if (!wallet || !activeMintUrl) {
        throw new Error('No active wallet or mint found');
      }

      // Try to find quote using payment hash
      const quoteId = quote.trim();
      if (!quoteId && paymentHash.trim()) {
        console.log('Looking for quote with payment hash:', paymentHash);
        // You might need to implement a method to find quote by payment hash
        // For now, we'll require the user to provide the quote ID
        if (!quote.trim()) {
          throw new Error('Quote ID is required when payment hash lookup is not available');
        }
      }

      console.log('Attempting recovery with:', { paymentHash: paymentHash.slice(0, 8) + '...', quoteId });

      // Use mintTokensFromPaidInvoice to recover the tokens
      const mintTokensFromPaidInvoice = (await import('@/lib/cashuLightning')).mintTokensFromPaidInvoice;
      const result = await mintTokensFromPaidInvoice(
        activeMintUrl,
        quoteId,
        100 // We'll need to get the amount somehow - for now assume 100 sats
      );

      if (result && result.length > 0) {
        const totalAmount = result.reduce((sum: number, proof: any) => sum + proof.amount, 0);
        
        // Update wallet with recovered proofs
        await updateProofs({ 
          mintUrl: activeMintUrl, 
          proofsToAdd: result, 
          proofsToRemove: [] 
        });

        // Create history entry
        await createHistory({
          amount: totalAmount.toString(),
          direction: 'in',
        });

        // Remove any pending transaction with this payment hash
        const pendingTxs = transactionHistoryStore.getPendingTransactions();
        const matchingPending = pendingTxs.find(tx => 
          tx.paymentRequest && tx.paymentRequest.includes(paymentHash.slice(0, 8))
        );
        if (matchingPending) {
          transactionHistoryStore.removePendingTransaction(matchingPending.id);
        }

        setResult({ 
          type: 'success', 
          message: `Successfully recovered ${totalAmount} sats! The tokens have been added to your wallet.` 
        });
        
        // Auto-close after success
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        throw new Error('No proofs received from mint - payment may not be valid or already claimed');
      }
    } catch (error: any) {
      console.error('Manual recovery failed:', error);
      setResult({ 
        type: 'error', 
        message: error.message || 'Recovery failed - please check your payment details' 
      });
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manual Transaction Recovery</DialogTitle>
          <DialogDescription>
            Recover a Lightning payment using payment details from your Lightning wallet (like Alby).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentHash">Payment Hash *</Label>
            <Input
              id="paymentHash"
              type="text"
              placeholder="Enter payment hash from your Lightning wallet"
              value={paymentHash}
              onChange={(e) => setPaymentHash(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preimage">Preimage (Optional)</Label>
            <Input
              id="preimage"
              type="text"
              placeholder="Enter preimage if available"
              value={preimage}
              onChange={(e) => setPreimage(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote">Quote ID (Required if hash lookup fails)</Label>
            <Input
              id="quote"
              type="text"
              placeholder="Enter quote ID from mint"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {result && (
            <Alert className={result.type === 'success' ? 'border-green-500' : 'border-red-500'}>
              {result.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription className={result.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleRecoverWithPaymentDetails}
              disabled={isRecovering || !paymentHash.trim()}
              className="flex-1"
            >
              {isRecovering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recovering...
                </>
              ) : (
                'Recover Payment'
              )}
            </Button>
            <Button variant="outline" onClick={handleClose} disabled={isRecovering}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
