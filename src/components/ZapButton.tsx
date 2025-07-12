import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface ZapButtonProps {
  recipientPubkey: string;
  eventId?: string;
  amount?: number;
  className?: string;
}

export function ZapButton({ recipientPubkey, eventId, amount = 21, className }: ZapButtonProps) {
  const { isConnected, sendPayment } = useWallet();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [zapAmount, setZapAmount] = useState(amount);
  const [comment, setComment] = useState('');
  const [isZapping, setIsZapping] = useState(false);

  const handleZap = async () => {
    if (!isConnected || !user) {
      toast({
        title: "Wallet Required",
        description: "Please connect your Lightning wallet to send zaps",
        variant: "destructive",
      });
      return;
    }

    setIsZapping(true);
    
    try {
      // Get Lightning address from recipient profile
      const zapEndpoint = await getZapEndpoint(recipientPubkey);
      
      if (!zapEndpoint) {
        throw new Error('Recipient does not accept zaps');
      }

      // Create zap request
      const zapRequest = {
        kind: 9734,
        content: comment,
        tags: [
          ['p', recipientPubkey],
          ['amount', (zapAmount * 1000).toString()],
          ['relays', 'wss://relay.nostr.band'],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      if (eventId) {
        zapRequest.tags.push(['e', eventId]);
      }

      // Get invoice from zap endpoint
      const response = await fetch(zapEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: zapAmount * 1000,
          nostr: JSON.stringify(zapRequest),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get invoice');
      }

      const { pr: invoice } = await response.json();

      // Send payment using Bitcoin Connect/WebLN
      const { preimage } = await sendPayment(invoice);

      // Publish zap receipt
      const zapReceipt = {
        kind: 9735,
        content: '',
        tags: [
          ['p', recipientPubkey],
          ['bolt11', invoice],
          ['preimage', preimage],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      if (eventId) {
        zapReceipt.tags.push(['e', eventId]);
      }

      publishEvent(zapReceipt);

      toast({
        title: "Zap Sent! ⚡",
        description: `Successfully sent ${zapAmount} sats`,
      });

      setIsOpen(false);
      setComment('');
    } catch (error) {
      toast({
        title: "Zap Failed",
        description: error instanceof Error ? error.message : "Failed to send zap",
        variant: "destructive",
      });
    } finally {
      setIsZapping(false);
    }
  };

  const getZapEndpoint = async (pubkey: string): Promise<string | null> => {
    // This would fetch the user's profile and extract lud16/lud06
    // For now, we'll return null to handle gracefully
    // In production, you'd query the user's kind 0 profile event
    // and extract the Lightning address from the lud16 or lud06 field
    return null; // Placeholder - implement profile querying
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="sm"
        className={className}
        disabled={!isConnected}
      >
        <Zap className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Zap ⚡</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="zap-amount">Amount (sats)</Label>
              <Input
                id="zap-amount"
                type="number"
                value={zapAmount}
                onChange={(e) => setZapAmount(Number(e.target.value))}
                min="1"
                step="1"
              />
            </div>
            <div>
              <Label htmlFor="zap-comment">Comment (Optional)</Label>
              <Input
                id="zap-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Great content!"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleZap}
                disabled={isZapping || !isConnected}
                className="flex-1"
              >
                {isZapping ? 'Sending...' : `Zap ${zapAmount} sats`}
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="flex-1"
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
