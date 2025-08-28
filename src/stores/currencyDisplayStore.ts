import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurrencyDisplayState {
  showSats: boolean;
  toggleCurrency: () => void;
  setShowSats: (show: boolean) => void;
}

export const useCurrencyDisplayStore = create<CurrencyDisplayState>()(
  persist(
    (set) => ({
      showSats: true, // Default to showing sats
      toggleCurrency: () => set((state) => ({ showSats: !state.showSats })),
      setShowSats: (show: boolean) => set({ showSats: show }),
    }),
    {
      name: 'currency-display-storage',
    }
  )
);