import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { getLightningAddress } from '@/lib/lightning';
import { useZapPayment, useLightningPaymentSuggestion } from '@/hooks/useZapPayment';
import { needsVercelProxy } from '@/lib/lightning-proxy';
import { Settings, Zap, CreditCard, Bitcoin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { genUserName } from '@/lib/genUserName';
import { useWallet } from '@/hooks/useWallet';
import { bundleLog } from '@/lib/devConsole';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppContext } from '@/hooks/useAppContext';

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
  const { config } = useAppContext(); // Access zap settings
  const { isConnected: bitcoinConnectConnected, userHasLightningAccess, walletInfo } = useWallet();

  // Use more accurate Bitcoin Connect detection
  const actualBitcoinConnectConnected = userHasLightningAccess && walletInfo?.implementation === 'WebLN';

  // Debug logging for Bitcoin Connect detection
  bundleLog('quickZapDebug', '[QuickZap] Bitcoin Connect Detection: userHasLightningAccess=' + userHasLightningAccess + ', walletInfo=' + JSON.stringify(walletInfo) + ', actualBitcoinConnectConnected=' + actualBitcoinConnectConnected + ', hasWindowWebln=' + !!window.webln + ', weblnConstructor=' + window.webln?.constructor?.name);

  const isMobile = useIsMobile();
  // Initialize with default zap amount from settings
  const [zapAmount, setZapAmount] = useState(config.defaultZap.amount);
  const [zapMessage, setZapMessage] = useState(config.defaultZap.message);
  const [paymentMethod, setPaymentMethod] = useState<'webln' | 'bitcoin-connect'>('webln');

  // Update zap amount when config changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setZapAmount(config.defaultZap.amount);
      setZapMessage(config.defaultZap.message);
    }
  }, [isOpen, config.defaultZap.amount, config.defaultZap.message]);

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

  // Check if user qualifies for Bitcoin Connect (bunker signers on mobile PWA)
  const shouldShowBitcoinConnect = isMobile && user && (
    user.signer?.constructor?.name?.includes('bunker') ||
    user.signer?.constructor?.name?.includes('nsec') ||
    (user as any)?.loginType === 'bunker' ||
    (user as any)?.loginType === 'nsec' ||
    (user as any)?.loginType === 'x-bunker-nostr-tools' ||
    !window.nostr
  );

  // Auto-select payment method based on provider capabilities
  if (!hasAutoSelected && paymentSuggestion && isOpen) {
    bundleLog('quickZapDebug', '[QuickZap] Auto-selecting payment method: shouldShowBitcoinConnect=' + shouldShowBitcoinConnect + ', actualBitcoinConnectConnected=' + actualBitcoinConnectConnected + ', hasWebLN=' + !!window.webln + ', canUseWebLN=' + paymentSuggestion.canUseWebLN);
    
    if (shouldShowBitcoinConnect && actualBitcoinConnectConnected) {
      bundleLog('quickZapDebug', '[QuickZap] Auto-selecting Bitcoin Connect');
      setPaymentMethod('bitcoin-connect');
    } else if (paymentSuggestion.canUseWebLN && window.webln) {
      bundleLog('quickZapDebug', '[QuickZap] Auto-selecting WebLN');
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
      setZapAmount(config.defaultZap.amount);
      return;
    }
    setZapAmount(amount);
  };

  // Handle quick zap option selection
  const selectZapOption = (option: typeof config.availableZapOptions[0]) => {
    setZapAmount(option.amount);
    setZapMessage(option.message);
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
      let result: any;

      if (paymentMethod === 'bitcoin-connect' && shouldShowBitcoinConnect && actualBitcoinConnectConnected) {
        // Handle Bitcoin Connect payment using WebLN provider
        if (!window.webln) {
          throw new Error('Bitcoin Connect WebLN provider not available');
        }

        // Use the existing Lightning payment system, but ensure it uses WebLN
        result = await zapPayment({
          lightningAddress,
          amountSats: zapAmount,
          comment: zapMessage || `Zap from ZapTok user`,
          nostr: eventId ? {
            eventId,
            pubkey: recipientPubkey
          } : {
            pubkey: recipientPubkey
          }
        });
      } else {
        // Use the existing enhanced Lightning payment system for other methods
        result = await zapPayment({
          lightningAddress,
          amountSats: zapAmount,
          comment: zapMessage || `Zap from ZapTok user`,
          nostr: eventId ? {
            eventId,
            pubkey: recipientPubkey
          } : {
            pubkey: recipientPubkey
          }
        });
      }

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
    navigate('/settings?section=zaps');
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className={`bg-gray-900 border-gray-700 max-h-[85vh] overflow-y-auto ${
          isMobile
            ? 'max-w-[95vw] w-[95vw] mx-2 my-4'
            : 'max-w-sm w-full mx-4'
        }`}>
          <DialogHeader className={isMobile ? 'pb-2' : 'pb-4'}>
            <DialogTitle className={`text-white text-center flex items-center justify-center gap-2 ${
              isMobile ? 'text-base' : 'text-lg'
            }`}>
              <Zap className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-orange-500`} />
              Quick Zap
            </DialogTitle>
            {/* Show Lightning address if available */}
            {getLightningAddress(authorData?.metadata) ? (
              <p className={`text-muted-foreground text-center px-2 ${
                isMobile ? 'text-xs' : 'text-xs'
              }`}>
                To: <span className="font-mono text-orange-500 break-all">
                  {getLightningAddress(authorData?.metadata)}
                </span>
              </p>
            ) : (
              <p className={`text-muted-foreground text-center px-2 ${
                isMobile ? 'text-xs' : 'text-xs'
              }`}>
                To: <span className="font-mono text-orange-500 break-all">
                  {getUserName(recipientPubkey)}
                </span>
              </p>
            )}
          </DialogHeader>

        <div className={`space-y-4 ${isMobile ? 'py-1' : 'py-2'}`}>
          {/* Payment Method Selection */}
          <div className={isMobile ? 'px-3' : 'px-4'}>
            <Label className={`text-gray-300 mb-2 block ${isMobile ? 'text-xs' : 'text-sm'}`}>Payment Method</Label>
            <div className={`grid gap-2 mb-3 ${shouldShowBitcoinConnect ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <Button
                variant={paymentMethod === 'webln' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('webln')}
                className={`${isMobile ? 'h-10' : 'h-12'} flex-col gap-1 text-xs ${
                  paymentMethod === 'webln'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'border-gray-600 text-gray-300 hover:text-white hover:border-gray-500'
                }`}
                disabled={isZapping || paymentSuggestion?.isBlocked}
              >
                <CreditCard className={`${isMobile ? 'w-3 h-3' : 'w-3 h-3'}`} />
                <span className={isMobile ? 'text-xs' : ''}>WebLN</span>
              </Button>
              {shouldShowBitcoinConnect && (
                <Button
                  variant={paymentMethod === 'bitcoin-connect' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('bitcoin-connect')}
                  className={`${isMobile ? 'h-10' : 'h-12'} flex-col gap-1 text-xs ${
                    paymentMethod === 'bitcoin-connect'
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'border-gray-600 text-gray-300 hover:text-white hover:border-gray-500'
                  }`}
                  disabled={isZapping || paymentSuggestion?.isBlocked}
                >
                  <Bitcoin className={`${isMobile ? 'w-3 h-3' : 'w-3 h-3'}`} />
                  <span className={isMobile ? 'text-xs' : ''}>Bitcoin Connect</span>
                </Button>
              )}
            </div>
          </div>

          {/* Quick Zap Section */}
          <div className={isMobile ? 'px-3' : 'px-4'}>
            <div className={`bg-gray-800/50 rounded-lg border border-gray-700 ${
              isMobile ? 'p-2' : 'p-3'
            }`}>
              {/* Default amount input */}
              <div className={`space-y-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                <Label htmlFor="zapAmount" className={`text-gray-300 ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Amount (sats)
                </Label>
                <Input
                  id="zapAmount"
                  type="text"
                  value={zapAmount.toString()}
                  onChange={(e) => updateZapAmount(e.target.value)}
                  placeholder="21"
                  className={`bg-gray-700 border-gray-600 text-white text-center ${
                    isMobile ? 'h-9 text-sm' : 'h-10'
                  }`}
                />
              </div>

              {/* Quick Zap Options from Settings */}
              <div className={`space-y-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                <Label className={`text-gray-300 ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Quick Options
                </Label>
                <div className={`grid gap-2 ${
                  isMobile ? 'grid-cols-2' : 'grid-cols-3'
                }`}>
                  {config.availableZapOptions.map((option, index) => (
                    <Button
                      key={index}
                      variant={zapAmount === option.amount ? 'default' : 'outline'}
                      onClick={() => selectZapOption(option)}
                      className={`${isMobile ? 'h-8 text-xs' : 'h-9 text-sm'} ${
                        zapAmount === option.amount
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'border-gray-600 text-gray-300 hover:text-white hover:border-gray-500'
                      }`}
                      disabled={isZapping}
                    >
                      <span className="mr-1">{option.emoji}</span>
                      {option.amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Message input */}
              <div className={`space-y-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                <Label htmlFor="zapMessage" className={`text-gray-300 ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  Message (optional)
                </Label>
                <Input
                  id="zapMessage"
                  type="text"
                  value={zapMessage}
                  onChange={(e) => setZapMessage(e.target.value)}
                  placeholder="Onward 👍"
                  className={`bg-gray-700 border-gray-600 text-white ${
                    isMobile ? 'h-9 text-sm' : 'h-10'
                  }`}
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
                  (paymentMethod === 'bitcoin-connect' && !actualBitcoinConnectConnected)
                }
                className={`w-full bg-orange-600 hover:bg-orange-700 text-white ${
                  isMobile ? 'mb-2 h-9 text-sm' : 'mb-3 h-10'
                }`}
              >
                {isZapping ? 'Zapping...' :
                 paymentSuggestion?.isBlocked ? 'Provider Not Supported' :
                 `⚡ Zap ${zapAmount} sats`}
              </Button>

              {/* Simplified status info - remove clutter */}
              <div className={`rounded-lg ${isMobile ? 'p-2' : 'p-2'} ${
                paymentSuggestion?.isBlocked
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-blue-500/10 border border-blue-500/20'
              }`}>
                {paymentSuggestion?.isBlocked ? (
                  <div>
                    <p className={`text-red-200 text-center mb-1 ${
                      isMobile ? 'text-xs' : 'text-xs'
                    }`}>
                      ❌ <strong>Not Supported:</strong> {paymentSuggestion.message}
                    </p>
                  </div>
                ) : (
                  <div>
                    {paymentMethod === 'webln' ? (
                      <p className={`text-blue-200 text-center mb-1 ${
                        isMobile ? 'text-xs' : 'text-xs'
                      }`}>
                        {window.webln ? '💡 Ready to pay with WebLN' : '⚠️ WebLN not available - install Alby extension'}
                      </p>
                    ) : paymentMethod === 'bitcoin-connect' ? (
                      <p className={`text-blue-200 text-center mb-1 ${
                        isMobile ? 'text-xs' : 'text-xs'
                      }`}>
                        {actualBitcoinConnectConnected ? '💡 Ready to pay with Bitcoin Connect' : '⚠️ Bitcoin Connect not connected - connect in settings'}
                        {/* Debug info in development */}
                        {process.env.NODE_ENV === 'development' && (
                          <span className="block text-xs opacity-50 mt-1">
                            Debug: userHasLightningAccess={userHasLightningAccess.toString()}, implementation={walletInfo?.implementation || 'none'}
                          </span>
                        )}
                      </p>
                    ) : null}
                </div>
                )}
                <Button
                  onClick={navigateToZapSettings}
                  variant="outline"
                  size="sm"
                  className={`w-full mt-2 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200 ${
                    isMobile ? 'text-xs h-6' : 'text-xs h-6'
                  }`}
                >
                  <Settings className={`${isMobile ? 'w-3 h-3 mr-1' : 'w-3 h-3 mr-1'}`} />
                  Zap Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className={`flex gap-2 pt-2 ${isMobile ? 'px-3' : 'px-4'}`}>
            <Button
              variant="outline"
              onClick={handleCancel}
              className={`flex-1 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 ${
                isMobile ? 'h-9 text-sm' : 'h-10'
              }`}
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
