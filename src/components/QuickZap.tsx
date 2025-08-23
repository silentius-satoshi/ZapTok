import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { getLightningAddress } from '@/lib/lightning';
import { useZapPayment, useLightningPaymentSuggestion } from '@/hooks/useZapPayment';
import { needsVercelProxy } from '@/lib/lightning-proxy';
import { Settings, Zap, Wallet, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { genUserName } from '@/lib/genUserName';
import { useUnifiedWallet } from '@/contexts/UnifiedWalletContext';

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
  const navigate = useNavigate();
  const { isConnected: walletConnected, activeWalletType } = useUnifiedWallet();
  const [zapAmount, setZapAmount] = useState(21);
  const [paymentMethod, setPaymentMethod] = useState<'webln' | 'unified'>('webln');

  // Get recipient info for display
  const { data: authorData } = useAuthor(recipientPubkey);

  // Use enhanced Lightning payment system
  const { zapPayment, isZapping } = useZapPayment();

  // Get smart payment recommendations based on Lightning provider
  const lightningAddress = getLightningAddress(authorData?.metadata);
  const paymentSuggestion = useLightningPaymentSuggestion(lightningAddress);

  // Check if this address uses Vercel proxy
  const usesProxy = lightningAddress ? needsVercelProxy(lightningAddress) : false;

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
      return;
    }

    // Check if recipient has a Lightning address
    const lightningAddress = getLightningAddress(authorData?.metadata);
    if (!lightningAddress) {
      return;
    }

    // Check if the Lightning provider is blocked
    if (paymentSuggestion?.isBlocked) {
      return;
    }

    try {
      // Use the new enhanced Lightning payment system
      const result = await zapPayment({
        lightningAddress,
        amountSats: zapAmount,
        comment: `Zap from ZapTok user`,
        nostr: eventId ? {
          eventId,
          pubkey: recipientPubkey
        } : {
          pubkey: recipientPubkey
        }
      });

      if (result.success) {
        onZapSuccess?.();
        onClose();
      }

    } catch (error) {
      // Error handling is done by the useZapPayment hook
      console.error('Quick zap error:', error);
    }
  };

  const navigateToZapSettings = () => {
    onClose();
    navigate('/settings?section=lightning');
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
                  <div>
                    <p className="text-red-200 text-xs text-center mb-1">
                      ❌ <strong>Not Supported:</strong> {paymentSuggestion.message}
                    </p>
                  </div>
                ) : (
                  <div>
                    {paymentMethod === 'webln' ? (
                      <div>
                        <p className="text-blue-200 text-xs text-center mb-1">
                          {window.webln ? '💡 Ready to pay with WebLN' : '⚠️ WebLN not available - install Alby extension'}
                        </p>
                        {usesProxy && (
                          <p className="text-green-200 text-xs text-center mb-1">
                            🌐 <strong>Secure Proxy:</strong> This {lightningAddress?.split('@')[1]} address uses ZapTok's secure proxy
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-blue-200 text-xs text-center mb-1">
                          {walletConnected ? `💡 Ready with ${activeWalletType} wallet` : '⚠️ Wallet not connected'}
                        </p>
                        {usesProxy && (
                          <p className="text-green-200 text-xs text-center mb-1">
                            🌐 <strong>Secure Proxy:</strong> Enhanced compatibility for {lightningAddress?.split('@')[1]}
                          </p>
                        )}
                      </div>
                    )}
                    {paymentSuggestion && (
                      <p className="text-gray-300 text-xs text-center mb-1">
                        <strong>Method:</strong> {paymentSuggestion.message}
                      </p>
                    )}
                  </div>
                )}
                <Button
                  onClick={navigateToZapSettings}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 w-full mt-2 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Lightning Settings
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

    </>
  );
}
