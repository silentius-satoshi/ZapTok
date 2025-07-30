import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useAuthor } from '@/hooks/useAuthor';
import { useToast } from '@/hooks/useToast';
import { useUnifiedWallet } from '@/contexts/UnifiedWalletContext';
import { zapNote } from '@/lib/zap';
import { getLightningAddress } from '@/lib/lightning';
import { Settings, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';

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
  const { config, setDefaultZap } = useAppContext();
  const { toast } = useToast();
  const { sendPayment, activeWalletType } = useUnifiedWallet();
  const navigate = useNavigate();
  const [isZapping, setIsZapping] = useState(false);
  const [defaultAmount, setDefaultAmount] = useState(config.defaultZap.amount.toString());

  // Get recipient info for display
  const { data: authorData } = useAuthor(recipientPubkey);

  const getUserName = (pubkey: string) => {
    if (authorData?.metadata?.name) return authorData.metadata.name;
    if (authorData?.metadata?.display_name) return authorData.metadata.display_name;
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
  };

  const updateDefaultAmount = (value: string) => {
    const amount = parseInt(value.replace(/,/g, ''));

    if (isNaN(amount) || amount < 1) {
      setDefaultAmount('');
      return;
    }

    setDefaultAmount(amount.toString());

    // Update the default zap configuration
    setDefaultZap({
      ...config.defaultZap,
      amount
    });
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
        description: "This user hasn't set up Lightning payments in their profile. They need to add a Lightning address (lud16) or LNURL (lud06) to their Nostr profile.",
        variant: "destructive",
      });
      return;
    }

    setIsZapping(true);

    try {
      const success = await zapNote(
        { pubkey: recipientPubkey, id: eventId || '' } as NostrEvent,
        user.pubkey,
        config.defaultZap.amount,
        config.defaultZap.message,
        authorData?.metadata,
        activeWalletType ? sendPayment : undefined
      );

      if (success) {
        toast({
          title: "Quick Zap Sent! ⚡",
          description: `Successfully sent ${config.defaultZap.amount} sats to ${lightningAddress}`,
        });
        onZapSuccess?.();
        onClose();
      } else {
        toast({
          title: "Zap Implementation Required",
          description: "Lightning wallet integration is required to send zaps. This feature will be available soon!",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Quick zap error:', error);
      toast({
        title: "Quick Zap Failed",
        description: "Failed to send quick zap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsZapping(false);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-md w-full mx-4">
        <DialogHeader>
          <DialogTitle className="text-white text-center flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Quick Zap
          </DialogTitle>
          {/* Show Lightning address if available, otherwise show truncated pubkey */}
          {getLightningAddress(authorData?.metadata) ? (
            <p className="text-sm text-muted-foreground text-center px-4">
              To: <span className="font-mono text-orange-500 break-all">
                {getLightningAddress(authorData?.metadata)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center px-4">
              To: <span className="font-mono text-orange-500 break-all">
                {getUserName(recipientPubkey)}
              </span>
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Zap Section */}
          <div className="px-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              {/* Default amount input */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="defaultAmount" className="text-gray-300 text-sm">
                  Default zap amount (sats)
                </Label>
                <Input
                  id="defaultAmount"
                  type="text"
                  value={defaultAmount}
                  onChange={(e) => updateDefaultAmount(e.target.value)}
                  placeholder="21"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              {/* Quick zap button */}
              <Button
                onClick={quickZap}
                disabled={isZapping || !config.defaultZap.amount}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white mb-3"
              >
                {isZapping ? 'Zapping...' : `Quick Zap ${config.defaultZap.amount} sats`}
              </Button>

              {/* Gentle reminder */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-200 text-xs mb-2">
                  💡 <strong>Quick Tip:</strong> Quick Zap uses your default zap amount ({config.defaultZap.amount} sats)
                  and message set in your zap settings.
                </p>
                <Button
                  onClick={navigateToZapSettings}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Customize Zap Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 px-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
              disabled={isZapping}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
