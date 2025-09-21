import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletUiStore {
  expandedCards: {
    wallet: boolean;
    token: boolean;
    history: boolean;
    lightning: boolean;
    nutzap: boolean;
    mints: boolean;
    cashuRelay: boolean;
  };
  isExpanded: boolean;
  balanceAnimation: boolean;
  // Methods
  toggleCard: (cardName: keyof WalletUiStore['expandedCards']) => void;
  toggleCardExpansion: (cardName: keyof WalletUiStore['expandedCards']) => void;
  toggleExpanded: (cardName?: keyof WalletUiStore['expandedCards'] | 'main') => void;
  setCardExpanded: (cardName: keyof WalletUiStore['expandedCards'], expanded: boolean) => void;
  setBalanceAnimation: (value: boolean) => void;
}

export const useWalletUiStore = create<WalletUiStore>()(
  persist(
    (set, get) => ({
      expandedCards: {
        wallet: true,
        token: false,
        history: true,
        lightning: false,
        nutzap: false,
        mints: true,
        cashuRelay: false,
      },
      balanceAnimation: false,
      get isExpanded() {
        return get().expandedCards.history;
      },
      toggleCard: (cardName) => set(state => ({
        expandedCards: {
          ...state.expandedCards,
          [cardName]: !state.expandedCards[cardName]
        }
      })),
      toggleCardExpansion: (cardName) => set(state => ({
        expandedCards: {
          ...state.expandedCards,
          [cardName]: !state.expandedCards[cardName]
        }
      })),
      toggleExpanded: (cardName = 'history') => {
        if (cardName === 'main') {
          set(state => ({
            expandedCards: {
              ...state.expandedCards,
              wallet: !state.expandedCards.wallet
            }
          }));
        } else {
          set(state => ({
            expandedCards: {
              ...state.expandedCards,
              [cardName]: !state.expandedCards[cardName]
            }
          }));
        }
      },
      setCardExpanded: (cardName, expanded) => set(state => ({
        expandedCards: {
          ...state.expandedCards,
          [cardName]: expanded
        }
      })),
      setBalanceAnimation: (value) => set({ balanceAnimation: value }),
    }),
    { name: 'wallet-ui' }
  )
);