import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { DollarSign, Loader2, Bitcoin, AlertCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCashuWallet } from "@/hooks/useCashuWallet";
import { useCashuStore } from "@/stores/cashuStore";
import { useCashuToken } from "@/hooks/useCashuToken";
import { useSendNutzap, useFetchNutzapInfo, useVerifyMintCompatibility } from "@/hooks/useSendNutzap";
import { formatBalance } from "@/lib/cashu";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { NutzapList } from "./NutzapList";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NutzapInterfaceProps {
  postId: string;
  authorPubkey: string;
  relayHint?: string;
  onSuccess?: () => void;
}

export function NutzapInterface({ postId, authorPubkey, relayHint, onSuccess }: NutzapInterfaceProps) {
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const cashuStore = useCashuStore();
  const { sendToken } = useCashuToken();
  const { sendNutzap, isSending } = useSendNutzap();
  const { fetchNutzapInfo, isFetching } = useFetchNutzapInfo();
  const { verifyMintCompatibility } = useVerifyMintCompatibility();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recipientWalletStatus, setRecipientWalletStatus] = useState<'loading' | 'no-wallet' | 'no-compatible-mint' | 'ready'>('loading');

  // Check recipient wallet status when component mounts
  useEffect(() => {
    if (!user || !wallet || !cashuStore.activeMintUrl) {
      return;
    }

    let cancelled = false;

    const checkRecipientWallet = async () => {
      try {
        setRecipientWalletStatus('loading');
        const recipientInfo = await fetchNutzapInfo(authorPubkey);

        if (cancelled) return;

        // Try to verify mint compatibility
        try {
          verifyMintCompatibility(recipientInfo);
          if (!cancelled) {
            setRecipientWalletStatus('ready');
          }
        } catch {
          if (!cancelled) {
            setRecipientWalletStatus('no-compatible-mint');
          }
        }
      } catch {
        // If we can't fetch nutzap info, recipient doesn't have a wallet
        if (!cancelled) {
          setRecipientWalletStatus('no-wallet');
        }
      }
    };

    checkRecipientWallet();

    return () => {
      cancelled = true;
    };
  }, [authorPubkey, user, wallet, cashuStore.activeMintUrl, fetchNutzapInfo, verifyMintCompatibility]);

  // Format amount based on user preference
  const formatAmount = (sats: number) => {
    if (showSats) {
      return formatBalance(sats);
    } else if (btcPrice) {
      return formatUSD(satsToUSD(sats, btcPrice.USD));
    }
    return formatBalance(sats);
  };

  const handleSendNutzap = async () => {
    if (!user || !wallet || !cashuStore.activeMintUrl) {
      return;
    }

    if (!amount || isNaN(parseFloat(amount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setIsProcessing(true);

      // Fetch recipient's nutzap info
      const recipientInfo = await fetchNutzapInfo(authorPubkey);

      // Convert amount based on currency preference
      let amountValue: number;

      if (showSats) {
        amountValue = parseInt(amount);
      } else {
        // Convert USD to sats
        if (!btcPrice) {
          toast.error("Bitcoin price not available");
          return;
        }
        const usdAmount = parseFloat(amount);
        amountValue = Math.round(usdAmount / btcPrice.USD * 100000000); // Convert USD to sats
      }

      if (amountValue < 1) {
        toast.error("Amount must be at least 1 sat");
        return;
      }

      // Verify mint compatibility and get a compatible mint URL
      const compatibleMintUrl = verifyMintCompatibility(recipientInfo);

      // Send nutzap using recipient info
      await sendNutzap({
        recipientInfo,
        comment,
        amount: amountValue,
        eventId: postId,
        relayHint,
      });

      toast.success(`Successfully sent ${formatAmount(amountValue)}`);

      // Clear form
      setAmount("");
      setComment("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error sending nutzap:", error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isProcessing || isSending || isFetching;

  return (
    <div className="mt-3 space-y-3">
      {/* Check if user has their own wallet first */}
      {!user ? (
        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            You must be logged in to send eCash.
          </AlertDescription>
        </Alert>
      ) : !wallet ? (
        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            You need to set up a Cashu wallet first to send eCash.
          </AlertDescription>
        </Alert>
      ) : !cashuStore.activeMintUrl ? (
        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            No active mint selected. Please select a mint in your wallet settings.
          </AlertDescription>
        </Alert>
      ) : recipientWalletStatus === 'loading' ? (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Checking recipient wallet compatibility...
          </AlertDescription>
        </Alert>
      ) : recipientWalletStatus === 'no-wallet' ? (
        <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-900 dark:text-red-100">
            This user hasn't set up a Cashu wallet yet and cannot receive eCash.
          </AlertDescription>
        </Alert>
      ) : recipientWalletStatus === 'no-compatible-mint' ? (
        <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-900 dark:text-red-100">
            No compatible mint found. You and the recipient need to use the same mint to send eCash.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount {showSats ? "(sats)" : "(USD)"}
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step={showSats ? "1" : "0.01"}
                placeholder={showSats ? "100" : "0.10"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Input
                id="comment"
                placeholder="Great post!"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <Button
            onClick={handleSendNutzap}
            disabled={isLoading || !amount}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                {showSats ? (
                  <Bitcoin className="h-4 w-4 mr-2" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                Send {amount && !isNaN(parseFloat(amount)) ? formatAmount(showSats ? parseInt(amount) : Math.round(parseFloat(amount) / (btcPrice?.USD || 1) * 100000000)) : 'eCash'}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Show existing nutzaps for this post */}
      <NutzapList postId={postId} />
    </div>
  );
}