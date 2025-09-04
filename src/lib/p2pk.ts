import * as secp256k1 from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';

// Configure secp256k1 v2.x hashing - set hmacSha256Sync for signing operations
secp256k1.etc.hmacSha256Sync = (key: Uint8Array, message: Uint8Array): Uint8Array => {
  return hmac(sha256, key, message);
};

/**
 * P2PK (Pay-to-Public-Key) utilities for Cashu
 * Used for locking ecash to specific public keys (e.g., in nutzaps)
 */

// NUT-11 compliant P2PK secret data structure
export interface P2PKSecretData {
  nonce: string;    // Random nonce for uniqueness
  data: string;     // Recipient's compressed public key (with 02 prefix)
  tags?: string[][]; // Optional tags (sigflag, etc.)
}

// Full NUT-11 P2PK secret structure: ["P2PK", P2PKSecretData]
export type P2PKSecret = ["P2PK", P2PKSecretData];

// Wallet-specific P2PK keypair (separate from secret format)
export interface P2PKKeypair {
  privateKey: string;
  pubkey: string;
}

/**
 * Generate a new P2PK keypair for wallet operations
 */
export function generateP2PKKeypair(): P2PKKeypair {
  const privateKey = secp256k1.utils.randomPrivateKey();
  const pubkey = secp256k1.getPublicKey(privateKey, true);

  return {
    privateKey: bytesToHex(privateKey),
    pubkey: bytesToHex(pubkey)
  };
}

/**
 * Create P2PK keypair from existing private key
 */
export function createP2PKKeypairFromPrivateKey(privateKeyHex: string): P2PKKeypair {
  const privateKey = hexToBytes(privateKeyHex);
  const pubkey = secp256k1.getPublicKey(privateKey, true);

  return {
    privateKey: privateKeyHex,
    pubkey: bytesToHex(pubkey)
  };
}

/**
 * Create NUT-11 compliant P2PK secret for locking ecash to a recipient
 * This generates the secret structure that locks ecash to the recipient's pubkey
 */
export function createP2PKSecret(recipientPubkey: string): [string, P2PKSecret] {
  // Generate random nonce (32 bytes hex)
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Ensure pubkey has compressed format (02 or 03 prefix)
  const data = (recipientPubkey.startsWith('02') || recipientPubkey.startsWith('03'))
    ? recipientPubkey
    : '02' + recipientPubkey;

  // Create NUT-11 compliant secret structure
  const p2pkSecretData: P2PKSecretData = {
    nonce,
    data,
    tags: [["sigflag", "SIG_INPUTS"]] // Default to SIG_INPUTS as per NUT-11
  };

  const p2pkSecret: P2PKSecret = ["P2PK", p2pkSecretData];
  const secretString = JSON.stringify(p2pkSecret);

  return [secretString, p2pkSecret];
}

/**
 * Derive public key from private key
 */
export function getPublicKeyFromPrivate(privateKeyHex: string): string {
  const privateKey = hexToBytes(privateKeyHex);
  const pubkey = secp256k1.getPublicKey(privateKey, true);
  return bytesToHex(pubkey);
}

/**
 * Sign data with P2PK private key
 */
export function signWithP2PK(data: string, privateKeyHex: string): string {
  const privateKey = hexToBytes(privateKeyHex);
  const dataBytes = new TextEncoder().encode(data);
  const signature = secp256k1.sign(sha256(dataBytes), privateKey);
  return bytesToHex(signature.toCompactRawBytes());
}

/**
 * Verify P2PK signature
 */
export function verifyP2PKSignature(
  data: string,
  signature: string,
  pubkeyHex: string
): boolean {
  try {
    const pubkey = hexToBytes(pubkeyHex);
    const sig = hexToBytes(signature);
    const dataBytes = new TextEncoder().encode(data);

    return secp256k1.verify(sig, sha256(dataBytes), pubkey);
  } catch {
    return false;
  }
}

/**
 * Create P2PK witness data for unlocking tokens
 * Returns witness in NUT-11 compliant format
 */
export function createP2PKWitness(signatures: string[]): string {
  const witness = {
    signatures
  };
  return JSON.stringify(witness);
}

/**
 * Validate P2PK pubkey format
 */
export function isValidP2PKPubkey(pubkeyHex: string): boolean {
  try {
    const pubkeyBytes = hexToBytes(pubkeyHex);
    return pubkeyBytes.length === 33 && (pubkeyBytes[0] === 0x02 || pubkeyBytes[0] === 0x03);
  } catch {
    return false;
  }
}

/**
 * Convert between compressed and uncompressed pubkey formats
 */
export function compressPublicKey(pubkeyHex: string): string {
  const pubkeyBytes = hexToBytes(pubkeyHex);

  if (pubkeyBytes.length === 33) {
    // Already compressed
    return pubkeyHex;
  } else if (pubkeyBytes.length === 65) {
    // Uncompressed, convert to compressed
    const x = pubkeyBytes.slice(1, 33);
    const y = pubkeyBytes.slice(33, 65);
    const prefix = y[31] % 2 === 0 ? 0x02 : 0x03;
    return bytesToHex(new Uint8Array([prefix, ...x]));
  } else {
    throw new Error('Invalid pubkey length');
  }
}

/**
 * Generate P2PK keypair for wallet creation
 * This creates a wallet-specific P2PK key for receiving nutzaps
 */
export function generateWalletP2PKKeypair(walletName?: string): P2PKKeypair {
  if (walletName) {
    // Derive deterministic key from wallet name
    const nameBytes = new TextEncoder().encode(walletName);
    const hash = sha256(nameBytes);
    return createP2PKKeypairFromPrivateKey(bytesToHex(hash));
  } else {
    // Generate random key
    return generateP2PKKeypair();
  }
}