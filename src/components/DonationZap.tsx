import { useState, useEffect } from 'react';
import { X, Zap, ExternalLink, Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/useToast';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostr } from '@nostrify/react';
import { lightningService, ZAPTOK_DEV_PUBKEY } from '@/lib/lightning.service.donation';
import { ZAPTOK_CONFIG } from '@/constants';
import { nip19 } from 'nostr-tools';
import { useNavigate } from 'react-router-dom';

interface DonationZapProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
}

export function DonationZap({ isOpen, onClose, defaultAmount }: DonationZapProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const [amount, setAmount] = useState(defaultAmount?.toString() || '');
  const [comment, setComment] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(defaultAmount || null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch ZapTok profile information
  const { data: zapTokProfile } = useAuthor(ZAPTOK_CONFIG.DEV_PUBKEY);

  // Create npub link for profile
  const handleProfileClick = () => {
    const npub = nip19.npubEncode(ZAPTOK_CONFIG.DEV_PUBKEY);
    navigate(`/${npub}`);
  };

  // Update amount when defaultAmount changes
  useEffect(() => {
    if (defaultAmount) {
      setAmount(defaultAmount.toString());
      setSelectedAmount(defaultAmount);
    }
  }, [defaultAmount]);

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

  const handleZap = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to send zaps.",
        variant: "destructive",
      });
      return;
    }

    const amountValue = parseInt(amount);

    if (!amount || amountValue <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount.",
        variant: "destructive",
      });
      return;
    }

    if (amountValue < 1) {
      toast({
        title: "Amount Too Small",
        description: "Minimum amount is 1 sat.",
        variant: "destructive",
      });
      return;
    }

    if (amountValue > 1000000) {
      toast({
        title: "Amount Too Large",
        description: "Maximum amount is 1M sats.",
        variant: "destructive",
      });
      return;
    }

    if (comment.length > 144) {
      toast({
        title: "Comment Too Long",
        description: "Comments are limited to 144 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await lightningService.zap(
        user.pubkey,
        ZAPTOK_DEV_PUBKEY,
        amountValue,
        comment,
        nostr,
        user,
        onClose
      );

      if (result) {
        toast({
          title: "Zap Successful!",
          description: "Thank you for supporting ZapTok development!",
        });
        resetForm();
      } else {
        toast({
          title: "Zap Cancelled",
          description: "Payment was cancelled.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Zap error:', error);
      toast({
        title: "Zap Failed",
        description: error instanceof Error ? error.message : "Failed to send zap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setAmount(defaultAmount?.toString() || '');
    setComment('');
    setSelectedAmount(defaultAmount || null);
    setIsProcessing(false);
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
            <div className="shrink-0">Zap to</div>
            <Avatar
              className="h-6 w-6 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleProfileClick}
            >
              <AvatarImage src={zapTokProfile?.metadata?.picture} />
              <AvatarFallback className="bg-yellow-500 text-black text-xs font-bold">
                ZT
              </AvatarFallback>
            </Avatar>
            <div
              className="truncate flex-1 max-w-fit text-start cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleProfileClick}
            >
              {zapTokProfile?.metadata?.name || zapTokProfile?.metadata?.display_name || 'ZapTok'}
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Send Lightning sats to support ZapTok development
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

              {/* Zap Button */}
              <Button
                onClick={handleZap}
                disabled={isProcessing || !amount || parseInt(amount) <= 0 || !user}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3"
              >
                {isProcessing ? 'Sending Zap...' : user ? 'Send Zap ⚡' : 'Login Required'}
              </Button>

              {/* Lightning Address Info */}
              <div className="text-xs text-gray-400 text-center space-y-1">
                <div>⚡ NIP-57 Nostr Zaps</div>
                <div>Limits: 1 - 1M sats • Comments: 144 chars max</div>
              </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}