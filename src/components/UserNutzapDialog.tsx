import { useState } from 'react';
import { useSendNutzap } from '@/hooks/useSendNutzap';
import { useAuthor } from '@/hooks/useAuthor';
import { formatBalance } from '@/lib/cashu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  User,
  Send,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface UserNutzapDialogProps {
  userPubkey: string;
  children: React.ReactNode;
  eventId?: string; // Optional event to nutzap on
}

export function UserNutzapDialog({ 
  userPubkey, 
  children, 
  eventId 
}: UserNutzapDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<number>(21);
  const [comment, setComment] = useState('');
  
  const { sendNutzap, isSending } = useSendNutzap();
  const author = useAuthor(userPubkey);
  const { toast } = useToast();

  const metadata = author.data?.metadata;

  const handleSendNutzap = async () => {
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    try {
      await sendNutzap({
        recipientPubkey: userPubkey,
        amount,
        comment,
        eventId
      });

      toast({
        title: "Nutzap sent!",
        description: `Sent ${formatBalance(amount)} sats to ${metadata?.name || 'user'}`
      });

      setIsOpen(false);
      setAmount(21);
      setComment('');
    } catch (err) {
      toast({
        title: "Failed to send nutzap",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive"
      });
    }
  };

  // Preset amounts
  const presetAmounts = [21, 100, 500, 1000, 5000];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <span>Send Nutzap</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipient Info */}
          <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={metadata?.picture} />
              <AvatarFallback>
                {metadata?.name?.[0] || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">
                {metadata?.name || 'Anonymous User'}
              </p>
              {metadata?.about && (
                <p className="text-sm text-muted-foreground truncate">
                  {metadata.about}
                </p>
              )}
              <div className="flex items-center space-x-1 mt-1">
                <Badge variant="outline" className="text-xs">
                  npub...{userPubkey.slice(-8)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Amount Selection */}
          <div className="space-y-3">
            <Label htmlFor="amount">Amount (sats)</Label>
            <div className="space-y-3">
              <Input
                id="amount"
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter amount in sats"
                min="1"
              />
              
              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    variant={amount === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(preset)}
                    className="text-xs"
                  >
                    {formatBalance(preset)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a message with your nutzap..."
              rows={3}
              maxLength={280}
            />
            {comment && (
              <p className="text-xs text-muted-foreground text-right">
                {comment.length}/280
              </p>
            )}
          </div>

          {/* Event Context */}
          {eventId && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This nutzap will be attached to a specific post or event.
              </p>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendNutzap}
            disabled={isSending || amount <= 0}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Nutzap...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send {formatBalance(amount)} sats
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}