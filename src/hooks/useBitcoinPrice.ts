import { useQuery } from '@tanstack/react-query';

interface BitcoinPriceResponse {
  source: 'mempool' | 'coingecko' | 'fallback';
  prices: {
    USD: number;
    EUR: number;
    GBP: number;
  };
  timestamp: number;
  error?: string;
}

interface BitcoinPrice {
  USD: number;
  EUR: number;
  GBP: number;
  source?: string;
  lastUpdated?: number;
}

const PRICE_API = '/api/bitcoin-price';

export function useBitcoinPrice() {
  return useQuery<BitcoinPrice>({
    queryKey: ['bitcoin-price'],
    queryFn: async () => {
      const response = await fetch(PRICE_API);
      
      if (!response.ok) {
        throw new Error(`Price API failed: ${response.status}`);
      }
      
      const data: BitcoinPriceResponse = await response.json();
      
      // Log source for debugging
      if (data.source === 'fallback') {
        console.warn('[Bitcoin Price] Using fallback prices - APIs unavailable');
      } else {
        console.log(`[Bitcoin Price] Retrieved from ${data.source}`);
      }
      
      return {
        USD: data.prices.USD,
        EUR: data.prices.EUR,
        GBP: data.prices.GBP,
        source: data.source,
        lastUpdated: data.timestamp
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function satsToUSD(sats: number, btcPriceUSD: number): number {
  return (sats / 100000000) * btcPriceUSD;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount < 1 ? 4 : 2,
    maximumFractionDigits: amount < 1 ? 4 : 2,
  }).format(amount);
}