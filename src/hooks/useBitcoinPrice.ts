import { useQuery } from '@tanstack/react-query';

interface BitcoinPrice {
  USD: number;
  EUR: number;
  GBP: number;
}

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur,gbp';

export function useBitcoinPrice() {
  return useQuery<BitcoinPrice>({
    queryKey: ['bitcoin-price'],
    queryFn: async () => {
      const response = await fetch(COINGECKO_API);
      if (!response.ok) {
        throw new Error('Failed to fetch Bitcoin price');
      }
      const data = await response.json();
      return {
        USD: data.bitcoin.usd,
        EUR: data.bitcoin.eur,
        GBP: data.bitcoin.gbp,
      };
    },
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
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