import { useQuery } from '@tanstack/react-query';

export interface BitcoinPriceData {
  usd: number;
  usd_24h_change: number;
}

/**
 * Hook to fetch current Bitcoin price in USD
 */
export function useBitcoinPrice() {
  return useQuery({
    queryKey: ['bitcoin-price'],
    queryFn: async (): Promise<BitcoinPriceData> => {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
      if (!response.ok) {
        throw new Error('Failed to fetch Bitcoin price');
      }
      const data = await response.json();
      return {
        usd: data.bitcoin.usd,
        usd_24h_change: data.bitcoin.usd_24h_change
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Convert satoshis to USD
 */
export function satsToUSD(sats: number, btcPrice?: number): number {
  if (!btcPrice) return 0;
  return (sats / 100_000_000) * btcPrice;
}

/**
 * Convert USD to satoshis
 */
export function usdToSats(usd: number, btcPrice?: number): number {
  if (!btcPrice) return 0;
  return Math.round((usd / btcPrice) * 100_000_000);
}

/**
 * Format USD amount with proper currency symbol
 */
export function formatUSD(amount: number): string {
  if (amount < 0.01) {
    return '< $0.01';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format amount based on size for better readability
 */
export function formatUSDCompact(amount: number): string {
  if (amount < 0.01) {
    return '< $0.01';
  } else if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  } else {
    return formatUSD(amount);
  }
}