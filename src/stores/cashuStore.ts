import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Proof, MintQuoteResponse, MeltQuoteResponse } from '@cashu/cashu-ts';
import type { P2PKSecret } from '@/lib/p2pk';
import type { NostrEvent } from 'nostr-tools';

export interface CashuWalletStruct {
  id: string;
  name: string;
  unit: string;
  mints: string[];
  balance: number;
  proofs: Proof[];
  p2pkSecret?: P2PKSecret;
  lastUpdated: number;
  event?: NostrEvent;
  privkey?: string; // Private key used to unlock P2PK ecash
}

export interface CashuMintStruct {
  url: string;
  keysets?: any[];
  keys?: any[];
  info?: any;
  mintInfo?: any;
  isActive: boolean;
  events?: any[];
}

export interface CashuQuote {
  id: string;
  mintUrl: string;
  amount: number;
  unit: string;
  request?: string;
  paid: boolean;
  expiry: number;
}

export interface CashuEventStruct {
  id: string;
  token: any;
  createdAt: number;
}

export interface Nip60TokenEvent {
  id: string;
  token: any;
  createdAt: number;
}

export interface CashuStore {
  // Wallets
  wallets: CashuWalletStruct[];
  wallet: CashuWalletStruct | null; // Current active wallet
  activeWalletId: string | null;

  // Mints
  mints: CashuMintStruct[];
  activeMintUrl: string | null;

  // Proof-to-event mapping
  proofEventMap: Map<string, string>;

  // Quote storage maps
  mintQuotes: Map<string, MintQuoteResponse>;
  meltQuotes: Map<string, MeltQuoteResponse>;

  // All proofs across all wallets (computed getter)
  proofs: Proof[];

  // Add or update a wallet
  addWallet: (wallet: CashuWalletStruct) => void;

  // Remove a wallet
  removeWallet: (id: string) => void;

  // Set active wallet
  setActiveWallet: (walletId: string | null) => void;

  // Add or update a mint
  addMint: (mint: CashuMintStruct | string) => void;

  // Remove a mint
  removeMint: (url: string) => void;

  // Get mint by URL
  getMint: (url: string) => CashuMintStruct | undefined;

  // Update mint info
  updateMint: (mintUrl: string, updates: Partial<CashuMintStruct>) => void;

  // Active mint methods
  setActiveMintUrl: (url: string | null) => void;
  getActiveMintUrl: () => string | null;

  // Private key methods for P2PK
  setPrivkey: (privkey: string) => void;
  setMintInfo: (mintUrl: string, info: any) => void;
  setKeysets: (mintUrl: string, keysets: any[]) => void;
  setKeys: (mintUrl: string, keys: any) => void;

  // Proofs
  addProofs: (proofs: Proof[], eventId: string) => void;
  removeProofs: (proofs: Proof[]) => void;
  getProofsForAmount: (mintUrl: string, amount: number) => Proof[] | null;
  getProofEventId: (proof: Proof) => string | undefined;
  setProofEventId: (proof: Proof, eventId: string) => void;
  getProofsByEventId: (eventId: string) => Proof[];

  // Quotes - updated to handle both mint and melt quotes
  addQuote: (mintUrl: string, quote: MintQuoteResponse | MeltQuoteResponse) => void;
  removeQuote: (id: string) => void;

  // Separate methods for mint and melt quotes (Chorus compatibility)
  addMintQuote: (mintUrl: string, quote: MintQuoteResponse) => void;
  addMeltQuote: (mintUrl: string, quote: MeltQuoteResponse) => void;
  updateMintQuote: (mintUrl: string, quoteId: string, quote: MintQuoteResponse) => void;
  updateMeltQuote: (mintUrl: string, quoteId: string, quote: MeltQuoteResponse) => void;
  getMeltQuote: (mintUrl: string, quoteId: string) => MeltQuoteResponse;

  // Persisted storage for events
  events: CashuEventStruct[];
  addEvent: (event: CashuEventStruct) => void;

  // Utility methods
  getTotalBalance: () => number;
  getBalanceByMint: (mintUrl: string) => number;
  
  // Chorus compatibility methods
  getMintProofs: (mintUrl: string) => Promise<Proof[]>;
  privkey?: string;
}

