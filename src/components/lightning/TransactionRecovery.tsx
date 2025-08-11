import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Search, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCashuStore } from '@/stores/cashuStore';
import { useUserTransactionHistoryStore } from '@/stores/userTransactionHistoryStore';
import { mintTokensFromPaidInvoice } from '@/lib/cashuLightning';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { CashuMint, CashuWallet } from '@cashu/cashu-ts';

interface TransactionRecoveryProps {
  className?: string;
}

export function TransactionRecovery({ className }: TransactionRecoveryProps) {
  const { user } = useCurrentUser();
  const [paymentHash, setPaymentHash] = useState('');
  const [preimage, setPreimage] = useState('');
  const [quoteId, setQuoteId] = useState('');
  const [amount, setAmount] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'error' | 'pending' | 'info';
    message: string;
  } | null>(null);

  const cashuStore = useCashuStore();
  const transactionHistoryStore = useUserTransactionHistoryStore(user?.pubkey);
  const { updateProofs } = useCashuWallet();
  const { createHistory } = useCashuHistory();

  const clearForm = () => {
    setPaymentHash('');
    setPreimage('');
    setQuoteId('');
    setAmount('');
    setResult(null);
  };

  const checkPendingTransactions = async () => {
    setIsChecking(true);
    setResult(null);

    try {
      const pendingTransactions = transactionHistoryStore.pendingTransactions;
      const activeMint = cashuStore.activeMintUrl || 'https://mint.chorus.community';

      if (pendingTransactions.length === 0) {
        setResult({
          type: 'info',
          message: 'No pending transactions found in local storage.'
        });
        setIsChecking(false);
        return;
      }

      let recoveredCount = 0;
      let failedCount = 0;

      for (const tx of pendingTransactions) {
        if (tx.direction === 'in' && tx.quoteId && tx.mintUrl) {
          try {
            // Attempt to mint tokens for this pending transaction
            const proofs = await mintTokensFromPaidInvoice(
              tx.mintUrl, 
              tx.quoteId, 
              parseInt(tx.amount),
              1 // Only check once, don't poll
            );

            if (proofs.length > 0) {
              // Update proofs in wallet
              await updateProofs({
                mintUrl: tx.mintUrl,
                proofsToAdd: proofs,
                proofsToRemove: [],
              });

              // Create history entry
              await createHistory({
                direction: 'in',
                amount: tx.amount,
              });

              // Remove from pending
              transactionHistoryStore.removePendingTransaction(tx.id);
              
              recoveredCount++;
            }
          } catch (error) {
            console.error(`Failed to recover transaction ${tx.id}:`, error);
            failedCount++;
          }
        }
      }

      if (recoveredCount > 0) {
        setResult({
          type: 'success',
          message: `Successfully recovered ${recoveredCount} transaction${recoveredCount > 1 ? 's' : ''}! ${failedCount > 0 ? `${failedCount} failed to recover.` : ''}`
        });
      } else if (failedCount > 0) {
        setResult({
          type: 'error',
          message: `Failed to recover ${failedCount} pending transaction${failedCount > 1 ? 's' : ''}. They may not have been paid yet.`
        });
      } else {
        setResult({
          type: 'info',
          message: 'No recoverable transactions found. Pending transactions may not have been paid yet.'
        });
      }

    } catch (error) {
      console.error('Error checking pending transactions:', error);
      setResult({
        type: 'error',
        message: `Error checking pending transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsChecking(false);
    }
  };

  const recoverWithPaymentDetails = async () => {
    if (!paymentHash.trim()) {
      setResult({
        type: 'error',
        message: 'Please enter a payment hash from your Alby transaction.'
      });
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      const activeMint = cashuStore.activeMintUrl || 'https://mint.chorus.community';
      
      // If quote ID is provided, try to recover directly
      if (quoteId.trim()) {
        try {
          const proofs = await mintTokensFromPaidInvoice(
            activeMint, 
            quoteId.trim(), 
            parseInt(amount) || 100,
            1 // Only check once
          );

          if (proofs.length > 0) {
            await updateProofs({
              mintUrl: activeMint,
              proofsToAdd: proofs,
              proofsToRemove: [],
            });

            await createHistory({
              direction: 'in',
              amount: (parseInt(amount) || 100).toString(),
            });

            setResult({
              type: 'success',
              message: `Successfully recovered ${parseInt(amount) || 100} sats from quote ${quoteId}!`
            });
            clearForm();
            return;
          }
        } catch (error) {
          console.error('Direct quote recovery failed:', error);
        }
      }

      // Try to find matching quotes in stored mint quotes
      const mintQuotes = cashuStore.mintQuotes;
      let foundQuote = false;

      for (const [quoteKey, quote] of mintQuotes.entries()) {
        if (quote.request) {
          try {
            // Check if this quote corresponds to our payment
            const mint = new CashuMint(activeMint);
            const wallet = new CashuWallet(mint);
            await wallet.loadMint();

            const updatedQuote = await wallet.checkMintQuote(quote.quote);
            
            if (updatedQuote.state === 'PAID') {
              // This quote has been paid, try to mint tokens
              const proofs = await mintTokensFromPaidInvoice(
                activeMint, 
                quote.quote, 
                quote.amount,
                1
              );

              if (proofs.length > 0) {
                await updateProofs({
                  mintUrl: activeMint,
                  proofsToAdd: proofs,
                  proofsToRemove: [],
                });

                await createHistory({
                  direction: 'in',
                  amount: quote.amount.toString(),
                });

                setResult({
                  type: 'success',
                  message: `Successfully recovered ${quote.amount} sats! Found paid quote in stored data.`
                });
                clearForm();
                foundQuote = true;
                break;
              }
            }
          } catch (error) {
            console.error('Error checking stored quote:', error);
            // Continue to next quote
          }
        }
      }

      if (!foundQuote) {
        setResult({
          type: 'error',
          message: 'Could not find or recover transaction with the provided payment hash. The quote may have expired or the payment may not have reached the mint yet.'
        });
      }

    } catch (error) {
      console.error('Error recovering transaction:', error);
      setResult({
        type: 'error',
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          <CardTitle>Transaction Recovery</CardTitle>
        </div>
        <CardDescription>
          Recover missing Cashu transactions that were paid but not credited to your wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Recovery for Pending Transactions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Quick Recovery</h4>
          <p className="text-sm text-muted-foreground">
            Check for pending transactions that may have been paid while the app was closed.
          </p>
          <Button 
            onClick={checkPendingTransactions}
            disabled={isChecking}
            className="w-full"
            variant="outline"
          >
            {isChecking ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Check Pending Transactions
          </Button>
        </div>

        <div className="border-t pt-6">
          <h4 className="text-sm font-medium mb-3">Manual Recovery</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Use payment details from your Lightning wallet (e.g., Alby) to recover a specific transaction.
          </p>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentHash">Payment Hash (Required)</Label>
              <Input
                id="paymentHash"
                placeholder="698e5997b5b246d7676b67a850e524209fad1b978b835e17260ea2d15e19b4d2"
                value={paymentHash}
                onChange={(e) => setPaymentHash(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="preimage">Preimage (Optional)</Label>
              <Input
                id="preimage"
                placeholder="5da00b22ce530a37a403884dbe82a30e06a720c2391d6039e4881e0a22d37535"
                value={preimage}
                onChange={(e) => setPreimage(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quoteId">Quote ID (If known)</Label>
                <Input
                  id="quoteId"
                  placeholder="quote_abc123..."
                  value={quoteId}
                  onChange={(e) => setQuoteId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount (sats)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={recoverWithPaymentDetails}
              disabled={isChecking || !paymentHash.trim()}
              className="w-full"
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Recover Transaction
            </Button>
          </div>
        </div>

        {result && (
          <Alert className={
            result.type === 'success' ? 'border-green-200 bg-green-50' :
            result.type === 'error' ? 'border-red-200 bg-red-50' :
            result.type === 'pending' ? 'border-yellow-200 bg-yellow-50' :
            'border-blue-200 bg-blue-50'
          }>
            {result.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {result.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
            {result.type === 'pending' && <RefreshCw className="h-4 w-4 text-yellow-600" />}
            {result.type === 'info' && <AlertCircle className="h-4 w-4 text-blue-600" />}
            <AlertDescription className="ml-2">
              {result.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-2">
          <p><strong>How this works:</strong></p>
          <ul className="space-y-1 ml-4">
            <li>• <strong>Quick Recovery:</strong> Checks locally stored pending transactions</li>
            <li>• <strong>Manual Recovery:</strong> Uses payment details to search for paid invoices</li>
            <li>• <strong>Payment Hash:</strong> Copy from your Lightning wallet's transaction history</li>
            <li>• <strong>Quote ID:</strong> If you remember the invoice creation, provide the quote ID</li>
          </ul>
          <p className="mt-2">
            <strong>Note:</strong> Recovery only works for transactions that were actually paid but not credited due to app closure or network issues.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
