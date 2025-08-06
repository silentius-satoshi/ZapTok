import { useState, useRef } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, QrCode, Zap } from 'lucide-react';
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
import { useTransactionHistoryStore } from '@/stores/transactionHistoryStore';
import { useWalletUiStore } from '@/stores/walletUiStore';
import { createLightningInvoice, mintTokensFromPaidInvoice, createMeltQuote, payLightningInvoice } from '@/lib/cashuLightning';
import { QRScanner } from '@/components/QRScanner';
import { v4 as uuidv4 } from 'uuid';
import type { PendingTransaction } from '@/stores/transactionHistoryStore';

export function CashuWalletLightningCard() {
  const { user } = useCurrentUser();
  const { 
    wallet, 
    isLoading, 
    isWalletLoading, 
    isTokensLoading, 
    walletError, 
    tokensError, 
    updateProofs 
  } = useCashuWallet();
  const { createHistory } = useCashuHistory();
  const cashuStore = useCashuStore();
  const transactionHistoryStore = useTransactionHistoryStore();
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

  // Handle receive tab
  const handleCreateInvoice = async () => {
    if (!cashuStore.activeMintUrl) {
      setError(
        "No active mint selected. Please select a mint in your wallet settings."
      );
      return;
    }

    if (!receiveAmount || isNaN(parseInt(receiveAmount))) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const amount = parseInt(receiveAmount);
      const invoiceData = await createLightningInvoice(
        cashuStore.activeMintUrl,
        amount
      );

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
        mintUrl: cashuStore.activeMintUrl,
        quoteId: invoiceData.quoteId,
        paymentRequest: invoiceData.paymentRequest,
      };

      // Store the pending transaction
      transactionHistoryStore.addPendingTransaction(pendingTransaction);

      // Start polling for payment status
      checkPaymentStatus(
        cashuStore.activeMintUrl,
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

  // Poll for payment status
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
        // Update proofs
        await updateProofs({
          mintUrl,
          proofsToAdd: proofs,
          proofsToRemove: [],
        });

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

  if (isLoading) {
    const loadingMessage = isWalletLoading && isTokensLoading 
      ? "Loading wallet and tokens..."
      : isWalletLoading 
      ? "Loading wallet..."
      : isTokensLoading 
      ? "Loading tokens..."
      : "Loading...";
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lightning</CardTitle>
          <CardDescription>{loadingMessage}</CardDescription>
          {(walletError || tokensError) && (
            <Alert className="mt-2">
              <AlertDescription>
                {walletError?.message || tokensError?.message}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lightning</CardTitle>
          <CardDescription>Create a wallet first</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <CardTitle>Lightning</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => walletUiStore.toggleCardExpansion("lightning")}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">Withdraw or deposit Bitcoin</p>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="receive">
                <ArrowDownLeft className="h-4 w-4 mr-2" />
                Receive
              </TabsTrigger>
              <TabsTrigger value="send">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Send
              </TabsTrigger>
            </TabsList>

            <TabsContent value="receive" className="space-y-4 mt-4">
              {!invoice ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (sats)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="100"
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCreateInvoice}
                    disabled={!receiveAmount || !user || isProcessing}
                  >
                    {isProcessing ? "Creating..." : "Create Lightning Invoice"}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Lightning Invoice</Label>
                    <div className="p-3 bg-muted rounded-md break-all text-sm font-mono">
                      {invoice}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={copyInvoiceToClipboard} className="flex-1">
                      Copy Invoice
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="send" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="invoice">Lightning Invoice</Label>
                <div className="flex gap-2">
                  <Input
                    id="invoice"
                    placeholder="lnbc..."
                    value={sendInvoice}
                    onChange={(e) => handleInvoiceInput(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={startQrScanner}
                    title="Scan QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {invoiceAmount && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex justify-between text-sm">
                    <span>Amount:</span>
                    <span>{invoiceAmount} sats</span>
                  </div>
                  {invoiceFeeReserve && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Fee Reserve:</span>
                      <span>{invoiceFeeReserve} sats</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handlePayInvoice}
                disabled={!sendInvoice || !user || isProcessing || isLoadingInvoice}
              >
                {isProcessing
                  ? "Paying..."
                  : isLoadingInvoice
                  ? "Loading..."
                  : "Pay Invoice"}
              </Button>
            </TabsContent>
          </Tabs>

          {(error) && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <AlertDescription>{success}</AlertDescription>
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