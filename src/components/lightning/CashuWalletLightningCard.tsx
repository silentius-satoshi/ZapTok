import { useState, useRef, useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, QrCode, Zap, Copy, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuStore } from '@/stores/cashuStore';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useUserTransactionHistoryStore } from '@/stores/userTransactionHistoryStore';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { createLightningInvoice, mintTokensFromPaidInvoice, createMeltQuote, payLightningInvoice } from '@/lib/cashuLightning';
import { QRScanner } from '@/components/QRScanner';
import { v4 as uuidv4 } from 'uuid';
import type { PendingTransaction } from '@/stores/userTransactionHistoryStore';
import QRCode from 'react-qr-code';
import { formatBalance } from '@/lib/cashu';
import { AlertCircle as _A11yIgnore } from 'lucide-react'; // keep import unique (eslint satisfaction)
// Chorus-style Lightning card replication: invoice QR, copy, cancel flow, fee display, improved loading states

export function CashuWalletLightningCard() {
  const { user } = useCurrentUser();
  const {
    wallet,
    isLoading,
    isWalletLoading,
    isTokensLoading,
    walletError,
    tokensError,
    updateProofs,
    createWallet,
  } = useCashuWallet();
  const { createHistory } = useCashuHistory();
  const cashuStore = useCashuStore();
  const transactionHistoryStore = useUserTransactionHistoryStore(user?.pubkey);
  const walletUiStore = useWalletUiStore();
  const isExpanded = walletUiStore.expandedCards.lightning;
  const [activeTab, setActiveTab] = useState("receive");

  const [receiveAmount, setReceiveAmount] = useState("");
  const [invoice, setInvoice] = useState("");
  const [currentMeltQuoteId, setcurrentMeltQuoteId] = useState("");

  const [sendInvoice, setSendInvoice] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState<number | null>(null);
  const [invoiceFeeReserve, setInvoiceFeeReserve] = useState<number | null>(
    null
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const processingInvoiceRef = useRef<string | null>(null);

  // Get default mint URL - use first available mint or default
  const getActiveMintUrl = () => {
    if (cashuStore.activeMintUrl) {
      return cashuStore.activeMintUrl;
    }
    if (wallet && wallet.mints && wallet.mints.length > 0) {
      return wallet.mints[0];
    }
    // Return default mint URL if no wallet exists yet
    return "https://mint.chorus.community";
  };

  // Handle receive tab - works without existing wallet
  const handleCreateInvoice = async () => {
    if (!user) {
      setError("Please log in to create an invoice");
      return;
    }

    if (!receiveAmount || isNaN(parseInt(receiveAmount))) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const mintUrl = getActiveMintUrl();
      const amount = parseInt(receiveAmount);
      const invoiceData = await createLightningInvoice(mintUrl, amount);

      setInvoice(invoiceData.paymentRequest);
      setcurrentMeltQuoteId(invoiceData.quoteId);

      // Create pending transaction
      const pendingTxId = uuidv4();
      const pendingTransaction: PendingTransaction = {
        id: pendingTxId,
        direction: "in",
        amount: amount.toString(),
        timestamp: Math.floor(Date.now() / 1000),
        status: "pending",
        mintUrl: mintUrl,
        quoteId: invoiceData.quoteId,
        paymentRequest: invoiceData.paymentRequest,
      };

      // Store the pending transaction
      transactionHistoryStore.addPendingTransaction(pendingTransaction);

      // Start polling for payment status
      checkPaymentStatus(
        mintUrl,
        invoiceData.quoteId,
        amount,
        pendingTxId
      );
    } catch (error) {
      console.error("Error creating invoice:", error);
      setError(
        "Failed to create Lightning invoice: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll for payment status with auto-wallet creation
  const checkPaymentStatus = async (
    mintUrl: string,
    quoteId: string,
    amount: number,
    pendingTxId: string
  ) => {
    try {
      // Check if payment has been received
      const proofs = await mintTokensFromPaidInvoice(mintUrl, quoteId, amount);

      if (proofs.length > 0) {
        // Update proofs - this will handle wallet creation if needed
        await updateProofs({
          mintUrl,
          proofsToAdd: proofs,
          proofsToRemove: [],
        });

        // Set the mint as active if none is set
        if (!cashuStore.activeMintUrl) {
          cashuStore.setActiveMintUrl(mintUrl);
        }

        // Get token event ID
        const tokenEventId = cashuStore.getProofEventId(proofs[0]);

        // Create history event if we got a token ID
        if (tokenEventId) {
          await createHistory({
            direction: "in",
            amount: amount.toString(),
          });
        }

        // Remove pending transaction
        transactionHistoryStore.removePendingTransaction(pendingTxId);

        setSuccess(`Successfully received ${amount} sats`);
        setInvoice("");
        setcurrentMeltQuoteId("");
        setReceiveAmount("");
      } else {
        // Poll again after a delay
        setTimeout(() => checkPaymentStatus(mintUrl, quoteId, amount, pendingTxId), 2000);
      }
    } catch (error) {
      // If it's not a "not paid yet" error, show the error
      console.error("Error checking payment status:", error);
    }
  };

  // Copy invoice to clipboard
  const copyInvoiceToClipboard = () => {
    navigator.clipboard.writeText(invoice);
    setSuccess("Invoice copied to clipboard");
    setTimeout(() => setSuccess(null), 3000);
  };

  // Handle send tab
  const handleInvoiceInput = async (value: string) => {
    if (!cashuStore.activeMintUrl) {
      setError(
        "No active mint selected. Please select a mint in your wallet settings."
      );
      return;
    }

    // Prevent duplicate processing of the same invoice
    if (processingInvoiceRef.current === value || currentMeltQuoteId) {
      return;
    }

    setSendInvoice(value);
    processingInvoiceRef.current = value;

    // Create melt quote
    const mintUrl = cashuStore.activeMintUrl;
    try {
      setIsLoadingInvoice(true);
      setError(null);

      const meltQuote = await createMeltQuote(mintUrl, value);
      setInvoiceAmount(meltQuote.amount);
      setInvoiceFeeReserve(meltQuote.fee_reserve);
      setcurrentMeltQuoteId(meltQuote.quote);
    } catch (error) {
      console.error("Error creating melt quote:", error);
      setError(
        "Failed to process invoice: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  // Start QR scanner
  const startQrScanner = () => {
    setIsScannerOpen(true);
  };

  // Handle QR scan result
  const handleQRScan = async (data: string) => {
    // Check if it's a Lightning invoice (starts with 'lightning:' or 'lnbc')
    const cleanedData = data.replace(/^lightning:/i, "");

    // Basic validation for Lightning invoice format
    if (
      cleanedData.toLowerCase().startsWith("lnbc") ||
      cleanedData.toLowerCase().startsWith("lntb") ||
      cleanedData.toLowerCase().startsWith("lnbcrt")
    ) {
      await handleInvoiceInput(cleanedData);
      setIsScannerOpen(false);
    } else {
      setError("Invalid Lightning invoice format");
    }
  };

  // Pay Lightning invoice
  const handlePayInvoice = async () => {
    if (!sendInvoice) {
      setError("Please enter an invoice");
      return;
    }

    if (error && sendInvoice) {
      setError("Please fix the invoice error first");
      return;
    }

    if (!cashuStore.activeMintUrl) {
      setError(
        "No active mint selected. Please select a mint in your wallet settings."
      );
      return;
    }

    if (!invoiceAmount) {
      setError("Invoice amount not available");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const result = await payLightningInvoice(
        cashuStore.activeMintUrl,
        currentMeltQuoteId,
        cashuStore.proofs
      );

      // Update proofs
      await updateProofs({
        mintUrl: cashuStore.activeMintUrl,
        proofsToAdd: result.change || [],
        proofsToRemove: result.send,
      });

      // Create history event
      await createHistory({
        direction: "out",
        amount: invoiceAmount.toString(),
      });

      setSuccess(`Successfully paid ${invoiceAmount} sats`);
      setSendInvoice("");
      setInvoiceAmount(null);
      setInvoiceFeeReserve(null);
      setcurrentMeltQuoteId("");
      processingInvoiceRef.current = null;
    } catch (error) {
      console.error("Error paying invoice:", error);
      setError(
        "Failed to pay invoice: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // If the component unmounts or the user cancels, make sure we don't remove the pending transaction
  const handleCancel = () => {
    setInvoice("");
    setcurrentMeltQuoteId("");
    setSendInvoice("");
    setInvoiceAmount(null);
    setInvoiceFeeReserve(null);
    processingInvoiceRef.current = null;
    // Don't remove the pending transaction, leave it in the history
  };

  // Memoize loading states to prevent unnecessary re-renders
  const compositeLoading = useMemo(() => 
    isLoading || isWalletLoading || isTokensLoading, 
    [isLoading, isWalletLoading, isTokensLoading]
  );
  
  const loadingMessage = useMemo(() => {
    if (isWalletLoading && isTokensLoading) return 'Loading wallet and tokens...';
    if (isWalletLoading) return 'Loading wallet...';
    if (isTokensLoading) return 'Loading tokens...';
    return 'Loading...';
  }, [isWalletLoading, isTokensLoading]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <CardTitle>Lightning</CardTitle>
          </div>
          <CardDescription>Withdraw or deposit Bitcoin</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => walletUiStore.toggleCardExpansion('lightning')}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          className="h-6 w-6 p-0"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          {compositeLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{loadingMessage}</span>
            </div>
          )}
          
          {!user ? (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Please log in to use Lightning features.</AlertDescription>
            </Alert>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="receive">
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  Receive
                </TabsTrigger>
                <TabsTrigger value="send" disabled={!wallet}>
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Send
                </TabsTrigger>
              </TabsList>

              <TabsContent value="receive" className="space-y-4 mt-4">
                {!invoice && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (sats)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="100"
                        value={receiveAmount}
                        onChange={(e) => setReceiveAmount(e.target.value)}
                        disabled={isProcessing || compositeLoading}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleCreateInvoice}
                      disabled={isProcessing || !receiveAmount || !user || compositeLoading}
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isProcessing ? 'Creating Invoice...' : 'Create Lightning Invoice'}
                    </Button>
                  </>
                )}
                {invoice && (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-md flex items-center justify-center">
                      <div className="border border-border w-48 h-48 flex items-center justify-center bg-white p-2 rounded-md">
                        <QRCode value={invoice} size={180} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Lightning Invoice</Label>
                      <div className="relative">
                        <Input readOnly value={invoice} className="pr-10 font-mono text-xs break-all" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={copyInvoiceToClipboard}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Waiting for payment...</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCancel}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="send" className="space-y-4 mt-4">
                {!wallet ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Create a wallet in the Mints card to send Lightning payments.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="invoice">Lightning Invoice</Label>
                      <div className="flex gap-2">
                        <Input
                          id="invoice"
                          placeholder="lnbc..."
                          value={sendInvoice}
                          onChange={(e) => handleInvoiceInput(e.target.value)}
                          disabled={isProcessing || compositeLoading}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={startQrScanner}
                          title="Scan QR Code"
                          disabled={isProcessing || compositeLoading}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                {invoiceAmount && (
                  <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span>{formatBalance(invoiceAmount)}</span>
                    </div>
                    {invoiceFeeReserve && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Fee Reserve:</span>
                        <span>{formatBalance(invoiceFeeReserve)} max</span>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={handlePayInvoice}
                  disabled={!sendInvoice || !user || isProcessing || isLoadingInvoice || compositeLoading}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Paying...
                    </>
                  ) : isLoadingInvoice ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...
                    </>
                  ) : (
                    'Pay Invoice'
                  )}
                </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mt-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          {(walletError || tokensError) && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{walletError?.message || tokensError?.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQRScan}
        title="Scan Lightning Invoice"
        description="Position the Lightning invoice QR code within the frame"
      />
    </Card>
  );
}