import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
// Removed Alert components after simplifying connection gating
// import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Wallet,
  Zap,
  RefreshCw,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Bitcoin,
  Send,
  QrCode,
  Copy,
  Plus
} from 'lucide-react';
import { init, launchPaymentModal } from '@getalby/bitcoin-connect-react';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { decodeLightningInvoice, validateLightningInvoice, formatInvoiceAmount } from '@/lib/lightning-invoice';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number;
  description?: string;
  preimage?: string;
  timestamp: number;
  status: 'settled' | 'pending' | 'failed';
}

interface BunkerWalletDashboardProps {
  className?: string;
}

interface PaymentForm {
  invoice?: string;
  amount?: number;
  description?: string;
}

interface InvoiceForm {
  amount: number;
  description: string;
}

export function BunkerWalletDashboard({ className }: BunkerWalletDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletCapabilities, setWalletCapabilities] = useState<string[]>([]);

  // Payment state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({});
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({ amount: 0, description: '' });
  const [generatedInvoice, setGeneratedInvoice] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [invoiceValidation, setInvoiceValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });

  const { toast } = useToast();
  const { user } = useCurrentUser();
  const isMobile = useIsMobile();
  const { data: btcPrice } = useBitcoinPrice();
  const { showSats, toggleCurrency } = useCurrencyDisplayStore();

  const {
  isConnected,
  walletInfo,
  provider,
  connect,
  disconnect,
  getBalance
  } = useWallet();

  // Initialize Bitcoin Connect for bunker signers
  useEffect(() => {
    if (user?.pubkey) {
      init({
        appName: 'ZapTok',
        filters: ['nwc'],
        showBalance: true,
        autoConnect: false,
        providerConfig: {
          nwc: {
            authorizationUrlOptions: {
              requestMethods: ['get_balance', 'make_invoice', 'lookup_invoice', 'list_transactions'],
            },
          },
        },
      });
    }
  }, [user?.pubkey]);

  // Load wallet capabilities
  useEffect(() => {
    if (provider) {
      const capabilities: string[] = [];
      if (typeof provider.getBalance === 'function') capabilities.push('Balance');
      if (typeof provider.sendPayment === 'function') capabilities.push('Send');
      if (typeof provider.makeInvoice === 'function') capabilities.push('Receive');
      if (typeof provider.listTransactions === 'function') capabilities.push('History');
      setWalletCapabilities(capabilities);
    }
  }, [provider]);

  const refreshWalletData = useCallback(async () => {
    if (!provider) return;

    setIsRefreshing(true);
    try {
      // Refresh balance
      await getBalance();

      // Try to load transaction history
      if (provider.listTransactions) {
        try {
          const txResponse = await provider.listTransactions({ limit: 10 });
          if (txResponse && Array.isArray(txResponse.transactions)) {
            const formattedTxs: Transaction[] = txResponse.transactions.map((tx: any) => ({
              id: tx.payment_hash || tx.r_hash || Math.random().toString(36),
              type: tx.type === 'incoming' || tx.value > 0 ? 'receive' : 'send',
              amount: Math.abs(tx.value || tx.amount || 0),
              description: tx.description || tx.memo || 'Lightning transaction',
              preimage: tx.preimage,
              timestamp: tx.creation_date ? tx.creation_date * 1000 : Date.now(),
              status: tx.settled ? 'settled' : 'pending'
            }));
            setTransactions(formattedTxs.slice(0, 5)); // Show last 5 transactions
          }
        } catch (txError) {
          console.warn('Failed to load transaction history:', txError);
        }
      }

      setLastRefresh(new Date());
      toast({
        title: "Wallet Refreshed",
        description: "Latest wallet data loaded successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh wallet data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [provider, getBalance, toast]);

  // Payment Functions
  const handleSendPayment = async () => {
    if (!provider || !paymentForm.invoice) return;

    // Validate invoice first
    const validation = validateLightningInvoice(paymentForm.invoice);
    if (!validation.valid) {
      toast({
        title: "Invalid Invoice",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Try to send payment using provider directly first
      if (provider.sendPayment) {
        const result = await provider.sendPayment(paymentForm.invoice);
        toast({
          title: "Payment Sent",
          description: `Successfully sent payment`,
        });
        setPaymentForm({});
        setIsPaymentModalOpen(false);
        refreshWalletData();
      } else {
        throw new Error('Send payment not supported');
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to send payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleInvoiceChange = (invoice: string) => {
    setPaymentForm({ ...paymentForm, invoice });

    if (invoice) {
      // Validate invoice and extract amount
      const validation = validateLightningInvoice(invoice);
      setInvoiceValidation(validation);

      if (validation.valid) {
        const decoded = decodeLightningInvoice(invoice);
        if (decoded) {
          setPaymentForm(prev => ({
            ...prev,
            amount: decoded.amount,
            description: decoded.description || prev.description
          }));
        }
      }
    } else {
      setInvoiceValidation({ valid: true });
    }
  };

  const handleQuickSend = async (amount: number, description?: string) => {
    try {
      // For quick send, we need an invoice. Let's use a placeholder or prompt for one
      // This is a simplified implementation - in practice you'd want to get the invoice from user input
      if (!paymentForm.invoice) {
        toast({
          title: "Invoice Required",
          description: "Please enter an invoice first",
          variant: "destructive",
        });
        return;
      }

      // Use Bitcoin Connect's payment modal
      await launchPaymentModal({
        invoice: paymentForm.invoice,
        onPaid: (response) => {
          toast({
            title: "Payment Sent",
            description: `Successfully sent ${amount} sats`,
          });
          refreshWalletData();
        },
        onCancelled: () => {
          toast({
            title: "Payment Cancelled",
            description: "Payment was cancelled by user",
          });
        }
      });
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive",
      });
    }
  };

  const handleGenerateInvoice = async () => {
    if (!provider || !provider.makeInvoice || !invoiceForm.amount) return;

    setIsGeneratingInvoice(true);
    try {
      const response = await provider.makeInvoice({
        amount: invoiceForm.amount * 1000, // Convert sats to msats
        defaultMemo: invoiceForm.description || `Invoice for ${invoiceForm.amount} sats`,
      });

      if (response && response.paymentRequest) {
        setGeneratedInvoice(response.paymentRequest);
        toast({
          title: "Invoice Generated",
          description: `Created invoice for ${invoiceForm.amount} sats`,
        });
      }
    } catch (error) {
      toast({
        title: "Invoice Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
      await refreshWalletData();
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setTransactions([]);
      setWalletCapabilities([]);
      setLastRefresh(null);
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  const formatBalance = (amount: number) => {
    if (showSats) {
      return `${amount.toLocaleString()} sats`;
    } else if (btcPrice) {
      return formatUSD(satsToUSD(amount, btcPrice.usd));
    }
    return `${amount.toLocaleString()} sats`;
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-yellow-500/5 to-amber-500/10" />

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>Lightning Wallet</span>
                <Badge variant="outline" className="text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Bitcoin Connect
                </Badge>
              </CardTitle>
              <CardDescription>
                {walletInfo?.alias || 'Lightning Wallet via Bitcoin Connect'}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Connected Wallet Dashboard */}
        <div className="space-y-6">
            {/* Balance Section */}
            <div className="text-center space-y-3">
              <div className="space-y-1">
                <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>
                  {formatBalance(walletInfo?.balance || 0)}
                </div>
                <div className="text-sm text-gray-400">Available Balance</div>
              </div>

              <div className="flex items-center justify-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleCurrency}
                  className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Bitcoin className="h-3 w-3 mr-1" />
                  Show in {showSats ? "USD" : "sats"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshWalletData}
                  disabled={isRefreshing}
                  className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              {lastRefresh && (
                <div className="text-xs text-gray-500">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </div>
              )}
            </div>

            <Separator />

            {/* Quick Payment Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Quick Actions</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {/* Send Payment Dialog */}
                <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!walletCapabilities.includes('Send')}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Send Lightning Payment</DialogTitle>
                      <DialogDescription>
                        Enter a Lightning invoice or amount to send
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="invoice">Lightning Invoice</Label>
                        <Textarea
                          id="invoice"
                          placeholder="lnbc1000n1p..."
                          value={paymentForm.invoice || ''}
                          onChange={(e) => handleInvoiceChange(e.target.value)}
                          className={cn(
                            "min-h-20",
                            !invoiceValidation.valid && paymentForm.invoice && "border-red-500"
                          )}
                        />
                        {!invoiceValidation.valid && paymentForm.invoice && (
                          <p className="text-sm text-red-500">{invoiceValidation.error}</p>
                        )}
                        {invoiceValidation.valid && paymentForm.invoice && paymentForm.amount && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                            <p className="text-green-700">
                              <strong>Amount:</strong> {formatInvoiceAmount(paymentForm.amount)}
                            </p>
                            {paymentForm.description && (
                              <p className="text-green-700">
                                <strong>Description:</strong> {paymentForm.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="amount">Amount (sats)</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="Auto-filled from invoice"
                            value={paymentForm.amount || ''}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseInt(e.target.value) })}
                            disabled={!!paymentForm.invoice && !!paymentForm.amount}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            placeholder="Auto-filled from invoice"
                            value={paymentForm.description || ''}
                            onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                            disabled={!!paymentForm.invoice && !!paymentForm.description}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsPaymentModalOpen(false);
                            setPaymentForm({});
                            setInvoiceValidation({ valid: true });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSendPayment}
                          disabled={!paymentForm.invoice || !invoiceValidation.valid || isProcessingPayment}
                        >
                          {isProcessingPayment ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Send {paymentForm.amount ? formatInvoiceAmount(paymentForm.amount) : 'Payment'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Generate Invoice Dialog */}
                <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!walletCapabilities.includes('Receive')}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Receive
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Generate Lightning Invoice</DialogTitle>
                      <DialogDescription>
                        Create an invoice to receive Lightning payments
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!generatedInvoice ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="invoiceAmount">Amount (sats)</Label>
                            <Input
                              id="invoiceAmount"
                              type="number"
                              placeholder="1000"
                              value={invoiceForm.amount || ''}
                              onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: parseInt(e.target.value) })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="invoiceDescription">Description</Label>
                            <Input
                              id="invoiceDescription"
                              placeholder="Payment for services"
                              value={invoiceForm.description}
                              onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                            />
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setInvoiceForm({ amount: 0, description: '' });
                                setIsInvoiceModalOpen(false);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleGenerateInvoice}
                              disabled={!invoiceForm.amount || isGeneratingInvoice}
                            >
                              {isGeneratingInvoice ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4 mr-2" />
                              )}
                              Generate Invoice
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>Generated Invoice</Label>
                            <div className="p-3 bg-muted rounded-lg">
                              <code className="text-xs break-all">{generatedInvoice}</code>
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setGeneratedInvoice('');
                                setInvoiceForm({ amount: 0, description: '' });
                                setIsInvoiceModalOpen(false);
                              }}
                            >
                              Close
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setGeneratedInvoice('');
                                setInvoiceForm({ amount: 0, description: '' });
                              }}
                            >
                              New Invoice
                            </Button>
                            <Button
                              onClick={() => copyToClipboard(generatedInvoice, 'Invoice')}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Invoice
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Quick Send Amounts */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Quick Send</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 500, 1000, 5000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSend(amount)}
                      disabled={!walletCapabilities.includes('Send')}
                      className="text-xs"
                    >
                      {amount}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Wallet Capabilities */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Wallet Capabilities</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {walletCapabilities.map((capability) => (
                  <Badge key={capability} variant="secondary" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Recent Transactions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Recent Activity</span>
              </h4>

              {transactions.length > 0 ? (
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "p-1 rounded-full",
                            tx.type === 'receive' ? 'bg-green-500/20' : 'bg-red-500/20'
                          )}>
                            {tx.type === 'receive' ? (
                              <ArrowDownLeft className="w-3 h-3 text-green-500" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium">
                              {tx.type === 'receive' ? 'Received' : 'Sent'}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-32">
                              {tx.description}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-xs font-medium",
                            tx.type === 'receive' ? 'text-green-500' : 'text-red-500'
                          )}>
                            {tx.type === 'receive' ? '+' : '-'}{formatBalance(tx.amount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-4 text-sm text-gray-500">
                  No recent transactions
                </div>
              )}
            </div>

            <Separator />

            {/* Connection Management */}
            <div className="flex flex-col space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={refreshWalletData}
                  disabled={isRefreshing || !isConnected}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
                {isConnected ? (
                  <Button
                    onClick={handleDisconnect}
                    variant="destructive"
                    className="flex-1"
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnect}
                    variant="default"
                    className="flex-1"
                  >
                    Connect Wallet
                  </Button>
                )}
              </div>
              {!isConnected && (
                <p className="text-xs text-muted-foreground text-center">
                  Not connected. You can still browse, but actions are disabled until you connect.
                </p>
              )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}