import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Zap, Loader } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostr } from '@/hooks/useNostr';
import { useZap } from '@/contexts/ZapProvider';
import { useToast } from '@/hooks/useToast';
import { Event } from 'nostr-tools';
import lightningService from '@/services/lightning.service';
import noteStatsService from '@/services/note-stats.service';
import UserAvatar from './UserAvatar';
import Username from './Username';
import { ZAPTOK_CONFIG } from '@/constants';
import { genUserName } from '@/lib/genUserName';

interface ZapDialogProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  pubkey: string;
  event?: Event;
  defaultAmount?: number;
  defaultComment?: string;
  quickZap?: boolean; // Enable quick zap behavior
}

interface ZapDialogContentProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  recipient: string;
  event?: Event;
  defaultAmount?: number;
  defaultComment?: string;
  quickZap?: boolean;
}

export default function ZapDialog({
  open,
  setOpen,
  pubkey,
  event,
  defaultAmount,
  defaultComment,
  quickZap = false
}: ZapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="text-white text-center flex items-center justify-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span>Zap</span>
            <UserAvatar size="small" userId={pubkey} />
            <Username userId={pubkey} className="truncate flex-1 max-w-fit text-start h-5" />
          </DialogTitle>
          <DialogDescription className="sr-only">
            Send Lightning sats to support this user
          </DialogDescription>
        </DialogHeader>
        <ZapDialogContent
          open={open}
          setOpen={setOpen}
          recipient={pubkey}
          event={event}
          defaultAmount={defaultAmount}
          defaultComment={defaultComment}
          quickZap={quickZap}
        />
      </DialogContent>
    </Dialog>
  );
}

function ZapDialogContent({
  setOpen,
  recipient,
  event,
  defaultAmount,
  defaultComment,
  quickZap = false
}: ZapDialogContentProps) {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { defaultZapSats, defaultZapComment } = useZap();
  const { data: recipientData } = useAuthor(recipient);
  const { toast } = useToast();

  const [amount, setAmount] = useState(defaultAmount ?? defaultZapSats);
  const [comment, setComment] = useState(defaultComment ?? defaultZapComment);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(defaultAmount ?? defaultZapSats);
  const [isProcessing, setIsProcessing] = useState(false);

  const recipientMetadata = recipientData?.metadata;
  const displayName = recipientMetadata?.name ?? recipientMetadata?.display_name ?? genUserName(recipient);
  const profileImage = recipientMetadata?.picture;

  // Update amount when defaultAmount changes or modal opens
  useEffect(() => {
    if (defaultAmount) {
      setAmount(defaultAmount);
      setSelectedAmount(defaultAmount);
    }
  }, [defaultAmount]);

  // Get preset amounts - use quick zap presets for better UX
  const presetAmounts = quickZap ? ZAPTOK_CONFIG.QUICK_ZAP_PRESETS : [
    21, 66, 210, 666, 1000, 2100, 6666, 10000, 21000, 66666, 100000, 210000
  ];

  // Format amount display like Jumble
  const formatAmount = (sats: number): string => {
    if (sats < 1000) return sats.toString();
    if (sats < 1000000) return `${Math.round(sats / 100) / 10}k`;
    return `${Math.round(sats / 100000) / 10}M`;
  };

  const handleAmountSelect = (sats: number) => {
    setAmount(sats);
    setSelectedAmount(sats);
  };

  const handleCustomAmount = (value: string) => {
    const numValue = parseInt(value) || 0;
    setAmount(numValue);
    setSelectedAmount(null); // Clear preset selection for custom amount
  };

  const handleZap = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to send zaps",
        variant: "destructive",
      });
      return;
    }

    const amountValue = parseInt(amount.toString());

    // Validation
    if (amountValue <= 0) {
      toast({
        title: "Invalid Amount",
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
      const zapResult = await lightningService.zap(
        user.pubkey,
        event ?? recipient,
        amountValue,
        comment,
        nostr,
        user,
        () => setOpen(false)
      );

      // User canceled
      if (!zapResult) {
        return;
      }

      // Update local stats for instant feedback
      if (event) {
        noteStatsService.addZap(user.pubkey, event.id, zapResult.invoice, amountValue, comment);
      }

      toast({
        title: "Zap Successful!",
        description: `Sent ${amountValue} sats to ${displayName}`,
      });

      // Reset form
      setAmount(defaultZapSats);
      setComment(defaultZapComment);
      setSelectedAmount(defaultZapSats);
    } catch (error) {
      console.error('Zap failed:', error);
      toast({
        title: "Zap Failed",
        description: `${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Recipient Profile Section */}
      <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profileImage} alt={displayName} />
          <AvatarFallback className="bg-gray-700 text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{displayName}</p>
          <p className="text-gray-400 text-sm">
            {event ? 'Zapping post' : 'Zapping profile'}
          </p>
        </div>
      </div>

      {/* Amount Section */}
      <div className="space-y-3">
        <Label className="text-white font-medium">
          Amount (sats)
        </Label>

        {/* Preset Amount Grid - 4 columns for mobile, 6 for desktop */}
        <div className="grid grid-cols-4 gap-2">
          {presetAmounts.map((sats) => (
            <Button
              key={sats}
              variant="outline"
              size="sm"
              onClick={() => handleAmountSelect(sats)}
              className={`border-gray-600 text-gray-300 hover:bg-yellow-500 hover:text-black text-xs transition-all ${
                selectedAmount === sats ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-gray-800'
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
          className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-400"
        />
      </div>

      {/* Comment Field */}
      <div className="space-y-2">
        <Label className="text-white font-medium">
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
        disabled={isProcessing || !amount || parseInt(amount.toString()) <= 0 || !user}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 transition-all"
      >
        {isProcessing ? (
          <>
            <Loader className="animate-spin mr-2 h-4 w-4" />
            Sending Zap...
          </>
        ) : user ? (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Zap {formatAmount(parseInt(amount.toString()))} sats
          </>
        ) : (
          'Login Required'
        )}
      </Button>

      {/* Lightning Address Info */}
      <div className="text-xs text-gray-400 text-center space-y-1">
        <div>⚡ NIP-57 Nostr Zaps</div>
        <div>Limits: 1 - 1M sats • Comments: 144 chars max</div>
      </div>
    </div>
  );
}