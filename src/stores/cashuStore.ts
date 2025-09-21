import { MeltQuoteResponse, MintQuoteResponse, type Proof } from '@cashu/cashu-ts'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GetInfoResponse, MintKeyset, MintKeys } from '@cashu/cashu-ts'

interface ProofWithEventId extends Proof {
  eventId?: string;
}

export interface Nip60TokenEvent {
  id: string;
  token: {
    mint: string;
    proofs: Proof[];
    del?: string[];
  };
  createdAt: number;
}

export interface Mint {
  url: string;
  mintInfo?: GetInfoResponse;
  keysets?: MintKeyset[];
  keys?: Record<string, MintKeys>[];
  events?: Nip60TokenEvent[];
  mintQuotes?: Record<string, MintQuoteResponse>;
  meltQuotes?: Record<string, MeltQuoteResponse>;
}

// Legacy compatibility type
export interface CashuWalletStruct {
  id: string;
  name: string;
  balance: number;
  mintUrl: string;
  isActive?: boolean;
}

export interface CashuStore {
  // Core state
  mints: Mint[];
  proofs: ProofWithEventId[];
  privkey?: string;
  activeMintUrl?: string;
  pendingOnboardingToken?: string;
  currentUser?: string | null;

  // Legacy compatibility properties
  wallets?: CashuWalletStruct[];
  activeWalletId?: string;
  proofEventMap?: Record<string, string>;
  wallet?: any;
  isLoading?: boolean;

  // Core methods
  addMint: (url: string) => void;
  getMint: (url: string) => Mint;
  setMintInfo: (url: string, mintInfo: GetInfoResponse) => void;
  setKeysets: (url: string, keysets: MintKeyset[]) => void;
  setKeys: (url: string, keys: Record<string, MintKeys>[]) => void;
  addProofs: (proofs: Proof[], eventId: string) => void;
  removeProofs: (proofs: Proof[]) => void;
  setPrivkey: (privkey: string) => void;
  getMintProofs: (mintUrl: string) => Promise<Proof[]>;
  getProofs: (mintUrl: string) => Proof[]; // Added for legacy compatibility
  setProofEventId: (proof: Proof, eventId: string) => void;
  getProofEventId: (proof: Proof) => string | undefined;
  getProofsByEventId: (eventId: string) => Proof[];
  getMintQuotes: (mintUrl: string) => Record<string, MintQuoteResponse>;
  getMeltQuotes: (mintUrl: string) => Record<string, MeltQuoteResponse>;
  addMintQuote: (mintUrl: string, quote: MintQuoteResponse) => void;
  addMeltQuote: (mintUrl: string, quote: MeltQuoteResponse) => void;
  updateMintQuote: (mintUrl: string, quoteId: string, quote: MintQuoteResponse) => void;
  updateMeltQuote: (mintUrl: string, quoteId: string, quote: MeltQuoteResponse) => void;
  getMintQuote: (mintUrl: string, quoteId: string) => MintQuoteResponse;
  getMeltQuote: (mintUrl: string, quoteId: string) => MeltQuoteResponse;
  setActiveMintUrl: (url: string) => void;
  getActiveMintUrl: () => string | undefined;
  setPendingOnboardingToken: (token: string | undefined) => void;
  getPendingOnboardingToken: () => string | undefined;
  clearStore: () => void;
  getTotalBalance: () => number;

  // Legacy compatibility methods
  addWallet?: (wallet: CashuWalletStruct) => void;
  setActiveWallet?: (id: string) => void;
  updateProofs?: () => void;
  createWallet?: () => void;
  createHistory?: () => void;
  initializePrivkey?: () => void;
}

