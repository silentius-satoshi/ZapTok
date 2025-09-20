import { type Proof, CashuMint, CashuWallet, MintKeys, getEncodedToken, getDecodedToken, type Token } from '@cashu/cashu-ts';

export interface CashuToken {
  mint: string;
  proofs: Proof[];
}

// Legacy type for compatibility
export interface SpendingHistoryEntry {
  direction: 'in' | 'out';
  amount: string;
  createdTokens?: string[];
  destroyedTokens?: string[];
  redeemedTokens?: string[];
  timestamp?: number;
}

// Calculate total balance from proofs
export function calculateBalance(proofs: Proof[]): number {
  return proofs.reduce((sum, proof) => sum + proof.amount, 0);
}

// Format balance for display
export function formatBalance(sats: number): string {
  if (sats >= 100000000) {
    return `${(sats / 100000000).toFixed(2)} BTC`;
  }
  if (sats >= 1000) {
    return `${(sats / 1000).toFixed(1)}k sats`;
  }
  return `${sats} sats`;
}

// Activate mint and fetch info
export async function activateMint(mintUrl: string) {
  const mint = new CashuMint(mintUrl);
  const info = await mint.getInfo();
  return { mint, info };
}

// Update mint keys
export async function updateMintKeys(mint: CashuMint): Promise<Record<string, any>[]> {
  const keysets = await mint.getKeySets();
  const allKeys: Record<string, any>[] = [];

  for (const keyset of keysets.keysets) {
    const keys = await mint.getKeys(keyset.id);
    allKeys.push({ [keyset.id]: keys });
  }

  return allKeys;
}

// Encode Cashu token to string
export function encodeCashuToken(token: CashuToken): string {
  return getEncodedToken({
    proofs: token.proofs,
    mint: token.mint
  });
}

// Decode Cashu token from string
export function decodeCashuToken(encodedToken: string): CashuToken {
  const decoded = getDecodedToken(encodedToken);
  if (!decoded.proofs || decoded.proofs.length === 0) {
    throw new Error('Invalid token format');
  }

  return {
    mint: decoded.mint,
    proofs: decoded.proofs
  };
}