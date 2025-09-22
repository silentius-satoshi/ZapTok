import { type Proof, CashuMint, CashuWallet, MintKeys, getEncodedToken, getDecodedToken, type Token, GetInfoResponse, MintKeyset } from '@cashu/cashu-ts';
import { useCashuStore } from "@/stores/cashuStore";

export interface CashuProof {
  id: string;
  amount: number;
  secret: string;
  C: string;
}

export interface CashuToken {
  mint: string;
  proofs: CashuProof[];
  del?: string[]; // token-ids that were destroyed by the creation of this token
}

export interface CashuWalletStruct {
  privkey: string; // Private key used to unlock P2PK ecash
  mints: string[]; // List of mint URLs
}

export interface SpendingHistoryEntry {
  direction: 'in' | 'out';
  amount: string;
  createdTokens?: string[];
  destroyedTokens?: string[];
  redeemedTokens?: string[];
  timestamp?: number;
  // Social features
  userId?: string;
  recipientPubkey?: string;
  isNutzap?: boolean;
  publicNote?: string;
}

// Event kinds as defined in NIP-60
export const CASHU_EVENT_KINDS = {
  WALLET: 17375, // Replaceable event for wallet info
  TOKEN: 7375,   // Token events for unspent proofs
  HISTORY: 7376, // Spending history events
  QUOTE: 7374,   // Quote events (optional)
  ZAPINFO: 10019, // ZAP info events
  ZAP: 9321,     // ZAP events
};

export const defaultMints = [
  "https://mint.chorus.community",
  // "https://testnut.cashu.space",
];

// Helper function to calculate total balance from tokens
export function calculateBalance(proofs: Proof[]): Record<string, number> {
  const balances: { [mint: string]: number } = {};
  const mints = useCashuStore.getState().mints;
  for (const mint of mints) {
    balances[mint.url] = 0;
    const keysets = mint.keysets;
    if (!keysets) continue;
    for (const keyset of keysets) {
      // select all proofs with id == keyset.id
      const proofsForKeyset = proofs.filter((proof) => proof.id === keyset.id);
      if (proofsForKeyset.length) {
        balances[mint.url] += proofsForKeyset.reduce((acc, proof) => acc + proof.amount, 0);
      }
    }
  }
  return balances;
}

// Helper function to calculate total balance across all mints
export function getTotalBalance(proofs: Proof[]): number {
  return proofs.reduce((sum, proof) => sum + proof.amount, 0);
}

// Helper function to add thousands separator to a number
function addThousandsSeparator(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper function to format balance with appropriate units
export function formatBalance(sats: number): string {
  if (sats >= 1000000) {
    return `${(sats / 1000000).toFixed(1)}M sats`;
  } else if (sats >= 100000) {
    return `${(sats / 1000).toFixed(1)}k sats`;
  } else {
    return `${addThousandsSeparator(sats)} sats`;
  }
}

export async function activateMint(mintUrl: string): Promise<{ mintInfo: GetInfoResponse, keysets: MintKeyset[] }> {
  const mint = new CashuMint(mintUrl);
  const wallet = new CashuWallet(mint);
  const mintInfo = await wallet.getMintInfo();
  const keysets = await wallet.getKeySets();
  return { mintInfo, keysets };
}

export async function updateMintKeys(mintUrl: string, keysets: MintKeyset[]): Promise<{ keys: Record<string, MintKeys>[] }> {
  const mint = new CashuMint(mintUrl);
  const wallet = new CashuWallet(mint);
  const keys: Record<string, MintKeys>[] = [];

  for (const keyset of keysets) {
    const keysetKeys = await wallet.getKeys(keyset.id);
    keys.push({ [keyset.id]: keysetKeys });
  }

  return { keys };
}

export function getTokenAmount(token: string): number {
  const tokenObj = getDecodedToken(token);
  return tokenObj.proofs.reduce((acc, proof) => acc + proof.amount, 0);
}

