import { useState, useEffect } from 'react';
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
import { genUserName } from '@/lib/genUserName';
import type { NostrEvent } from '@nostrify/nostrify';
import type { ZapOption } from '@/types/zap';

interface CustomZapProps {
  isOpen: boolean;
  onClose: () => void;
  recipientPubkey: string;
  eventId?: string;
  onZapSuccess?: () => void;
}

export function CustomZap({
  isOpen,
  onClose,
  recipientPubkey,
  eventId,
  onZapSuccess,
}: CustomZapProps) {
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { toast } = useToast();
  const { sendPayment, activeWalletType } = useUnifiedWallet();
  const [selectedValue, setSelectedValue] = useState<ZapOption>(config.availableZapOptions[0] || config.defaultZap);
  const [isZapping, setIsZapping] = useState(false);

  // Get recipient info for display
  const { data: authorData } = useAuthor(recipientPubkey);

  // Update selected value when options change
  useEffect(() => {
    setSelectedValue(config.availableZapOptions[0] || config.defaultZap);
  }, [config.availableZapOptions, config.defaultZap]);

  const isSelected = (value: ZapOption) => {
    const sel = selectedValue;
    return value.amount === sel.amount && value.emoji === sel.emoji && value.message === sel.message;
  };

  const updateCustomAmount = (value: string) => {
    const amount = parseInt(value.replace(/,/g, ''));

    if (isNaN(amount)) {
      setSelectedValue((v) => ({ ...v, amount: 0 }));
      return;
    }

    setSelectedValue((v) => ({ ...v, amount }));
  };

  const updateComment = (message: string) => {
    setSelectedValue((v) => ({ ...v, message }));
  };

  const truncateNumber = (amount: number) => {
    const t = 1000;

    if (amount < t) {
      return `${amount}`;
    }

    if (amount < Math.pow(t, 2)) {
      return (amount % t === 0) ?
        `${Math.floor(amount / t)}K` :
        amount.toLocaleString();
    }

    if (amount < Math.pow(t, 3)) {
      return (amount % t === 0) ?
        `${Math.floor(amount / Math.pow(t, 2))}M` :
        amount.toLocaleString();
    }

    return amount.toLocaleString();
  };

  const getUserName = (pubkey: string) => {
    if (authorData?.metadata?.name) return authorData.metadata.name;
    if (authorData?.metadata?.display_name) return authorData.metadata.display_name;
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
  };

  const submit = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to send zaps",
        variant: "destructive",
      });
      return;
    }

    if (!selectedValue.amount || selectedValue.amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid zap amount",
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
      // Use zapNote for both note zaps and profile zaps
      // The eventId parameter determines if it's a note zap (eventId provided) or profile zap (no eventId)
      const success = await zapNote(
        { pubkey: recipientPubkey, id: eventId || '' } as NostrEvent,
        user.pubkey,
        selectedValue.amount,
        selectedValue.message,
        authorData?.metadata,
        activeWalletType ? sendPayment : undefined
      );

      if (success) {
        toast({
          title: "Zap Sent! ⚡",
          description: `Successfully sent ${selectedValue.amount} sats to ${lightningAddress}`,
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
      console.error('Zap error:', error);
      toast({
        title: "Zap Failed",
        description: "Failed to send zap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsZapping(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-lg w-full mx-4">
        <DialogHeader>
          <DialogTitle className="text-white text-center">
            Custom Zap
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
                {genUserName(recipientPubkey)}
              </span>
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Custom Zap Section */}
          <div className="px-4">
            <h3 className="text-white font-medium mb-3">Custom Zap</h3>
          </div>

          {/* Description */}
          <div className="text-center text-gray-300 px-4">
            <p className="break-words">
              Zap{" "}
              <span className="text-white font-medium break-all">
                {genUserName(recipientPubkey)}
              </span>{" "}
              <span className="text-pink-500 font-bold text-xl">
                {truncateNumber(selectedValue.amount || 0)}
              </span>{" "}
              <span className="text-gray-400">sats</span>
            </p>
          </div>

          {/* Zap options */}
          <div className="grid grid-cols-3 gap-3 px-4">
            {config.availableZapOptions.map((value, index) => (
              <button
                key={index}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isSelected(value)
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                }`}
                onClick={() => setSelectedValue({ ...value })}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{value.emoji}</div>
                  <div className="text-white text-sm font-medium">
                    {truncateNumber(value.amount)}
                  </div>
                  <div className="text-gray-400 text-xs">sats</div>
                </div>
              </button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="space-y-2 px-4">
            <Label htmlFor="customAmount" className="text-gray-300">
              Custom amount (sats)
            </Label>
            <Input
              id="customAmount"
              type="text"
              value={selectedValue.amount ? selectedValue.amount.toLocaleString() : ''}
              onChange={(e) => updateCustomAmount(e.target.value)}
              placeholder="Enter custom amount"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          {/* Comment input */}
          <div className="space-y-2 px-4">
            <Label htmlFor="comment" className="text-gray-300">
              Message (optional)
            </Label>
            <Input
              id="comment"
              type="text"
              value={selectedValue.message || ''}
              onChange={(e) => updateComment(e.target.value)}
              placeholder="Add a comment"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 px-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
              disabled={isZapping}
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={isZapping || !selectedValue.amount}
              className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
            >
              {isZapping ? 'Sending...' : 'Send Custom Zap'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
