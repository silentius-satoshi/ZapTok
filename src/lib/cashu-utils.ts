// Utility functions for Cashu operations using the official @cashu/cashu-ts library
import { Proof, getDecodedToken } from '@cashu/cashu-ts';

/**
 * Validate if a URL is a valid mint URL format
 */
export function isValidMintUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Parse a Cashu token string using the official library
 * @deprecated Use getDecodedToken from @cashu/cashu-ts directly
 */
export function parseCashuToken(tokenString: string) {
  return getDecodedToken(tokenString);
}

/**
 * Calculate the total amount of an array of proofs
 */
export function calculateProofsAmount(proofs: Proof[]): number {
  return proofs.reduce((total, proof) => total + proof.amount, 0);
}

/**
 * Serialize a Cashu token using the official library
 * @deprecated Use getEncodedToken from @cashu/cashu-ts directly
 */
export function serializeCashuToken(token: { mint: string; proofs: Proof[] }): string {
  // This function should not be used directly anymore
  // Use getEncodedToken from @cashu/cashu-ts instead
  throw new Error('Use getEncodedToken from @cashu/cashu-ts instead');
}