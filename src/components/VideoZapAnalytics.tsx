import { Zap } from 'lucide-react';
import { useVideoReactions } from '@/hooks/useVideoReactions';
import { useVideoNutzaps } from '@/hooks/useVideoNutzaps';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useBitcoinPrice, satsToUSD } from '@/hooks/useBitcoinPrice';

interface VideoZapAnalyticsProps {
  videoId: string;
  className?: string;
}

/**
 * Display zap analytics for video thumbnails in grid view
 * Shows combined total from Lightning zaps and Cashu nutzaps
 * Styled like the play button overlay in the screenshot
 */
export function VideoZapAnalytics({ videoId, className = '' }: VideoZapAnalyticsProps) {
  const reactions = useVideoReactions(videoId);
  const nutzapData = useVideoNutzaps(videoId);
  
  // Currency display settings
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Calculate total amount (Lightning zaps + Cashu nutzaps)
  const totalSats = (reactions?.totalSats || 0) + (nutzapData?.totalAmount || 0);

  // Format amount based on currency preference
  const formatAmount = (amount: number): string => {
    if (showSats) {
      // Display in sats
      if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1)}M`;
      } else if (amount >= 1_000) {
        return `${(amount / 1_000).toFixed(1)}K`;
      }
      return amount.toString();
    } else {
      // Display in USD
      if (btcPrice?.USD) {
        const usdAmount = satsToUSD(amount, btcPrice.USD);
        if (usdAmount >= 1_000) {
          return `$${(usdAmount / 1_000).toFixed(1)}K`;
        }
        return `$${usdAmount.toFixed(2)}`;
      }
      // Fallback to sats if price unavailable
      if (amount >= 1_000) {
        return `${(amount / 1_000).toFixed(1)}K`;
      }
      return amount.toString();
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Yellow filled lightning icon like ZapButton */}
      <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
      {/* Amount text with shadow for visibility - smaller font to match screenshot */}
      <span className="text-white font-bold text-xs drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
        {formatAmount(totalSats)}
      </span>
      {showSats && (
        <span className="text-white/90 text-xs font-medium drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
          sats
        </span>
      )}
    </div>
  );
}
