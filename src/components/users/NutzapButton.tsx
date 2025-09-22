import { Button } from "@/components/ui/button";
import { DollarSign, Bitcoin } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNostr } from "@/hooks/useNostr";
import { useQuery } from "@tanstack/react-query";
import { CASHU_EVENT_KINDS } from "@/lib/cashu";
import { formatBalance } from "@/lib/cashu";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { useCashuWallet } from "@/hooks/useCashuWallet";
import { useCashuStore } from "@/stores/cashuStore";
import { useIsMobile } from "@/hooks/useIsMobile";

// Type augmentation for window object
declare global {
  interface Window {
    [key: `zapRefetch_${string}`]: () => void;
  }
}

interface NutzapButtonProps {
  postId: string;
  authorPubkey: string;
  relayHint?: string;
  showText?: boolean;
  onToggle?: (isOpen: boolean) => void;
  isOpen?: boolean;
  refetchZaps?: () => void;
}

export function NutzapButton({ postId, showText = true, onToggle, isOpen = false, refetchZaps }: NutzapButtonProps) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { wallet } = useCashuWallet();
  const cashuStore = useCashuStore();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();
  const isMobile = useIsMobile();

  // Query to get all nutzaps for this post
  const { data: nutzapData, refetch } = useQuery({
    queryKey: ["nutzap-total", postId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query([{
        kinds: [CASHU_EVENT_KINDS.ZAP],
        "#e": [postId],
        limit: 50,
      }], { signal });

      let totalAmount = 0;
      let zapCount = 0;

      for (const event of events) {
        try {
          // Get proofs from tags
          const proofTags = event.tags.filter(tag => tag[0] === "proof");
          if (proofTags.length === 0) continue;

          const proofs = proofTags
            .map(tag => {
              try {
                return JSON.parse(tag[1]);
              } catch {
                return null;
              }
            })
            .filter(Boolean);

          // Calculate amount and add to total
          for (const proof of proofs) {
            totalAmount += proof.amount;
          }
          
          if (proofs.length > 0) {
            zapCount++;
          }
        } catch (error) {
          console.error("Error processing nutzap:", error);
        }
      }

      return { totalAmount, zapCount };
    },
    enabled: !!nostr && !!postId,
  });

  // Format amount based on user preference
  const formatAmount = (sats: number) => {
    if (showSats) {
      return formatBalance(sats);
    } else if (btcPrice) {
      return formatUSD(satsToUSD(sats, btcPrice.USD));
    }
    return formatBalance(sats);
  };

  const handleZapClick = () => {
    if (!user) {
      toast.error("You must be logged in to send eCash");
      return;
    }

    if (!wallet) {
      toast.error("You need to set up a Cashu wallet first");
      return;
    }

    if (!cashuStore.activeMintUrl) {
      toast.error("No active mint selected. Please select a mint in your wallet settings.");
      return;
    }

    // Notify parent component if callback provided
    if (onToggle) {
      onToggle(!isOpen);
    }
  };

  const nutzapTotal = nutzapData?.totalAmount || 0;

  // Pass refetch to parent if needed
  if (refetchZaps && refetch) {
    // Store reference for parent to use
    window[`zapRefetch_${postId}`] = refetch;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`group rounded-full bg-transparent hover:bg-white/10 text-white transition-all duration-200 ${
        isMobile ? 'h-12 w-12' : 'h-20 w-20'
      }`}
      onClick={handleZapClick}
    >
      {showSats ? (
        <img 
          src="/images/cashu-icon.png" 
          alt="Cashu" 
          className="drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-all duration-200"
          style={{
            width: isMobile ? '28px' : '30px',
            height: isMobile ? '28px' : '30px'
          }}
        />
      ) : (
        <DollarSign 
          className={`text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] group-hover:text-green-300 group-hover:scale-110 transition-all duration-200 ${nutzapTotal > 0 ? 'text-green-500' : ''}`}
          style={{
            width: isMobile ? '28px' : '30px',
            height: isMobile ? '28px' : '30px'
          }}
        />
      )}
      {showText && <span className="text-xs ml-0.5">{formatAmount(nutzapTotal)}</span>}
    </Button>
  );
}