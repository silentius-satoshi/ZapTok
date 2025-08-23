import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { getLightningAddress, getLNURLPayEndpoint, createZapRequest, corsAwareFetch } from '@/lib/lightning';
import { getPaymentSuggestion } from '@/lib/lightning-providers';
import { Settings, Zap, Wallet, CreditCard, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { genUserName } from '@/lib/genUserName';
import { useUnifiedWallet } from '@/contexts/UnifiedWalletContext';
import { zapNote } from '@/lib/zap';
import { LightningInvoice } from '@/components/LightningInvoice';

interface QuickZapProps {
  isOpen: boolean;
  onClose: () => void;
  recipientPubkey: string;
  eventId?: string;
  onZapSuccess?: () => void;
}

export function QuickZap({
  isOpen,
  onClose,
  recipientPubkey,
  eventId,
  onZapSuccess,
}: QuickZapProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { sendPayment: unifiedSendPayment, isConnected: walletConnected, activeWalletType } = useUnifiedWallet();
  const [isZapping, setIsZapping] = useState(false);
  const [zapAmount, setZapAmount] = useState(21);
  const [paymentMethod, setPaymentMethod] = useState<'webln' | 'unified'>('webln');
  const [currentInvoice, setCurrentInvoice] = useState<string | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  // Get recipient info for display
  const { data: authorData } = useAuthor(recipientPubkey);

  // Get smart payment recommendations based on Lightning provider
  const lightningAddress = getLightningAddress(authorData?.metadata);
  const paymentSuggestion = lightningAddress ? getPaymentSuggestion(lightningAddress) : null;

  // Auto-select best payment method when modal opens
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Auto-select payment method based on provider capabilities
  if (!hasAutoSelected && paymentSuggestion && isOpen) {
    if (paymentSuggestion.shouldUseCashu && walletConnected) {
      setPaymentMethod('unified');
    } else if (paymentSuggestion.canUseWebLN && window.webln) {
      setPaymentMethod('webln');
    }
    setHasAutoSelected(true);
  }

  // Reset auto-selection when modal closes
  if (!isOpen && hasAutoSelected) {
    setHasAutoSelected(false);
  }

  const getUserName = (pubkey: string) => {
    if (authorData?.metadata?.name) return authorData.metadata.name;
    if (authorData?.metadata?.display_name) return authorData.metadata.display_name;
    return genUserName(pubkey);
  };

  const updateZapAmount = (value: string) => {
    const amount = parseInt(value.replace(/,/g, ''));
    if (isNaN(amount) || amount < 1) {
      setZapAmount(21);
      return;
    }
    setZapAmount(amount);
  };

  const quickZap = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to send zaps",
        variant: "destructive",
      });
      return;
    }

    // Check if recipient has a Lightning address
    const lightningAddress = getLightningAddress(authorData?.metadata);
    if (!lightningAddress) {
      toast({
        title: "Zap Not Available",
        description: "This user hasn't set up Lightning payments in their profile.",
        variant: "destructive",
      });
      return;
    }

    // Check if the Lightning provider is blocked
    if (paymentSuggestion?.isBlocked) {
      toast({
        title: "Provider Not Supported",
        description: paymentSuggestion.message,
        variant: "destructive",
      });
      return;
    }

    setIsZapping(true);

    try {
      if (paymentMethod === 'webln') {
        await zapWithWebLN();
      } else {
        await zapWithUnifiedWallet();
      }
    } catch (error) {
      console.error('Quick zap error:', error);

      // Provide helpful suggestions based on the error and payment method
      let errorMessage = error instanceof Error ? error.message : "Failed to send zap. Please try again.";
      let errorTitle = "Zap Failed";

      if (paymentMethod === 'webln' && error instanceof Error && error.message.includes('CORS')) {
        errorTitle = "Connection Issue";
        errorMessage = "WebLN payment blocked by browser security. Try using the Cashu wallet option instead.";

        // Auto-switch to unified wallet if available
        if (walletConnected) {
          setTimeout(() => {
            setPaymentMethod('unified');
            toast({
              title: "Switched to Cashu Wallet",
              description: "Try your zap again with the Cashu wallet option.",
            });
          }, 2000);
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsZapping(false);
    }
  };

  const zapWithWebLN = async () => {
    // Check if WebLN is available
    if (!window.webln) {
      throw new Error('Please install the Alby browser extension to send Lightning payments');
    }

    console.log('🔌 Enabling WebLN...');
    await window.webln.enable();

    console.log('⚡ Starting WebLN zap process:', {
      recipient: recipientPubkey,
      amount: zapAmount,
      lightningAddress: getLightningAddress(authorData?.metadata)
    });

    // Get the LNURL-pay endpoint
    console.log('📡 Getting LNURL endpoint...');
    const zapEndpoint = await getLNURLPayEndpoint(getLightningAddress(authorData?.metadata)!);
    if (!zapEndpoint) {
      throw new Error('Failed to get payment endpoint');
    }

    console.log('📝 Creating zap request...');
    // Create the zap request
    const zapRequest = createZapRequest(recipientPubkey, zapAmount, '', eventId);

    try {
      // Request invoice from the Lightning service
      console.log('💳 Requesting invoice...');

      const response = await corsAwareFetch(zapEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          amount: zapAmount * 1000, // Convert to millisats
          nostr: JSON.stringify(zapRequest),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Invoice request failed:', response.status, errorText);
        throw new Error(`Invoice request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('💰 Invoice response:', data);

      const invoice = data.pr;
      if (!invoice) {
        throw new Error('No invoice in response');
      }

      // Show invoice preview first
      setCurrentInvoice(invoice);
      setShowInvoicePreview(true);

    } catch (fetchError) {
      // If CORS fails, provide a helpful error message
      if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
        throw new Error('CORS error - try using the Cashu wallet option instead, or use a different Lightning address provider.');
      }
      throw fetchError;
    }
  };

  const executeWebLNPayment = async (invoice: string) => {
    try {
      // Double-check WebLN is available
      if (!window.webln) {
        throw new Error('WebLN is not available');
      }

      console.log('💸 Sending payment via WebLN...');
      // Pay the invoice using WebLN
      const paymentResult = await window.webln.sendPayment(invoice);
      console.log('✅ WebLN payment successful:', paymentResult);

      toast({
        title: "Zap Sent! ⚡",
        description: `Successfully sent ${zapAmount} sats to ${getUserName(recipientPubkey)} via Alby`,
      });

      onZapSuccess?.();
      onClose();
      setShowInvoicePreview(false);
      setCurrentInvoice(null);

    } catch (paymentError) {
      console.error('WebLN payment failed:', paymentError);
      throw new Error(`Payment failed: ${paymentError instanceof Error ? paymentError.message : 'Unknown error'}`);
    }
  };

  const zapWithUnifiedWallet = async () => {
    if (!walletConnected) {
      throw new Error('Please connect a wallet first');
    }

    if (!user) {
      throw new Error('User not logged in');
    }

    console.log('⚡ Starting unified wallet zap process:', {
      recipient: recipientPubkey,
      amount: zapAmount,
      walletType: activeWalletType
    });

    // Create a mock event for the zap function
    const mockEvent = {
      id: eventId || 'profile-zap',
      pubkey: recipientPubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: '',
      sig: ''
    };

    // Use the existing zap function with unified wallet
    const success = await zapNote(
      mockEvent,
      user.pubkey,
      zapAmount,
      '',
      authorData?.metadata,
      unifiedSendPayment
    );

    if (!success) {
      throw new Error('Payment failed');
    }

    console.log('✅ Unified wallet payment successful');

    toast({
      title: "Zap Sent! ⚡",
      description: `Successfully sent ${zapAmount} sats to ${getUserName(recipientPubkey)} via ${activeWalletType}`,
    });

    onZapSuccess?.();
    onClose();
  };

  const navigateToZapSettings = () => {
    onClose();
    navigate('/settings?section=zaps');
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-white text-center flex items-center justify-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-orange-500" />
              Quick Zap
            </DialogTitle>
            {/* Show Lightning address if available */}
            {getLightningAddress(authorData?.metadata) ? (
              <p className="text-xs text-muted-foreground text-center px-2">
                To: <span className="font-mono text-orange-500 break-all text-xs">
                  {getLightningAddress(authorData?.metadata)}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground text-center px-2">
                To: <span className="font-mono text-orange-500 break-all text-xs">
                  {getUserName(recipientPubkey)}
                </span>
              </p>
            )}
          </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payment Method Selection */}
          <div className="px-4">
            <Label className="text-gray-300 text-sm mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button
                variant={paymentMethod === 'webln' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('webln')}
                className={`h-12 flex-col gap-1 text-xs ${
                  paymentMethod === 'webln'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'border-gray-600 text-gray-300 hover:text-white hover:border-gray-500'
                }`}
                disabled={isZapping || paymentSuggestion?.isBlocked}
              >
                <CreditCard className="w-3 h-3" />
                <span>WebLN</span>
              </Button>
              <Button
                variant={paymentMethod === 'unified' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('unified')}
                className={`h-12 flex-col gap-1 text-xs ${
                  paymentMethod === 'unified'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'border-gray-600 text-gray-300 hover:text-white hover:border-gray-500'
                }`}
                disabled={isZapping || paymentSuggestion?.isBlocked}
              >
                <Wallet className="w-3 h-3" />
                <span>Wallet</span>
              </Button>
            </div>
          </div>

          {/* Quick Zap Section */}
          <div className="px-4">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              {/* Default amount input */}
              <div className="space-y-2 mb-3">
                <Label htmlFor="zapAmount" className="text-gray-300 text-sm">
                  Amount (sats)
                </Label>
                <Input
                  id="zapAmount"
                  type="text"
                  value={zapAmount.toString()}
                  onChange={(e) => updateZapAmount(e.target.value)}
                  placeholder="21"
                  className="bg-gray-700 border-gray-600 text-white h-10 text-center"
                />
              </div>

              {/* Quick zap button */}
              <Button
                onClick={quickZap}
                disabled={
                  isZapping ||
                  !zapAmount ||
                  paymentSuggestion?.isBlocked ||
                  (paymentMethod === 'webln' && !window.webln) ||
                  (paymentMethod === 'unified' && !walletConnected)
                }
                className="w-full bg-orange-600 hover:bg-orange-700 text-white mb-3 h-10"
              >
                {isZapping ? 'Zapping...' :
                 paymentSuggestion?.isBlocked ? 'Provider Not Supported' :
                 `⚡ Zap ${zapAmount} sats`}
              </Button>

              {/* Compact status info */}
              <div className={`rounded-lg p-2 ${
                paymentSuggestion?.isBlocked
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-blue-500/10 border border-blue-500/20'
              }`}>
                {paymentSuggestion?.isBlocked ? (
                  <p className="text-red-200 text-xs text-center">
                    ❌ Provider not supported
                  </p>
                ) : paymentMethod === 'webln' ? (
                  <p className="text-blue-200 text-xs text-center">
                    {window.webln ? '💡 Ready to pay with WebLN' : '⚠️ WebLN not available'}
                  </p>
                ) : (
                  <p className="text-blue-200 text-xs text-center">
                    {walletConnected ? `💡 Ready with ${activeWalletType} wallet` : '⚠️ Wallet not connected'}
                  </p>
                )}
                <Button
                  onClick={navigateToZapSettings}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 w-full mt-2 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-4 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-10 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
              disabled={isZapping}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Invoice Preview Dialog */}
    <InvoicePreviewDialog
      isOpen={showInvoicePreview}
      invoice={currentInvoice}
      onClose={() => {
        setShowInvoicePreview(false);
        setCurrentInvoice(null);
        setIsZapping(false);
      }}
      onPay={(invoice) => {
        setIsZapping(true);
        executeWebLNPayment(invoice).catch((error) => {
          console.error('Payment execution failed:', error);
          toast({
            title: "Payment Failed",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive",
          });
          setIsZapping(false);
        });
      }}
      isProcessing={isZapping}
    />
  </>
  );
}

// Invoice Preview Component
interface InvoicePreviewDialogProps {
  isOpen: boolean;
  invoice: string | null;
  onClose: () => void;
  onPay: (invoice: string) => void;
  isProcessing: boolean;
}

function InvoicePreviewDialog({
  isOpen,
  invoice,
  onClose,
  onPay,
  isProcessing
}: InvoicePreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-white text-center flex items-center justify-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-orange-500" />
            Invoice Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {invoice && (
            <div className="px-4">
              <LightningInvoice
                invoice={invoice}
                onPay={onPay}
                showQR={true}
                showPayButton={true}
                variant="default"
                className="w-full"
              />
            </div>
          )}

          <div className="flex gap-2 px-4 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-10 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
              disabled={isProcessing}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
