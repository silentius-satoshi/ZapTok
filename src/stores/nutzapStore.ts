import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NostrEvent } from 'nostr-tools';
import type { ReceivedNutzap } from '@/hooks/useReceivedNutzaps';

export interface NutzapInformationalEvent {
  event: NostrEvent;
  relays: string[];
  mints: Array<{
    url: string;
    units?: string[];
  }>;
  p2pkPubkey: string;
}

export interface SentNutzap {
  id: string;
  recipientPubkey: string;
  amount: number;
  comment: string;
  mintUrl: string;
  timestamp: number;
  status: 'sent' | 'claimed';
}

export interface RedeemedNutzap {
  id: string;
  senderPubkey: string;
  amount: number;
  comment: string;
  mintUrl: string;
  timestamp: number;
  redeemedAt: number;
}

interface NutzapStore {
  // Store nutzap informational events by pubkey
  nutzapInfo: Record<string, NutzapInformationalEvent>;

  // Add or update nutzap info for a pubkey
  setNutzapInfo: (pubkey: string, info: NutzapInformationalEvent) => void;

  // Get nutzap info for a pubkey
  getNutzapInfo: (pubkey: string) => NutzapInformationalEvent | null;

  // Delete nutzap info for a pubkey
  deleteNutzapInfo: (pubkey: string) => void;

  // Sent nutzaps
  sentNutzaps: SentNutzap[];
  addSentNutzap: (nutzap: SentNutzap) => void;
  
  // Received nutzaps
  receivedNutzaps: Record<string, ReceivedNutzap[]>;
  setReceivedNutzaps: (pubkey: string, nutzaps: ReceivedNutzap[]) => void;
  getReceivedNutzaps: (pubkey: string) => ReceivedNutzap[];
  
  // Claimed nutzaps
  claimedNutzaps: string[];
  markNutzapAsClaimed: (nutzapId: string) => void;
  isNutzapClaimed: (nutzapId: string) => boolean;
  
  // Redeemed nutzaps
  redeemedNutzaps: RedeemedNutzap[];
  addRedeemedNutzap: (nutzap: RedeemedNutzap) => void;
}

export const useNutzapStore = create<NutzapStore>()(
  persist(
    (set, get) => ({
      nutzapInfo: {},
      sentNutzaps: [],
      receivedNutzaps: {},
      claimedNutzaps: [],
      redeemedNutzaps: [],

      setNutzapInfo(pubkey, info) {
        set(state => ({
          nutzapInfo: {
            ...state.nutzapInfo,
            [pubkey]: info
          }
        }));
      },

      getNutzapInfo(pubkey) {
        return get().nutzapInfo[pubkey] || null;
      },

      deleteNutzapInfo(pubkey) {
        set(state => {
          const nutzapInfo = { ...state.nutzapInfo };
          delete nutzapInfo[pubkey];
          return { nutzapInfo };
        });
      },

      addSentNutzap(nutzap) {
        set(state => ({
          sentNutzaps: [...state.sentNutzaps, nutzap]
        }));
      },

      setReceivedNutzaps(pubkey, nutzaps) {
        set(state => ({
          receivedNutzaps: {
            ...state.receivedNutzaps,
            [pubkey]: nutzaps
          }
        }));
      },

      getReceivedNutzaps(pubkey) {
        return get().receivedNutzaps[pubkey] || [];
      },

      markNutzapAsClaimed(nutzapId) {
        set(state => ({
          claimedNutzaps: [...state.claimedNutzaps, nutzapId]
        }));
      },

      isNutzapClaimed(nutzapId) {
        return get().claimedNutzaps.includes(nutzapId);
      },

      addRedeemedNutzap(nutzap) {
        set(state => ({
          redeemedNutzaps: [...state.redeemedNutzaps, nutzap]
        }));
      }
    }),
    { name: 'nutzap' }
  )
);