export const useCashuStore = create<CashuStore>()(
  persist(
    immer((set, get) => ({
      wallets: [],
      wallet: null,
      activeWalletId: null,
      mints: [],
      events: [],
      activeMintUrl: null,
      proofEventMap: new Map<string, string>(), // proof.secret -> eventId

      // Quote storage maps
      mintQuotes: new Map<string, MintQuoteResponse>(),
      meltQuotes: new Map<string, MeltQuoteResponse>(),

      // Computed getter for all proofs across all wallets
      get proofs() {
        const state = get();
        return state.wallets.flatMap(wallet => wallet.proofs || []);
      },

      addWallet: (wallet: CashuWalletStruct) => {
        set((state) => {
          const existingIndex = state.wallets.findIndex(w => w.id === wallet.id);
          if (existingIndex >= 0) {
            state.wallets[existingIndex] = wallet;
          } else {
            state.wallets.push(wallet);
          }
          // Set as active if no active wallet
          if (!state.activeWalletId) {
            state.activeWalletId = wallet.id;
            state.wallet = wallet;
          }
        });
      },

      removeWallet: (id: string) => {
        set((state) => {
          state.wallets = state.wallets.filter(w => w.id !== id);
          if (state.activeWalletId === id) {
            state.activeWalletId = state.wallets[0]?.id || null;
            state.wallet = state.wallets[0] || null;
          }
        });
      },

      setActiveWallet: (walletId: string | null) => {
        set((state) => {
          state.activeWalletId = walletId;
          state.wallet = walletId ? state.wallets.find(w => w.id === walletId) || null : null;
        });
      },

      addMint: (mint: CashuMintStruct | string) => {
        set((state) => {
          const mintStruct = typeof mint === 'string' 
            ? { url: mint, isActive: true } as CashuMintStruct
            : mint;
          
          const existingIndex = state.mints.findIndex(m => m.url === mintStruct.url);
          if (existingIndex >= 0) {
            state.mints[existingIndex] = { ...state.mints[existingIndex], ...mintStruct };
          } else {
            state.mints.push(mintStruct);
          }
        });
      },

      removeMint: (url: string) => {
        set((state) => {
          state.mints = state.mints.filter(m => m.url !== url);
        });
      },

      getMint: (url: string) => {
        const state = get();
        return state.mints.find(m => m.url === url);
      },

      updateMint: (mintUrl: string, updates: Partial<CashuMintStruct>) => {
        set((state) => {
          const mint = state.mints.find(m => m.url === mintUrl);
          if (mint) {
            Object.assign(mint, updates);
          }
        });
      },

      setActiveMintUrl: (url: string | null) => {
        set((state) => {
          state.activeMintUrl = url;
        });
      },

      getActiveMintUrl: () => {
        const state = get();
        return state.activeMintUrl;
      },

      setPrivkey: (privkey: string) => {
        set((state) => {
          if (state.wallet) {
            state.wallet.privkey = privkey;
          }
        });
      },

      setMintInfo: (mintUrl: string, info: any) => {
        set((state) => {
          const mint = state.mints.find(m => m.url === mintUrl);
          if (mint) {
            mint.mintInfo = info;
            mint.info = info;
          }
        });
      },

      setKeysets: (mintUrl: string, keysets: any[]) => {
        set((state) => {
          const mint = state.mints.find(m => m.url === mintUrl);
          if (mint) {
            mint.keysets = keysets;
          }
        });
      },

      setKeys: (mintUrl: string, keys: any) => {
        set((state) => {
          const mint = state.mints.find(m => m.url === mintUrl);
          if (mint) {
            mint.keys = keys;
          }
        });
      },

      addProofs: (proofs: Proof[], eventId: string) => {
        set((state) => {
          // Map each proof to its event ID
          proofs.forEach(proof => {
            state.proofEventMap.set(proof.secret, eventId);
          });
          
          // Find wallet that can store these proofs (for now, use the first wallet)
          const wallet = state.wallets[0];
          if (wallet) {
            wallet.proofs.push(...proofs);
            wallet.balance = wallet.proofs.reduce((sum, p) => sum + p.amount, 0);
            wallet.lastUpdated = Date.now();
          }
        });
      },

      removeProofs: (proofs: Proof[]) => {
        set((state) => {
          // Remove proof-event mappings
          proofs.forEach(proof => {
            state.proofEventMap.delete(proof.secret);
          });
          
          // Remove proofs from wallets
          state.wallets.forEach(wallet => {
            wallet.proofs = wallet.proofs.filter(p =>
              !proofs.some(rp => rp.secret === p.secret && rp.C === p.C)
            );
            wallet.balance = wallet.proofs.reduce((sum, p) => sum + p.amount, 0);
            wallet.lastUpdated = Date.now();
          });
        });
      },

      getProofsForAmount: (mintUrl: string, amount: number) => {
        const state = get();
        const wallet = state.wallets.find(w => w.mints.includes(mintUrl));
        if (!wallet) return null;

        // Sort proofs by amount (smallest first for better change)
        const sortedProofs = [...wallet.proofs].sort((a, b) => a.amount - b.amount);
        const selectedProofs: Proof[] = [];
        let total = 0;

        for (const proof of sortedProofs) {
          if (total >= amount) break;
          selectedProofs.push(proof);
          total += proof.amount;
        }

        return total >= amount ? selectedProofs : null;
      },

      getProofEventId: (proof: Proof) => {
        const state = get();
        return state.proofEventMap.get(proof.secret);
      },

      setProofEventId: (proof: Proof, eventId: string) => {
        set((state) => {
          state.proofEventMap.set(proof.secret, eventId);
        });
      },

      getProofsByEventId: (eventId: string) => {
        const state = get();
        const proofs: Proof[] = [];
        
        // Find all proofs with this eventId
        for (const [secret, mappedEventId] of state.proofEventMap.entries()) {
          if (mappedEventId === eventId) {
            // Find the actual proof object
            for (const wallet of state.wallets) {
              const proof = wallet.proofs.find(p => p.secret === secret);
              if (proof) {
                proofs.push(proof);
              }
            }
          }
        }
        
        return proofs;
      },

      addQuote: (mintUrl: string, quote: MintQuoteResponse | MeltQuoteResponse) => {
        set((state) => {
          // Create a CashuQuote from the mint/melt quote
          const cashuQuote: CashuQuote = {
            id: 'quote' in quote ? quote.quote : (quote as any).request || '',
            mintUrl,
            amount: quote.amount,
            unit: 'sat',
            request: 'request' in quote ? quote.request : undefined,
            paid: 'state' in quote ? quote.state === 'PAID' : false,
            expiry: Date.now() + (3600 * 1000), // Default 1 hour
          };
          // Store it (could be in a quotes array if we add one)
        });
      },

      removeQuote: (id: string) => {
        // Remove quote by id
      },

      // Chorus compatibility methods for quotes
      addMintQuote: (mintUrl: string, quote: MintQuoteResponse) => {
        set((state) => {
          const newMintQuotes = new Map(state.mintQuotes);
          newMintQuotes.set(`${mintUrl}:${quote.quote}`, quote);
          return { mintQuotes: newMintQuotes };
        });
      },

      addMeltQuote: (mintUrl: string, quote: MeltQuoteResponse) => {
        set((state) => {
          const newMeltQuotes = new Map(state.meltQuotes);
          newMeltQuotes.set(`${mintUrl}:${quote.quote}`, quote);
          return { meltQuotes: newMeltQuotes };
        });
      },

      updateMintQuote: (mintUrl: string, quoteId: string, quote: MintQuoteResponse) => {
        set((state) => {
          const newMintQuotes = new Map(state.mintQuotes);
          newMintQuotes.set(`${mintUrl}:${quoteId}`, quote);
          return { mintQuotes: newMintQuotes };
        });
      },

      updateMeltQuote: (mintUrl: string, quoteId: string, quote: MeltQuoteResponse) => {
        set((state) => {
          const newMeltQuotes = new Map(state.meltQuotes);
          newMeltQuotes.set(`${mintUrl}:${quoteId}`, quote);
          return { meltQuotes: newMeltQuotes };
        });
      },

      getMeltQuote: (mintUrl: string, quoteId: string) => {
        const state = get();
        const quote = state.meltQuotes.get(`${mintUrl}:${quoteId}`);
        if (!quote) {
          throw new Error(`Melt quote not found: ${quoteId}`);
        }
        return quote;
      },

      addEvent: (event: CashuEventStruct) => {
        set((state) => {
          const existingIndex = state.events.findIndex(e => e.id === event.id);
          if (existingIndex >= 0) {
            state.events[existingIndex] = event;
          } else {
            state.events.push(event);
          }
        });
      },

      getTotalBalance: () => {
        const state = get();
        return state.wallets.reduce((total, wallet) => total + wallet.balance, 0);
      },

      getBalanceByMint: (mintUrl: string) => {
        const state = get();
        const wallet = state.wallets.find(w => w.mints.includes(mintUrl));
        return wallet ? wallet.balance : 0;
      },

      // Chorus compatibility methods
      getMintProofs: async (mintUrl: string) => {
        const state = get();
        const mint = state.mints.find(m => m.url === mintUrl);
        if (!mint) return [];
        
        // Get all proofs that belong to this mint's keysets
        return state.proofs.filter(proof => {
          return mint.keysets?.some(keyset => keyset.id === proof.id);
        });
      },

      privkey: undefined,
    })),
    {
      name: 'cashu-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        wallets: state.wallets,
        wallet: state.wallet,
        activeWalletId: state.activeWalletId,
        mints: state.mints,
        activeMintUrl: state.activeMintUrl,
        events: state.events,
      }),
    }
  )
);