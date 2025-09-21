import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthor } from "@/hooks/useAuthor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendNutzap, useVerifyMintCompatibility } from "@/hooks/useSendNutzap";
import { useFetchNutzapInfo } from "@/hooks/useNutzaps";
import { useCashuWallet } from "@/hooks/useCashuWallet";
import { useCashuStore } from "@/stores/cashuStore";
import { useCashuToken } from "@/hooks/useCashuToken";
import { useNutzapStore } from "@/stores/nutzapStore";
import { Proof } from "@cashu/cashu-ts";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { formatBalance } from "@/lib/cashu";
import { Loader2, CheckCircle, AlertTriangle, Info } from "lucide-react";

interface UserNutzapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pubkey: string;
}

export function UserNutzapDialog({ open, onOpenChange, pubkey }: UserNutzapDialogProps) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const cashuStore = useCashuStore();
  const nutzapStore = useNutzapStore();
  const { sendToken } = useCashuToken();
  const { sendNutzap, isSending } = useSendNutzap();
  const { verifyMintCompatibility } = useVerifyMintCompatibility();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Enhanced: Use the improved nutzap discovery hook
  const { data: recipientInfo, isLoading: isFetchingInfo, error: fetchError } = useFetchNutzapInfo(pubkey);

  const displayName = metadata?.name || pubkey.slice(0, 8);
  const profileImage = metadata?.picture;

  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Enhanced: Check compatibility status
  const [compatibilityStatus, setCompatibilityStatus] = useState<{
    canReceive: boolean;
    compatibleMints: number;
    reason?: string;
  }>({ canReceive: false, compatibleMints: 0 });

  // Update compatibility when recipient info changes
  useEffect(() => {
    if (recipientInfo) {
      // Basic compatibility check
      const activeMintUrl = cashuStore.activeMintUrl || '';
      const recipientMints = recipientInfo.mints.map(mint => mint.url);
      const canReceive = recipientMints.includes(activeMintUrl) ||
        recipientMints.some(mintUrl => cashuStore.mints.map(m => m.url).includes(mintUrl));

      setCompatibilityStatus({
        canReceive,
        compatibleMints: recipientMints.length,
        reason: canReceive ? undefined : 'No compatible mints found'
      });
    }
  }, [recipientInfo, cashuStore]);

  // Create a unique event ID for the zap
  const eventId = `user-zap-${pubkey.slice(0, 8)}-${Date.now()}`;

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
        amountValue = Math.round((usdAmount / btcPrice.USD) * 100000000); // Convert USD to sats
      }

      if (amountValue < 1) {
        toast.error("Amount must be at least 1 sat");
        return;
      }

      // Enhanced: Use the already fetched recipient info
      if (!recipientInfo) {
        toast.error("Cannot find recipient's wallet information. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Enhanced: Check compatibility before proceeding
      if (!compatibilityStatus.canReceive) {
        toast.error(
          compatibilityStatus.reason ||
          "This user cannot receive eCash from your available mints."
        );
        setIsProcessing(false);
        return;
      }

      const p2pkPubkey = recipientInfo.p2pkPubkey;

      // Validate that we have a proper P2PK pubkey
      if (!p2pkPubkey) {
        toast.error("Recipient has not published their Cashu wallet public key");
        setIsProcessing(false);
        return;
      }

      // Use the compatible mint URL from our previous verification
      const compatibleMintUrl = verifyMintCompatibility(recipientInfo);

      // Send token using the compatible mint and P2PK locking
      const result = await sendToken(amountValue, {
        isNutzap: true,
        recipientPubkey: p2pkPubkey,
        publicNote: comment
      });

      // Send nutzap event
      await sendNutzap({
        recipientInfo,
        comment,
        proofs: result.proofs,
        mintUrl: compatibleMintUrl,
        eventId: eventId,
      });

      toast.success(`Successfully sent ${formatAmount(amountValue)} to ${displayName}`);

      // Log success with compatibility info
      const wasUpgraded = compatibleMintUrl !== cashuStore.activeMintUrl;
      console.log("✅ Nutzap sent successfully", {
        amount: amountValue,
        recipient: recipientInfo?.event.pubkey || pubkey,
        compatibleMint: compatibleMintUrl,
        wasUpgraded,
        comment: comment || "(no comment)"
      });

      setAmount("");
      setComment("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending nutzap:", error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-10 w-10 mb-2">
              <AvatarImage src={profileImage} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <DialogTitle>
              Send eCash to {displayName}
            </DialogTitle>
            <DialogDescription className="text-center mt-1">
              Send eCash directly to this user to show your support.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Enhanced: Recipient wallet status indicator */}
        <div className="mb-4">
          {isFetchingInfo ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking recipient's wallet...
            </div>
          ) : fetchError ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              User hasn't set up eCash receiving
            </div>
          ) : recipientInfo ? (
            <div className="space-y-2">
              {compatibilityStatus.canReceive ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Ready to receive eCash
                  {compatibilityStatus.compatibleMints > 1 && (
                    <span className="text-muted-foreground">
                      ({compatibilityStatus.compatibleMints} compatible mints)
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {compatibilityStatus.reason}
                </div>
              )}

              {recipientInfo.mints && recipientInfo.mints.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <Info className="h-3 w-3 inline mr-1" />
                  Using mint: {recipientInfo.mints[0]?.url || 'Unknown'}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-amount" className="text-right">
              Amount {showSats ? "(sats)" : "(USD)"}
            </Label>
            <Input
              id="user-amount"
              type="number"
              placeholder={showSats ? "100" : "0.10"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              disabled={!compatibilityStatus.canReceive}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user-comment" className="text-right">
              Comment
            </Label>
            <Input
              id="user-comment"
              placeholder="Thanks for your contributions!"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="col-span-3"
              disabled={!compatibilityStatus.canReceive}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2">
          {!compatibilityStatus.canReceive && recipientInfo && (
            <div className="text-sm text-muted-foreground text-center">
              This user needs to set up compatible mints to receive eCash from you.
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing || isSending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSendNutzap}
              disabled={
                isProcessing ||
                isSending ||
                isFetchingInfo ||
                !amount ||
                !compatibilityStatus.canReceive
              }
            >
              {isProcessing || isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                "Send eCash"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}