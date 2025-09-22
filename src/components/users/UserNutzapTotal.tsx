import { useUserNutzapTotal } from "@/hooks/useUserNutzaps";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { formatBalance } from "@/lib/cashu";
import { DollarSign, Bitcoin, ArrowLeftRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef } from "react";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";

interface UserNutzapTotalProps {
  userPubkey: string;
  className?: string;
}

export function UserNutzapTotal({ userPubkey, className = "" }: UserNutzapTotalProps) {
  const { total, isLoading: isLoadingTotal } = useUserNutzapTotal(userPubkey);
  const { data: btcPrice, isLoading: isLoadingPrice } = useBitcoinPrice();
  const { showSats, toggleCurrency } = useCurrencyDisplayStore();
  const [isFlashing, setIsFlashing] = useState(false);
  const prevValueRef = useRef<string>("");

  const usdAmount = btcPrice ? satsToUSD(total, btcPrice.USD) : 0;
  const currentValue = showSats ? formatBalance(total) : formatUSD(usdAmount);

  useEffect(() => {
    if (prevValueRef.current && prevValueRef.current !== currentValue && !showSats) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 300);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = currentValue;
  }, [currentValue, showSats]);

  if (isLoadingTotal || (isLoadingPrice && !btcPrice)) {
    return <Skeleton className={`h-6 w-24 ${className}`} />;
  }

  // Always show even when total is 0, displaying "0 sats" or "$0.00"
  return (
    <button
      type="button"
      onClick={() => toggleCurrency()}
      className={`flex items-center w-full h-full transition-colors cursor-pointer border border-input rounded-md pl-3 pr-3 py-1.5 bg-transparent hover:bg-accent/50 text-xs ${className}`}
      title="Click to toggle between USD and sats"
    >
      <div className="flex items-center">
        {showSats ? (
          <Bitcoin className="h-4 w-4 mr-1 text-amber-500" />
        ) : (
          <DollarSign className="h-4 w-4 mr-1 text-green-500" />
        )}
        <span className={`text-xs tabular-nums ${isFlashing ? 'flash-update' : ''} ${showSats ? 'text-amber-500' : 'text-green-500'}`}>
          {currentValue}
        </span>
      </div>
      <div className="flex-1" />
      <ArrowLeftRight className="h-4 w-4" />
    </button>
  );
}