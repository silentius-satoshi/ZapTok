import { useToast } from '@/hooks/useToast';
import { useZapPayment } from '@/hooks/useZapPayment';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useWallet } from '@/hooks/useWallet';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { getLightningAddress } from '@/lib/lightning';

/**
 * Custom hook for sending default zaps using the amount configured in settings
 */
export function useDefaultZap() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { userHasLightningAccess, walletInfo } = useWallet();
  const isMobile = useIsMobile();
  const { zapPayment, isZapping } = useZapPayment();
  const { config } = useAppContext();

  // Connection detection logic (same as QuickZap)
  const actualBitcoinConnectConnected = userHasLightningAccess && walletInfo?.implementation === 'WebLN';

  // Check if user qualifies for Bitcoin Connect (same logic as QuickZap)
  const shouldShowBitcoinConnect = isMobile && user && (
    user.signer?.constructor?.name?.includes('bunker') ||
    user.signer?.constructor?.name?.includes('nsec') ||
    (user as any)?.loginType === 'bunker' ||
    (user as any)?.loginType === 'nsec' ||
    (user as any)?.loginType === 'x-bunker-nostr-tools' ||
    !window.nostr
  );

  // Auto-determine best payment method (same logic as QuickZap)
  const getPaymentMethod = () => {
    if (shouldShowBitcoinConnect && actualBitcoinConnectConnected) {
      return 'bitcoin-connect';
    } else if (window.webln) {
      return 'webln';
    }
    return 'webln'; // fallback
  };

  // Payment execution function
  const executeDefaultZap = async (recipientPubkey: string, eventId?: string) => {
    if (!user?.pubkey) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send zaps",
        variant: "destructive"
      });
      return false;
    }

    const zapAmount = config.defaultZap.amount;
    const zapMessage = config.defaultZap.message || "Zap from ZapTok user";

    try {
      // We need to get the recipient's Lightning address
      // This will be handled by the calling component since it should already have author data
      return { zapAmount, zapMessage };
    } catch (error) {
      console.error('Default zap preparation failed:', error);
      toast({
        title: "Zap Failed",
        description: error instanceof Error ? error.message : "Failed to prepare zap",
        variant: "destructive"
      });
      return false;
    }
  };

  // Payment execution function that accepts Lightning address directly
  const sendDefaultZap = async (lightningAddress: string, recipientPubkey: string, eventId?: string) => {
    if (!user?.pubkey) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send zaps",
        variant: "destructive"
      });
      return false;
    }

    if (!lightningAddress) {
      toast({
        title: "Zap Failed",
        description: "Recipient doesn't have a Lightning address configured",
        variant: "destructive"
      });
      return false;
    }

    const zapAmount = config.defaultZap.amount;
    const zapMessage = config.defaultZap.message || "Zap from ZapTok user";

    try {
      const result = await zapPayment({
        lightningAddress,
        amountSats: zapAmount,
        comment: zapMessage,
        nostr: eventId ? {
          eventId,
          pubkey: recipientPubkey
        } : {
          pubkey: recipientPubkey
        }
      });

      toast({
        title: "⚡ Zap Sent!",
        description: `Successfully zapped ${zapAmount} sats!`
      });
      return true;
    } catch (error) {
      console.error('Default zap failed:', error);
      toast({
        title: "Zap Failed",
        description: error instanceof Error ? error.message : "Failed to send zap",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    sendDefaultZap,
    isZapping,
    defaultAmount: config.defaultZap.amount,
    defaultMessage: config.defaultZap.message,
    isConnected: actualBitcoinConnectConnected || !!window.webln
  };
}
