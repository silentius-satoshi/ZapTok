import { Buffer } from 'buffer';
import { getPublicKey } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

/**
 * Create P2PK public key from private key using secp256k1
 * This follows the Cashu P2PK specification
 * Returns the natural compressed public key (starts with '02' or '03')
 * For NIP-61 nutzaps, use deriveP2PKPubkey() which enforces '02' prefix
 */
export function createP2PKKeypairFromPrivateKey(privateKey: string): string {
  try {
    // Remove any '0x' prefix if present
    const cleanPrivkey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

    // Validate private key length (should be 64 hex characters = 32 bytes)
    if (cleanPrivkey.length !== 64) {
      throw new Error(`Invalid private key length: ${cleanPrivkey.length}, expected 64`);
    }

    // Convert to bytes and get the secp256k1 public key
    const pubkeyBytes = getPublicKey(hexToBytes(cleanPrivkey));

    // Return compressed public key with '02' or '03' prefix (33 bytes total)
    return pubkeyBytes;
  } catch (error) {
    console.error('Error creating P2PK keypair:', error);
    throw new Error('Failed to create P2PK keypair from private key');
  }
}

/**
 * Derive P2PK public key specifically for Cashu operations
 * Ensures compatibility with Cashu P2PK witness requirements
 * ENFORCES NIP-61 requirement: "Clients MUST prefix the public key they P2PK-lock with '02'"
 */
export function deriveP2PKPubkey(privateKey: string): string {
  const pubkey = createP2PKKeypairFromPrivateKey(privateKey);

  // NIP-61 COMPLIANCE: All nutzap P2PK pubkeys MUST start with '02'
  // If the natural compressed pubkey starts with '03', we need to convert it
  if (pubkey.startsWith('03')) {
    // Convert '03' prefix to '02' - this changes the y-coordinate representation
    // but represents the same point on the secp256k1 curve
    return '02' + pubkey.slice(2);
  }

  // If pubkey already starts with '02', return as-is
  if (pubkey.startsWith('02')) {
    return pubkey;
  }

  // Fallback: if somehow we get an uncompressed key or invalid format
  // Force '02' prefix (this should not happen with getPublicKey from nostr-tools)
  if (pubkey.length === 64) {
    return '02' + pubkey;
  }

  throw new Error(`Invalid public key format: ${pubkey.slice(0, 10)}... (length: ${pubkey.length})`);
}

/**
 * Validate that a private key can create witnesses for the given P2PK pubkey
 * Accounts for NIP-61 "02" prefix requirement conversion
 */
export function validateP2PKKeypair(privateKey: string, p2pkPubkey: string): boolean {
  try {
    const derivedPubkey = deriveP2PKPubkey(privateKey);
    
    // Direct match check
    const directMatch = derivedPubkey === p2pkPubkey;
    
    // Also check if the natural key (before "02" conversion) would match
    // This handles cases where p2pkPubkey might be the natural "03" key
    const naturalPubkey = createP2PKKeypairFromPrivateKey(privateKey);
    const naturalMatch = naturalPubkey === p2pkPubkey;
    
    const matches = directMatch || naturalMatch;

    return matches;
  } catch (error) {
    console.error('🔐 [P2PK Validation Error]', error);
    return false;
  }
}

/**
 * Debug version of P2PK validation with detailed console logging
 * Use this when you need to see detailed validation information
 */
export function validateP2PKKeypairWithLogging(privateKey: string, p2pkPubkey: string): boolean {
  try {
    const derivedPubkey = deriveP2PKPubkey(privateKey);
    
    // Direct match check
    const directMatch = derivedPubkey === p2pkPubkey;
    
    // Also check if the natural key (before "02" conversion) would match
    // This handles cases where p2pkPubkey might be the natural "03" key
    const naturalPubkey = createP2PKKeypairFromPrivateKey(privateKey);
    const naturalMatch = naturalPubkey === p2pkPubkey;
    
    const matches = directMatch || naturalMatch;

    console.log('🔐 [P2PK Validation - Debug Mode]', {
      privateKey: privateKey ? 'present' : 'missing',
      p2pkPubkey,
      derivedPubkey: derivedPubkey,
      naturalPubkey: naturalPubkey,
      directMatch,
      naturalMatch,
      finalResult: matches
    });

    return matches;
  } catch (error) {
    console.error('🔐 [P2PK Validation Error]', error);
    return false;
  }
}