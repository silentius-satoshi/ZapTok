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
      get showSats() {
        return get().displayCurrency === 'sats';
      },
      setDisplayCurrency: (currency) => set({ displayCurrency: currency }),
      toggleCurrency: () => set({
        displayCurrency: get().displayCurrency === 'sats' ? 'usd' : 'sats'
      }),
    }),
    { name: 'currency-display' }
  )
);