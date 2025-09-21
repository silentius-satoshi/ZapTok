import { useState } from 'react';
import { useSendNutzap, useFetchNutzapInfo, useVerifyMintCompatibility } from '@/hooks/useSendNutzap';
import { useCashuToken } from '@/hooks/useCashuToken';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { formatBalance } from '@/lib/cashu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Proof } from '@cashu/cashu-ts';
import {
  Send,
  Zap,
  Loader2,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface NutzapFormProps {
  recipientPubkey?: string;
  eventId?: string;
  onSuccess?: () => void;
  className?: string;
}

export function NutzapForm({
  recipientPubkey = '',
  eventId,
  onSuccess,
  className
}: NutzapFormProps) {
  const [pubkey, setPubkey] = useState(recipientPubkey);
  const [amount, setAmount] = useState<number>(21);
  const [comment, setComment] = useState('');

  const { user } = useCurrentUser();
  const { sendNutzap, isSending } = useSendNutzap();
  const { fetchNutzapInfo } = useFetchNutzapInfo();
  const { verifyMintCompatibility } = useVerifyMintCompatibility();
  const { sendToken } = useCashuToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pubkey.trim()) {
      toast.error("Please enter a recipient's npub or pubkey");
      return;
    }

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      // Get recipient info first
      const recipientInfo = await fetchNutzapInfo(pubkey);
      if (!recipientInfo) {
        throw new Error('Could not fetch recipient nutzap info');
      }

      // Verify mint compatibility and get a compatible mint URL
      const compatibleMintUrl = verifyMintCompatibility(recipientInfo);

      // Generate proofs using sendToken
      const proofs = (await sendToken(
        compatibleMintUrl,
        amount,
        recipientInfo.p2pkPubkey
      )) as Proof[];

      await sendNutzap({
        recipientInfo,
        comment,
        proofs,
        mintUrl: compatibleMintUrl,
        eventId
      });

      toast.success(`Successfully sent ${formatBalance(amount)} sats`);

      // Reset form
      if (!recipientPubkey) {
        setPubkey('');
      }
      setAmount(21);
      setComment('');

      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send nutzap');
    }
  };

  // Preset amounts
  const presetAmounts = [21, 100, 500, 1000, 5000];

  const isValidPubkey = (key: string) => {
    return key.length === 64 || key.startsWith('npub');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-orange-500" />
          <span>Send Nutzap</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient */}
          {!recipientPubkey && (
            <div className="space-y-2">
              <Label htmlFor="pubkey">Recipient</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pubkey"
                  value={pubkey}
                  onChange={(e) => setPubkey(e.target.value)}
                  placeholder="npub... or hex pubkey"
                  className="pl-10"
                />
              </div>
              {pubkey && !isValidPubkey(pubkey) && (
                <p className="text-xs text-destructive">
                  Please enter a valid npub or hex pubkey
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-3">
            <Label htmlFor="amount">Amount (sats)</Label>
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
                  type="button"
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

          {/* Context Info */}
          {eventId && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This nutzap will be attached to a specific post or event
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSending || amount <= 0 || pubkey.trim().length === 0 || (pubkey.trim().length > 0 && !isValidPubkey(pubkey))}
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
        </form>
      </CardContent>
    </Card>
  );
}