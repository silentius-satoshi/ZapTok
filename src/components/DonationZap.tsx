import { useState, useEffect } from 'react';
import { X, Zap, ExternalLink, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { lightningService, ZAPTOK_DEV_PUBKEY } from '@/lib/lightning.service';
import { ZAPTOK_CONFIG } from '@/constants';
import { init, launchPaymentModal } from '@getalby/bitcoin-connect-react';

interface DonationZapProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DonationZap({ isOpen, onClose }: DonationZapProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'webln' | 'bitcoin-connect'>('webln');

  // Initialize Bitcoin Connect
  useEffect(() => {
    init({
      appName: 'ZapTok',
    });
  }, []);

  // Jumble-style preset amounts from constants
  const presetAmounts = ZAPTOK_CONFIG.DONATION_PRESETS;

  const handleAmountSelect = (sats: number) => {
    setSelectedAmount(sats);
    setAmount(sats.toString());
  };

  const handleCustomAmount = (value: string) => {
    setAmount(value);
    setSelectedAmount(null);
  };

  const formatAmount = (sats: number): string => {
    if (sats >= 1000) {
      return `${(sats / 1000).toFixed(sats % 1000 === 0 ? 0 : 1)}k`;
    }
    return sats.toString();
  };

  const handleGenerateInvoice = async () => {
    if (!amount || parseInt(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const paymentRequest = await lightningService.generateInvoice(
        parseInt(amount),
        comment,
        ZAPTOK_DEV_PUBKEY
      );
      
      setInvoice(paymentRequest.invoice);
      
      toast({
        title: "Invoice Generated",
        description: "Lightning invoice created successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayInvoice = async () => {
    if (!invoice) return;
    
    setIsProcessing(true);
    
    try {
      let paymentResponse;
      
      if (paymentMethod === 'bitcoin-connect') {
        // Use Bitcoin Connect for payment
        try {
          await launchPaymentModal({ invoice });
          paymentResponse = { success: true };
        } catch (error) {
          paymentResponse = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Bitcoin Connect payment failed' 
          };
        }
      } else {
        // Use WebLN for payment
        paymentResponse = await lightningService.payInvoice(invoice);
      }
      
      if (paymentResponse.success) {
        toast({
          title: "Payment Successful!",
          description: "Thank you for supporting ZapTok development!",
        });
        onClose();
        resetForm();
      } else {
        toast({
          title: "Payment Failed",
          description: paymentResponse.error || "Payment could not be processed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Payment failed",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setComment('');
    setSelectedAmount(null);
    setInvoice(null);
    setIsProcessing(false);
    setPaymentMethod('webln');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-gray-900 border border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-yellow-400 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Support ZapTok
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!invoice ? (
            <>
              {/* Amount Selection */}
              <div className="space-y-3">
                <Label className="text-yellow-400 font-medium">
                  Amount (sats)
                </Label>
                
                {/* Preset Amount Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {presetAmounts.map((sats) => (
                    <Button
                      key={sats}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAmountSelect(sats)}
                      className={`border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black text-xs ${
                        selectedAmount === sats ? 'bg-yellow-500 text-black' : 'bg-transparent'
                      }`}
                    >
                      {formatAmount(sats)}
                    </Button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <Input
                  type="number"
                  placeholder="Custom amount"
                  value={amount}
                  onChange={(e) => handleCustomAmount(e.target.value)}
                  className="bg-gray-800 border-yellow-500 text-white placeholder-gray-400 focus:border-yellow-400"
                />
              </div>

              {/* Comment Field */}
              <div className="space-y-2">
                <Label className="text-yellow-400 font-medium">
                  Comment (optional)
                </Label>
                <Textarea
                  placeholder="Leave a message..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-400 resize-none"
                  rows={3}
                  maxLength={144}
                />
                <div className="text-xs text-gray-400 text-right">
                  {comment.length}/144
                </div>
              </div>

              {/* Generate Invoice Button */}
              <Button
                onClick={handleGenerateInvoice}
                disabled={isProcessing || !amount || parseInt(amount) <= 0}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3"
              >
                {isProcessing ? 'Generating...' : 'Generate Lightning Invoice'}
              </Button>
            </>
          ) : (
            <>
              {/* Invoice Display */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-400">
                    ⚡ {amount} sats
                  </div>
                  {comment && (
                    <div className="text-sm text-gray-300 mt-1">
                      "{comment}"
                    </div>
                  )}
                </div>

                {/* Invoice String */}
                <div className="bg-gray-800 p-3 rounded border border-gray-600">
                  <div className="text-xs text-gray-400 mb-1">Lightning Invoice:</div>
                  <div className="text-xs text-white break-all font-mono">
                    {invoice}
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="bg-gray-800 p-3 rounded border border-gray-600">
                  <div className="text-xs text-gray-400 mb-2">Payment Method:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={paymentMethod === 'webln' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('webln')}
                      className={paymentMethod === 'webln' ? 'bg-yellow-500 text-black' : 'border-gray-600 text-gray-300'}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      WebLN
                    </Button>
                    <Button
                      variant={paymentMethod === 'bitcoin-connect' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('bitcoin-connect')}
                      className={paymentMethod === 'bitcoin-connect' ? 'bg-yellow-500 text-black' : 'border-gray-600 text-gray-300'}
                    >
                      <Wallet className="h-3 w-3 mr-1" />
                      Bitcoin Connect
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handlePayInvoice}
                    disabled={isProcessing}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3"
                  >
                    {isProcessing ? 'Processing Payment...' : `Pay with ${paymentMethod === 'webln' ? 'WebLN' : 'Bitcoin Connect'}`}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(invoice)}
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Copy Invoice
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => setInvoice(null)}
                    className="w-full text-gray-400 hover:text-white"
                  >
                    ← Back to Amount
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}