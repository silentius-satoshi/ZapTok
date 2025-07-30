import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletUiState {
  expandedCards: {
    token: boolean;
    lightning: boolean;
    nutzap: boolean;
    history: boolean;
    mints: boolean;
  };
  toggleCardExpansion: (cardKey: keyof WalletUiState['expandedCards']) => void;
  setCardExpansion: (cardKey: keyof WalletUiState['expandedCards'], isExpanded: boolean) => void;
  showWallet: boolean;
  setShowWallet: (show: boolean) => void;
  balanceAnimation: boolean;
  setBalanceAnimation: (animate: boolean) => void;
}

export const useWalletUiStore = create<WalletUiState>()(
  persist(
    (set) => ({
      // All cards collapsed by default
      expandedCards: {
        token: false,
        lightning: true,
        nutzap: false,
        history: true,
        mints: true,
      },
      showWallet: false,
      balanceAnimation: false,
      toggleCardExpansion: (cardKey) =>
        set((state) => ({
          expandedCards: {
            ...state.expandedCards,
            [cardKey]: !state.expandedCards[cardKey],
          },
        })),
      setCardExpansion: (cardKey, isExpanded) =>
        set((state) => ({
          expandedCards: {
            ...state.expandedCards,
            [cardKey]: isExpanded,
          },
        })),
      setShowWallet: (show) => set({ showWallet: show }),
      setBalanceAnimation: (animate) => set({ balanceAnimation: animate }),
    }),
    {
      name: 'wallet-ui-state',
    }
  )
);
