import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CashuRelay {
  url: string;
  name: string;
}

interface CashuRelayState {
  activeRelay: string;
  availableRelays: CashuRelay[];
  setActiveRelay: (relayUrl: string) => void;
  addRelay: (relay: CashuRelay) => void;
  removeRelay: (relayUrl: string) => void;
  getActiveRelayName: () => string;
}

// Default Cashu relays optimized for wallet operations
const defaultRelays: CashuRelay[] = [
  { url: 'wss://relay.chorus.community', name: 'Chorus' },
  { url: 'wss://relay.nostr.band', name: 'Nostr Band' },
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
];

const DEFAULT_CASHU_RELAY = 'wss://relay.chorus.community';

export const useCashuRelayStore = create<CashuRelayState>()(
  persist(
    (set, get) => ({
      activeRelay: DEFAULT_CASHU_RELAY,
      availableRelays: defaultRelays,
      
      setActiveRelay: (relayUrl: string) => {
        set({ activeRelay: relayUrl });
      },
      
      addRelay: (relay: CashuRelay) => {
        set((state) => ({
          availableRelays: [...state.availableRelays.filter(r => r.url !== relay.url), relay]
        }));
      },
      
      removeRelay: (relayUrl: string) => {
        set((state) => {
          const newAvailableRelays = state.availableRelays.filter(r => r.url !== relayUrl);
          // If removing the active relay, switch to the first available one
          const newActiveRelay = state.activeRelay === relayUrl 
            ? (newAvailableRelays[0]?.url || DEFAULT_CASHU_RELAY)
            : state.activeRelay;
          
          return {
            availableRelays: newAvailableRelays,
            activeRelay: newActiveRelay
          };
        });
      },
      
      getActiveRelayName: () => {
        const state = get();
        return state.availableRelays.find(r => r.url === state.activeRelay)?.name || 'Unknown';
      }
    }),
    {
      name: 'cashu-relay-state',
      version: 1,
    }
  )
);
