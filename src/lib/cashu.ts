// Types and utilities for Cashu wallet (NIP-60)

import { useCashuStore } from "@/stores/cashuStore";
import { CashuMint, Proof, CashuWallet, GetInfoResponse, MintKeyset, MintKeys, getDecodedToken } from "@cashu/cashu-ts";

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
  token?: Array<{
    mint: string;
    proofs: CashuProof[];
  }>;
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
}

// Event kinds as defined in NIP-60
export const CASHU_EVENT_KINDS = {
  WALLET: 37375,
  TOKEN: 7375,
  HISTORY: 7376,
  QUOTE: 7377,
  ZAPINFO: 9735,
  ZAP: 9734,
  TRANSACTION: 37376,
  NUTZAP: 7378,
} as const;

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
    
    // Ensure keysets is an array and is iterable
    if (!keysets || !Array.isArray(keysets)) continue;
    
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

// Helper function to add thousands separator to a number
function addThousandsSeparator(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper function to format balance with appropriate units
export function formatBalance(sats: number): string {
  if (sats >= 1000000) {
    // 1M+ sats - show as millions with 1 decimal
    const millions = (sats / 1000000).toFixed(1);
    return `${millions}M sats`;
  } else if (sats >= 100000) {
    // 100K+ sats - show as thousands with no decimals
    const thousands = Math.floor(sats / 1000);
    return `${addThousandsSeparator(thousands)}K sats`;
  } else {
    // Less than 100K - show full number
    return `${addThousandsSeparator(sats)} sats`;
  }
}

export function getTokenAmount(token: string): number {
  const tokenObj = getDecodedToken(token);
  return tokenObj.proofs.reduce((acc, proof) => acc + proof.amount, 0);
}

export function getTokenProofs(token: string): CashuProof[] {
  const tokenObj = getDecodedToken(token);
  return tokenObj.proofs;
}

export function isValidCashuToken(tokenString: string): boolean {
  try {
    getDecodedToken(tokenString);
    return true;
  } catch {
    return false;
  }
}

export async function activateMint(url: string): Promise<{ mintInfo: any, keysets: any }> {
  try {
    const mint = new CashuMint(url);
    
    // Get mint info and keysets
    const [mintInfo, keysets] = await Promise.all([
      mint.getInfo(),
      mint.getKeys()
    ]);
    
    return { mintInfo, keysets };
  } catch (error) {
    console.error('Failed to activate mint:', error);
    throw new Error(`Failed to activate mint: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateMintKeys(wallet: CashuWallet): Promise<void> {
  try {
    const keys = await wallet.mint.getKeys();
    // Keys are automatically stored in the wallet
  } catch (error) {
    console.error('Failed to update mint keys:', error);
    throw error;
  }
}
