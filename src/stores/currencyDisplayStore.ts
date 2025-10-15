import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurrencyDisplayStore {
  displayCurrency: 'sats' | 'usd';
  showSats: boolean;
  setDisplayCurrency: (currency: 'sats' | 'usd') => void;
  toggleCurrency: () => void;
}

export const useCurrencyDisplayStore = create<CurrencyDisplayStore>()(
  persist(
    (set, get) => ({
      displayCurrency: 'sats',
      showSats: true,
      setDisplayCurrency: (currency) => set({ 
        displayCurrency: currency,
        showSats: currency === 'sats'
      }),
      toggleCurrency: () => {
        const newCurrency = get().displayCurrency === 'sats' ? 'usd' : 'sats';
        set({
          displayCurrency: newCurrency,
          showSats: newCurrency === 'sats'
        });
      },
    }),
    { name: 'currency-display' }
  )
);