export const useCashuStore = create<CashuStore>()(
  persist(
    (set, get) => ({
      mints: [],
      proofs: [],
      activeMintUrl: undefined,
      pendingOnboardingToken: undefined,
      currentUser: null,

      // Legacy compatibility properties
      wallets: [],
      activeWalletId: undefined,
      proofEventMap: {},
      wallet: null,
      isLoading: false,

      addMint(url) {
        const existingMints = get().mints.map((mint) => mint.url)
        if (!existingMints.includes(url)) {
          set({ mints: [...get().mints, { url }] })
          if (get().mints.length === 0) {
            set({ activeMintUrl: url })
          }
        }
      },

      getMint(url) {
        const mint = get().mints.find((mint) => mint.url === url);
        if (!mint) {
          throw new Error('No mint found for url');
        }
        return mint;
      },

      setMintInfo(url, mintInfo) {
        set({ mints: get().mints.map((mint) => mint.url === url ? { ...mint, mintInfo } : mint) })
      },

      setKeysets(url, keysets) {
        set({ mints: get().mints.map((mint) => mint.url === url ? { ...mint, keysets } : mint) })
      },

      setKeys(url, keys) {
        set({ mints: get().mints.map((mint) => mint.url === url ? { ...mint, keys } : mint) })
      },

      addProofs(proofs, eventId) {
        const proofsWithEventId = proofs.map(p => ({ ...p, eventId }));
        set({ proofs: [...get().proofs, ...proofsWithEventId] });
      },

      removeProofs(proofs: Proof[]) {
        set({
          proofs: get().proofs.filter(p =>
            !proofs.some(removeProof =>
              p.secret === removeProof.secret && p.C === removeProof.C
            )
          )
        });
      },

      setPrivkey(privkey) {
        set({ privkey });
      },

      async getMintProofs(mintUrl: string): Promise<Proof[]> {
        const proofs = get().proofs;
        const mint = get().mints.find((m) => m.url === mintUrl);
        if (!mint || !mint.keysets) {
          return [];
        }

        const keysetIds = mint.keysets.map((k) => k.id);
        return proofs.filter((p) => keysetIds.includes(p.id || ''));
      },

      // Add getProofs method for legacy compatibility
      getProofs(mintUrl: string): Proof[] {
        const proofs = get().proofs;
        const mint = get().mints.find((m) => m.url === mintUrl);
        if (!mint || !mint.keysets) {
          return [];
        }

        const keysetIds = mint.keysets.map((k) => k.id);
        return proofs.filter((p) => keysetIds.includes(p.id || ''));
      },

      setProofEventId(proof, eventId) {
        set({
          proofs: get().proofs.map(p =>
            p.secret === proof.secret && p.C === proof.C
              ? { ...p, eventId }
              : p
          )
        });
      },

      getProofEventId(proof) {
        const foundProof = get().proofs.find(p =>
          p.secret === proof.secret && p.C === proof.C
        );
        return foundProof?.eventId;
      },

      getProofsByEventId(eventId: string) {
        return get().proofs.filter(p => p.eventId === eventId);
      },

      getMintQuotes(mintUrl: string) {
        const mint = get().mints.find((m) => m.url === mintUrl);
        return mint?.mintQuotes || {};
      },

      getMeltQuotes(mintUrl: string) {
        const mint = get().mints.find((m) => m.url === mintUrl);
        return mint?.meltQuotes || {};
      },

      addMintQuote(mintUrl: string, quote: MintQuoteResponse) {
        set({
          mints: get().mints.map((mint) =>
            mint.url === mintUrl
              ? {
                  ...mint,
                  mintQuotes: { ...(mint.mintQuotes || {}), [quote.quote]: quote }
                }
              : mint
          )
        });
      },

      addMeltQuote(mintUrl: string, quote: MeltQuoteResponse) {
        set({
          mints: get().mints.map((mint) =>
            mint.url === mintUrl
              ? {
                  ...mint,
                  meltQuotes: { ...(mint.meltQuotes || {}), [quote.quote]: quote }
                }
              : mint
          )
        });
      },

      updateMintQuote(mintUrl: string, quoteId: string, quote: MintQuoteResponse) {
        set({
          mints: get().mints.map((mint) =>
            mint.url === mintUrl
              ? {
                  ...mint,
                  mintQuotes: { ...(mint.mintQuotes || {}), [quoteId]: quote }
                }
              : mint
          )
        });
      },

      updateMeltQuote(mintUrl: string, quoteId: string, quote: MeltQuoteResponse) {
        set({
          mints: get().mints.map((mint) =>
            mint.url === mintUrl
              ? {
                  ...mint,
                  meltQuotes: { ...(mint.meltQuotes || {}), [quoteId]: quote }
                }
              : mint
          )
        });
      },

      getMintQuote(mintUrl: string, quoteId: string) {
        const mint = get().mints.find((m) => m.url === mintUrl);
        const quote = mint?.mintQuotes?.[quoteId];
        if (!quote) {
          throw new Error('Quote not found');
        }
        return quote;
      },

      getMeltQuote(mintUrl: string, quoteId: string) {
        const mint = get().mints.find((m) => m.url === mintUrl);
        const quote = mint?.meltQuotes?.[quoteId];
        if (!quote) {
          throw new Error('Quote not found');
        }
        return quote;
      },

      setActiveMintUrl(url: string) {
        set({ activeMintUrl: url });
      },

      getActiveMintUrl() {
        return get().activeMintUrl;
      },

      setPendingOnboardingToken(token: string | undefined) {
        set({ pendingOnboardingToken: token });
      },

      getPendingOnboardingToken() {
        return get().pendingOnboardingToken;
      },

      clearStore() {
        set({
          mints: [],
          proofs: [],
          privkey: undefined,
          activeMintUrl: undefined,
          pendingOnboardingToken: undefined,
          wallets: [],
          activeWalletId: undefined,
          proofEventMap: {},
          wallet: null
        });
      },

      getTotalBalance() {
        return get().proofs.reduce((sum, proof) => sum + proof.amount, 0);
      },

      // Legacy compatibility methods - stubbed
      addWallet: (wallet: CashuWalletStruct) => {
        // Legacy compatibility - do nothing
      },

      setActiveWallet: (id: string) => {
        set({ activeWalletId: id });
      },

      updateProofs: () => {
        // Legacy compatibility - do nothing
      },

      createWallet: () => {
        // Legacy compatibility - do nothing
      },

      createHistory: () => {
        // Legacy compatibility - do nothing
      },

      initializePrivkey: () => {
        // Legacy compatibility - do nothing
      }
    }),
    { name: 'cashu' },
  ),
)