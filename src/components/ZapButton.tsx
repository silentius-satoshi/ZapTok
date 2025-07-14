import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { getLightningAddress, getLNURLPayEndpoint, createZapRequest } from '@/lib/lightning';

interface ZapButtonProps {
  recipientPubkey: string;
  eventId?: string;
  amount?: number;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ZapButton({ recipientPubkey, eventId, amount = 21, className, variant = "ghost", size = "sm" }: ZapButtonProps) {
  const { isConnected, sendPayment } = useWallet();
  const { user } = useCurrentUser();
  const { data: authorData } = useAuthor(recipientPubkey);
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [zapAmount, setZapAmount] = useState(amount);
  const [comment, setComment] = useState('');
  const [isZapping, setIsZapping] = useState(false);
  const [showSparks, setShowSparks] = useState(false);

  const handleZap = async () => {
    if (!isConnected || !user) {
      toast({
        title: "Wallet Required",
        description: "Please connect your Lightning wallet to send zaps",
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
      console.log('⚡ Starting zap process for:', { recipientPubkey, lightningAddress, zapAmount });
      
      // Get LNURL-pay endpoint from Lightning address
      const zapEndpoint = await getLNURLPayEndpoint(lightningAddress);
      
      if (!zapEndpoint) {
        throw new Error(`Failed to get payment endpoint from Lightning address: ${lightningAddress}`);
      }

      console.log('🎯 Using zap endpoint:', zapEndpoint);

      // Create zap request using utility function
      const zapRequest = createZapRequest(recipientPubkey, zapAmount, comment, eventId);
      console.log('📝 Created zap request:', zapRequest);

      // Prepare the request payload
      const requestPayload = {
        amount: zapAmount * 1000, // Convert to millisats
        nostr: JSON.stringify(zapRequest),
        ...(comment && { comment }),
      };
      console.log('📡 Sending invoice request:', requestPayload);

      // Get invoice from zap endpoint
      const response = await fetch(zapEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      console.log('📨 Invoice response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Invoice request failed:', errorText);
        throw new Error(`Failed to get invoice from Lightning service: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('💰 Invoice response data:', data);
      const invoice = data.pr;

      if (!invoice) {
        console.error('❌ No invoice found in response:', data);
        throw new Error('No invoice received from Lightning service');
      }

      console.log('📄 Got invoice:', invoice.substring(0, 50) + '...');

      // Send payment using Bitcoin Connect/WebLN
      const paymentResult = await sendPayment(invoice);

      // Publish zap receipt
      const zapReceipt = {
        kind: 9735,
        content: '',
        tags: [
          ['p', recipientPubkey],
          ['bolt11', invoice],
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Add preimage if available
      if (paymentResult.preimage) {
        zapReceipt.tags.push(['preimage', paymentResult.preimage]);
      }

      if (eventId) {
        zapReceipt.tags.push(['e', eventId]);
      }

      publishEvent(zapReceipt);

      // Trigger sparks animation
      setShowSparks(true);
      setTimeout(() => setShowSparks(false), 1000);

      toast({
        title: "Zap Sent! ⚡",
        description: `Successfully sent ${zapAmount} sats to ${lightningAddress}`,
      });

      setIsOpen(false);
      setComment('');
    } catch (error) {
      console.error('Zap error:', error);
      
      let errorMessage = "Failed to send zap";
      let title = "Zap Failed";
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to get payment endpoint')) {
          title = "Lightning Address Issue";
          errorMessage = `Could not resolve Lightning address: ${lightningAddress}. The Lightning service may be down or not configured correctly.`;
        } else if (error.message.includes('Failed to fetch')) {
          title = "Network Error";
          errorMessage = "Could not connect to Lightning service. This might be a CORS or network issue.";
        } else if (error.message.includes('Failed to get invoice')) {
          title = "Invoice Error";
          errorMessage = "The Lightning service couldn't generate an invoice. Please try again or contact the recipient.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsZapping(false);
    }
  };

  // Check if Lightning address is available
  const lightningAddress = getLightningAddress(authorData?.metadata);
  const canZap = isConnected && lightningAddress;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant={variant}
        size={size}
        className={`group relative transition-all duration-200 hover:bg-orange-500/10 ${className} ${showSparks ? 'animate-pulse' : ''}`}
        disabled={!canZap}
        title={!lightningAddress ? 'User has no Lightning address' : !isConnected ? 'Connect wallet to zap' : 'Send zap'}
      >
        <Zap className={`h-4 w-4 transition-all duration-200 ${
          !canZap 
            ? 'text-gray-500' 
            : 'text-orange-500 drop-shadow-[0_0_4px_rgba(255,165,0,0.6)] group-hover:text-orange-400 group-hover:drop-shadow-[0_0_8px_rgba(255,165,0,0.8)] group-hover:scale-110'
        } ${
          showSparks ? 'animate-bounce text-yellow-300 drop-shadow-[0_0_12px_rgba(255,255,0,1)]' : ''
        }`} />
        
        {/* Electric Sparks Effect */}
        {showSparks && (
          <>
            {/* Spark 1 */}
            <div className="absolute -top-1 -right-1 w-1 h-1 bg-yellow-300 rounded-full animate-ping opacity-75" />
            {/* Spark 2 */}
            <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-orange-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.1s' }} />
            {/* Spark 3 */}
            <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-yellow-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.2s' }} />
            {/* Spark 4 */}
            <div className="absolute bottom-0 right-0 w-0.5 h-0.5 bg-orange-300 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.3s' }} />
            {/* Central glow */}
            <div className="absolute inset-0 bg-orange-400/30 rounded-full animate-pulse" />
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Zap ⚡</DialogTitle>
            {lightningAddress && (
              <p className="text-sm text-muted-foreground">
                To: <span className="font-mono text-orange-500">{lightningAddress}</span>
              </p>
            )}
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
                disabled={isZapping || !canZap}
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
