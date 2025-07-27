import * as secp256k1 from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';

/**
 * P2PK (Pay-to-Public-Key) utilities for Cashu
 * Used for locking ecash to specific public keys (e.g., in nutzaps)
 */

export interface P2PKSecret {
  privateKey: string;
  pubkey: string;
}

/**
 * Generate a new P2PK keypair
 */
export function generateP2PKSecret(): P2PKSecret {
  const privateKey = secp256k1.utils.randomPrivateKey();
  const pubkey = secp256k1.getPublicKey(privateKey, true);

  return {
    privateKey: bytesToHex(privateKey),
    pubkey: bytesToHex(pubkey)
  };
}

/**
 * Create P2PK secret from existing private key
 */
export function createP2PKSecretFromPrivateKey(privateKeyHex: string): P2PKSecret {
  const privateKey = hexToBytes(privateKeyHex);
  const pubkey = secp256k1.getPublicKey(privateKey, true);

  return {
    privateKey: privateKeyHex,
    pubkey: bytesToHex(pubkey)
  };
}

/**
 * Create P2PK secret for locking to a specific recipient
 * This generates the secret that locks ecash to the recipient's pubkey
 */
export function createP2PKSecret(recipientPubkey?: string): [string, P2PKSecret] {
  if (recipientPubkey) {
    // Create a deterministic secret for this recipient
    // In practice, this would use proper key derivation
    const recipientBytes = hexToBytes(recipientPubkey);
    const hash = sha256(recipientBytes);
    const secret = bytesToHex(hash);

    return [
      secret,
      {
        privateKey: secret,
        pubkey: recipientPubkey
      }
    ];
  } else {
    // Generate a random secret
    const p2pkSecret = generateP2PKSecret();
    return [p2pkSecret.privateKey, p2pkSecret];
  }
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
 * Create P2PK witness data for unlocking
 */
export function createP2PKWitness(privateKeyHex: string, challenge?: string): string {
  const data = challenge || 'unlock';
  const signature = signWithP2PK(data, privateKeyHex);
  const pubkey = getPublicKeyFromPrivate(privateKeyHex);

  // P2PK witness format: signature + pubkey
  return JSON.stringify({
    signature,
    pubkey
  });
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
 * Generate P2PK secret for wallet creation
 * This creates a wallet-specific P2PK key for receiving nutzaps
 */
export function generateWalletP2PKSecret(walletName?: string): P2PKSecret {
  if (walletName) {
    // Derive deterministic key from wallet name
    const nameBytes = new TextEncoder().encode(walletName);
    const hash = sha256(nameBytes);
    return createP2PKSecretFromPrivateKey(bytesToHex(hash));
  } else {
    // Generate random key
    return generateP2PKSecret();
  }
}