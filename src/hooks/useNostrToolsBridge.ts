import { BunkerSigner } from 'nostr-tools/nip46';
import { SimplePool } from 'nostr-tools/pool';
import { hexToBytes } from '@noble/hashes/utils';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Bridge class that makes nostr-tools BunkerSigner compatible with Nostrify's signer interface
 * This allows us to use nostr-tools bunker implementation while maintaining compatibility
 * with the existing Nostrify-based authentication system
 */
export class NostrToolsSigner {
  private bunkerSigner: BunkerSigner;
  private pool: SimplePool;
  private _pubkey: string;

  constructor(bunkerSigner: BunkerSigner, userPubkey: string) {
    this.bunkerSigner = bunkerSigner;
    this._pubkey = userPubkey;
    this.pool = new SimplePool();
  }

  get pubkey(): string {
    return this._pubkey;
  }

  async signEvent(event: NostrEvent): Promise<NostrEvent> {
    try {
      const signedEvent = await this.bunkerSigner.signEvent(event);
      return signedEvent as NostrEvent;
    } catch (error) {
      console.error('Failed to sign event with bunker:', error);
      throw error;
    }
  }

  async nip04Encrypt(pubkey: string, plaintext: string): Promise<string> {
    try {
      return await this.bunkerSigner.nip04Encrypt(pubkey, plaintext);
    } catch (error) {
      console.error('Failed to encrypt with nip04:', error);
      throw error;
    }
  }

  async nip04Decrypt(pubkey: string, ciphertext: string): Promise<string> {
    try {
      return await this.bunkerSigner.nip04Decrypt(pubkey, ciphertext);
    } catch (error) {
      console.error('Failed to decrypt with nip04:', error);
      throw error;
    }
  }

  async nip44Encrypt(pubkey: string, plaintext: string): Promise<string> {
    try {
      return await this.bunkerSigner.nip44Encrypt(pubkey, plaintext);
    } catch (error) {
      console.error('Failed to encrypt with nip44:', error);
      throw error;
    }
  }

  async nip44Decrypt(pubkey: string, ciphertext: string): Promise<string> {
    try {
      return await this.bunkerSigner.nip44Decrypt(pubkey, ciphertext);
    } catch (error) {
      console.error('Failed to decrypt with nip44:', error);
      throw error;
    }
  }

  // Cleanup method
  async close(): Promise<void> {
    try {
      await this.bunkerSigner.close();
      this.pool.close([]);
    } catch (error) {
      console.error('Error closing bunker signer:', error);
    }
  }

  // Method to check if signer is still connected
  async ping(): Promise<boolean> {
    try {
      await this.bunkerSigner.ping();
      return true;
    } catch (error) {
      console.error('Bunker ping failed:', error);
      return false;
    }
  }
}

/**
 * Creates a Nostrify-compatible login object from nostr-tools bunker data
 */
export function createNostrifyBunkerLogin(
  userPubkey: string,
  bunkerSigner: BunkerSigner,
  bunkerData: any
) {
  // Create a bridge signer that implements Nostrify's signer interface
  const bridgeSigner = new NostrToolsSigner(bunkerSigner, userPubkey);

  // Reconstruct the original bunker URL that Nostrify expects
  // Use the original URI if stored, otherwise reconstruct from components
  const bunkerUrl = bunkerData.originalBunkerUri || 
    `bunker://${bunkerData.bunkerPubkey}?relay=${encodeURIComponent(bunkerData.relays[0])}&secret=${bunkerData.secret}`;

  // Create a login object that mimics Nostrify's NLogin structure
  const login = {
    id: `bunker-${userPubkey}`, // Unique identifier for this login
    type: 'x-bunker-nostr-tools' as const, // Add type field required by NLoginType
    pubkey: userPubkey,
    signer: bridgeSigner,
    method: 'bunker' as const,
    createdAt: new Date().toISOString(), // Add createdAt field as string required by NLoginType
    data: { // Add data field required by NLoginType
      bunkerUrl: bunkerUrl, // This is what Nostrify expects for bech32 decoding
      bunkerPubkey: bunkerData.bunkerPubkey,
      relays: bunkerData.relays,
      localPubkey: bunkerData.localPubkey,
      secret: bunkerData.secret,
    },
    metadata: {
      bunkerPubkey: bunkerData.bunkerPubkey,
      relays: bunkerData.relays,
      localPubkey: bunkerData.localPubkey,
      createdAt: Date.now(),
    },

    // Methods that Nostrify's login system expects
    async getPublicKey(): Promise<string> {
      return userPubkey;
    },

    async getSigner() {
      return bridgeSigner;
    },

    // Cleanup method
    async destroy() {
      await bridgeSigner.close();
    }
  };

  return login;
}

/**
 * Restores a bunker login from stored data
 */
export async function restoreNostrifyBunkerLogin(userPubkey: string) {
  try {
    const storageKey = `bunker-${userPubkey}`;
    const storedData = localStorage.getItem(storageKey);

    if (!storedData) {
      return null;
    }

    const bunkerData = JSON.parse(storedData);

    // Reconstruct bunker pointer
    const bunkerPointer = {
      pubkey: bunkerData.bunkerPubkey,
      relays: bunkerData.relays,
      secret: bunkerData.secret,
    };

    // Reconstruct local secret key
    const localSecretKey = hexToBytes(bunkerData.localSecretHex);

    // Create new bunker signer
    const pool = new SimplePool();
    const bunkerSigner = new BunkerSigner(localSecretKey, bunkerPointer, { pool });

    // Attempt to reconnect
    await bunkerSigner.connect();

    // Create Nostrify-compatible login
    const login = createNostrifyBunkerLogin(userPubkey, bunkerSigner, bunkerData);

    return login;
  } catch (error) {
    console.error('Failed to restore bunker login:', error);
    return null;
  }
}