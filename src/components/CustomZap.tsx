import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { zapNote, zapProfile } from '@/lib/zap';
import type { NostrEvent } from '@nostrify/nostrify';

interface CustomZapProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recipientPubkey?: string;
  recipientProfile?: any;
  event?: NostrEvent;
}

export default function CustomZap({ 
  isOpen, 
  onOpenChange, 
  recipientPubkey, 
  recipientProfile,
  event 
}: CustomZapProps) {
  const [amount, setAmount] = useState('21');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useCurrentUser();

  const handleZap = async () => {
    if (!recipientPubkey || !user) {
      toast({
        title: 'Error',
        description: !recipientPubkey ? 'No recipient specified' : 'Please log in to send zaps',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      let success: boolean;
      
      if (event) {
        // Zapping a specific event
        success = await zapNote(event, user.pubkey, parseInt(amount) * 1000, message);
      } else {
        // Zapping a user profile
        success = await zapProfile(
          { pubkey: recipientPubkey },
          user.pubkey,
          parseInt(amount) * 1000,
          message
        );
      }
      
      if (success) {
        toast({
          title: 'Zap sent!',
          description: `Successfully zapped ${amount} sats`,
        });
        onOpenChange(false);
        setAmount('21');
        setMessage('');
      } else {
        toast({
          title: 'Zap failed',
          description: 'Unable to send zap. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Zap error:', error);
      toast({
        title: 'Zap failed',
        description: 'An error occurred while sending the zap',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Zap ⚡</DialogTitle>
          <DialogDescription>
            Send sats to support this content
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {recipientProfile && (
            <div className="text-sm text-muted-foreground">
              Zapping: {recipientProfile.name || 'Anonymous'}
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium">Amount (sats)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="21"
              min="1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Message (optional)</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Great content!"
              maxLength={280}
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleZap}
              disabled={loading || !amount || parseInt(amount) < 1 || !user}
            >
              {loading ? 'Sending...' : `Zap ${amount} sats ⚡`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}