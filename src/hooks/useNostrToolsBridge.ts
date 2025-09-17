import { BunkerSigner } from 'nostr-tools/nip46';
import { SimplePool } from 'nostr-tools/pool';
import { hexToBytes } from '@noble/hashes/utils';
import type { NostrEvent } from '@nostrify/nostrify';
import { debugLog } from '@/lib/debug';

/**
 * Bridge class that makes nostr-tools BunkerSigner compatible with Nostrify's signer interface
 * This allows us to use nostr-tools bunker implementation while maintaining compatibility
 * with the existing Nostrify-based authentication system.
 * 
 * Inspired by Jumble's implementation: https://github.com/CodyTseng/jumble
 */
export class NostrToolsSigner {
  private bunkerSigner: BunkerSigner;
  private pool: SimplePool;
  private _pubkey: string;
  private _isReady: boolean = false;
  private _clientSecretKey: string | null = null;

  constructor(bunkerSigner: BunkerSigner, userPubkey: string, clientSecretKey?: string) {
    this.bunkerSigner = bunkerSigner;
    this._pubkey = userPubkey;
    this._clientSecretKey = clientSecretKey || null;
    
    // Use existing pool from bunker signer if available, otherwise create new one
    // This preserves connections like Jumble does
    this.pool = (bunkerSigner as any).pool || new SimplePool();

    debugLog.bunker('🏗️ NostrToolsSigner constructor:', {
      userPubkey: userPubkey?.substring(0, 16) + '...',
      hasBunkerSigner: !!bunkerSigner,
      bunkerSignerType: bunkerSigner?.constructor?.name,
      hasPool: !!this.pool,
      hasClientSecret: !!clientSecretKey
    });

    // Check if bunker is ready
    this.checkReadiness();
  }

  private async checkReadiness() {
    try {
      // Try to verify the bunker signer has required methods
      if (this.bunkerSigner && typeof this.bunkerSigner.signEvent === 'function') {
        this._isReady = true;
        debugLog.bunker('✅ Bunker signer is ready');
        
        // Test NIP-44 method availability like Jumble does
        const hasNip44Encrypt = typeof this.bunkerSigner.nip44Encrypt === 'function';
        const hasNip44Decrypt = typeof this.bunkerSigner.nip44Decrypt === 'function';
        
        debugLog.bunker('🔐 NIP-44 method availability:', {
          nip44Encrypt: hasNip44Encrypt,
          nip44Decrypt: hasNip44Decrypt
        });
        
        if (!hasNip44Encrypt || !hasNip44Decrypt) {
          debugLog.bunker('⚠️ NIP-44 methods not available on bunker signer');
        }
      } else {
        debugLog.bunker('⚠️ Bunker signer not ready, methods available:',
          this.bunkerSigner ? Object.getOwnPropertyNames(this.bunkerSigner).concat(
            Object.getOwnPropertyNames(Object.getPrototypeOf(this.bunkerSigner))
          ).filter(name => typeof this.bunkerSigner[name] === 'function') : []
        );
      }
    } catch (error) {
      debugLog.bunker('Error checking bunker readiness:', error);
    }
  }

  // Get client secret key (like Jumble does for restoration)
  getClientSecretKey(): string | null {
    return this._clientSecretKey;
  }

  // Public method to force readiness check
  async forceReadinessCheck(): Promise<void> {
    await this.checkReadiness();
  }

  get pubkey(): string {
    return this._pubkey;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  async signEvent(event: NostrEvent): Promise<NostrEvent> {
    try {
      debugLog.bunkerVerbose('🔧 NostrToolsSigner.signEvent called:', {
        isReady: this._isReady,
        hasBunkerSigner: !!this.bunkerSigner,
        bunkerSignerType: this.bunkerSigner?.constructor?.name,
        hasSignEvent: !!this.bunkerSigner?.signEvent,
        signEventType: typeof this.bunkerSigner?.signEvent
      });

      if (!this._isReady) {
        debugLog.bunker('🔄 Bunker signer not ready, rechecking...');
        await this.checkReadiness();
      }

      // Check if signEvent method is available (could be on prototype)
      const hasSignEvent = this.bunkerSigner && 
        (typeof this.bunkerSigner.signEvent === 'function' || 
         typeof Object.getPrototypeOf(this.bunkerSigner)?.signEvent === 'function');
      
      if (!hasSignEvent) {
        debugLog.bunker('❌ Bunker signer missing signEvent method:', {
          bunkerSignerExists: !!this.bunkerSigner,
          directSignEvent: typeof this.bunkerSigner?.signEvent,
          prototypeSignEvent: typeof Object.getPrototypeOf(this.bunkerSigner)?.signEvent,
          availableMethods: this.bunkerSigner ? Object.getOwnPropertyNames(this.bunkerSigner).concat(
            Object.getOwnPropertyNames(Object.getPrototypeOf(this.bunkerSigner))
          ).filter(name => typeof this.bunkerSigner[name] === 'function') : []
        });
        throw new Error('Bunker signer does not have signEvent method');
      }

      const signedEvent = await this.bunkerSigner.signEvent(event);
      debugLog.bunker('✅ Successfully signed event with bunker');
      return signedEvent as NostrEvent;
    } catch (error) {
      debugLog.bunker('❌ Failed to sign event with bunker:', error);
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
      debugLog.bunker('🔐 NostrToolsSigner.nip44Encrypt called:', {
        targetPubkey: pubkey?.substring(0, 16) + '...',
        plaintextLength: plaintext?.length
      });

      if (!this.bunkerSigner) {
        throw new Error('Bunker signer not available');
      }

      // Check if nip44Encrypt method is available directly (like Jumble)
      if (typeof this.bunkerSigner.nip44Encrypt === 'function') {
        debugLog.bunker('📡 Using direct bunker nip44Encrypt');
        const result = await this.bunkerSigner.nip44Encrypt(pubkey, plaintext);
        debugLog.bunker('✅ Direct nip44Encrypt successful');
        return result;
      }

      // Fallback: check if bunker signer has sendRequest method (Jumble pattern)
      if (typeof (this.bunkerSigner as any).sendRequest === 'function') {
        debugLog.bunker('📡 Using sendRequest for nip44_encrypt');
        const result = await (this.bunkerSigner as any).sendRequest('nip44_encrypt', [pubkey, plaintext]);
        debugLog.bunker('✅ sendRequest nip44_encrypt successful');
        return result;
      }

      throw new Error('NIP-44 encryption not supported by this bunker signer');
    } catch (error) {
      debugLog.bunker('❌ Failed to encrypt with nip44:', error);
      throw error;
    }
  }

  async nip44Decrypt(pubkey: string, ciphertext: string): Promise<string> {
    try {
      debugLog.bunker('🔓 NostrToolsSigner.nip44Decrypt called:', {
        targetPubkey: pubkey?.substring(0, 16) + '...',
        ciphertextLength: ciphertext?.length
      });

      if (!this.bunkerSigner) {
        throw new Error('Bunker signer not available');
      }

      // Check if nip44Decrypt method is available directly (like Jumble)
      if (typeof this.bunkerSigner.nip44Decrypt === 'function') {
        debugLog.bunker('📡 Using direct bunker nip44Decrypt');
        const result = await this.bunkerSigner.nip44Decrypt(pubkey, ciphertext);
        debugLog.bunker('✅ Direct nip44Decrypt successful');
        return result;
      }

      // Fallback: check if bunker signer has sendRequest method (Jumble pattern)
      if (typeof (this.bunkerSigner as any).sendRequest === 'function') {
        debugLog.bunker('📡 Using sendRequest for nip44_decrypt');
        const result = await (this.bunkerSigner as any).sendRequest('nip44_decrypt', [pubkey, ciphertext]);
        debugLog.bunker('✅ sendRequest nip44_decrypt successful');
        return result;
      }

      throw new Error('NIP-44 decryption not supported by this bunker signer');
    } catch (error) {
      debugLog.bunker('❌ Failed to decrypt with nip44:', error);
      throw error;
    }
  }

  // Add nip44 property for compatibility with existing code patterns
  get nip44() {
    return {
      encrypt: this.nip44Encrypt.bind(this),
      decrypt: this.nip44Decrypt.bind(this)
    };
  }

  // Cleanup method (enhanced like Jumble)
  async close(): Promise<void> {
    try {
      debugLog.bunker('🔒 Closing NostrToolsSigner connections');
      
      if (this.bunkerSigner && typeof this.bunkerSigner.close === 'function') {
        await this.bunkerSigner.close();
      }
      
      if (this.pool && typeof this.pool.close === 'function') {
        this.pool.close([]);
      }
      
      this._isReady = false;
      debugLog.bunker('✅ NostrToolsSigner closed successfully');
    } catch (error) {
      debugLog.bunker('❌ Error closing bunker signer:', error);
    }
  }

  // Method to check if signer is still connected (enhanced like Jumble)
  async ping(): Promise<boolean> {
    try {
      debugLog.bunker('🏓 Pinging bunker signer');
      
      if (!this.bunkerSigner) {
        debugLog.bunker('❌ No bunker signer available for ping');
        return false;
      }
      
      if (typeof this.bunkerSigner.ping === 'function') {
        await this.bunkerSigner.ping();
        debugLog.bunker('✅ Bunker ping successful');
        return true;
      }
      
      // Fallback: try to get public key as a connectivity test
      if (typeof this.bunkerSigner.getPublicKey === 'function') {
        const pubkey = await this.bunkerSigner.getPublicKey();
        const isConnected = pubkey === this._pubkey;
        debugLog.bunker(isConnected ? '✅ Bunker connectivity confirmed via getPublicKey' : '❌ Bunker pubkey mismatch');
        return isConnected;
      }
      
      debugLog.bunker('⚠️ No ping or getPublicKey method available');
      return false;
    } catch (error) {
      debugLog.bunker('❌ Bunker ping failed:', error);
      return false;
    }
  }

  // Check if bunker signer is connected (Jumble-style)
  get connected(): boolean {
    return this._isReady && !!this.bunkerSigner;
  }
}

/**
 * Creates a Nostrify-compatible login object from nostr-tools bunker data
 * Enhanced with Jumble-inspired patterns for better reliability
 */
export function createNostrifyBunkerLogin(
  userPubkey: string,
  bunkerSigner: BunkerSigner,
  bunkerData: any,
  clientSecretKey?: string
) {
  debugLog.bunker('🏗️ Creating Nostrify bunker login:', {
    userPubkey: userPubkey?.substring(0, 16) + '...',
    hasBunkerSigner: !!bunkerSigner,
    hasClientSecret: !!clientSecretKey,
    bunkerDataKeys: Object.keys(bunkerData || {})
  });

  // Create a bridge signer that implements Nostrify's signer interface
  const bridgeSigner = new NostrToolsSigner(bunkerSigner, userPubkey, clientSecretKey);

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
      clientSecretKey: clientSecretKey, // Store for restoration like Jumble
    },
    metadata: {
      bunkerPubkey: bunkerData.bunkerPubkey,
      relays: bunkerData.relays,
      localPubkey: bunkerData.localPubkey,
      clientSecretKey: clientSecretKey, // Store in metadata too
      createdAt: Date.now(),
    },

    // Methods that Nostrify's login system expects
    async getPublicKey(): Promise<string> {
      return userPubkey;
    },

    async getSigner() {
      return bridgeSigner;
    },

    // Enhanced cleanup method (Jumble-style)
    async destroy() {
      debugLog.bunker('🧹 Destroying bunker login');
      await bridgeSigner.close();
    }
  };

  debugLog.bunker('✅ Nostrify bunker login created successfully');
  return login;
}

/**
 * Restores a bunker login from stored data (enhanced like Jumble)
 */
export async function restoreNostrifyBunkerLogin(userPubkey: string): Promise<any | null> {
  debugLog.bunker('🔄 Attempting to restore bunker login for:', userPubkey?.substring(0, 16) + '...');
  
  try {
    const storageKey = `bunker-${userPubkey}`;
    const storedData = localStorage.getItem(storageKey);

    if (!storedData) {
      debugLog.bunker('❌ No stored bunker data found for key:', storageKey);
      return null;
    }

    const bunkerData = JSON.parse(storedData);
    debugLog.bunker('📦 Found stored bunker data:', {
      hasBunkerPubkey: !!bunkerData.bunkerPubkey,
      hasRelays: !!bunkerData.relays,
      hasSecret: !!bunkerData.secret,
      hasLocalSecretHex: !!bunkerData.localSecretHex,
      hasClientSecret: !!bunkerData.clientSecretKey
    });

    // Reconstruct bunker pointer
    const bunkerPointer = {
      pubkey: bunkerData.bunkerPubkey,
      relays: bunkerData.relays,
      secret: bunkerData.secret,
    };

    // Reconstruct local secret key (use client secret if available, like Jumble)
    let localSecretKey: Uint8Array;
    if (bunkerData.clientSecretKey) {
      debugLog.bunker('🔑 Using stored client secret key for restoration');
      localSecretKey = hexToBytes(bunkerData.clientSecretKey);
    } else if (bunkerData.localSecretHex) {
      debugLog.bunker('🔑 Using legacy local secret hex for restoration');
      localSecretKey = hexToBytes(bunkerData.localSecretHex);
    } else {
      debugLog.bunker('❌ No secret key found for restoration');
      return null;
    }

    // Create new bunker signer with connection management like Jumble
    const pool = new SimplePool();
    const bunkerSigner = new BunkerSigner(localSecretKey, bunkerPointer, { 
      pool,
      onauth: (url: string) => {
        debugLog.bunker('🔗 Bunker auth URL received during restoration:', url);
        // Don't auto-open during restoration, just log
      }
    });

    debugLog.bunker('📡 Attempting to connect restored bunker signer...');
    
    // Set a reasonable timeout for connection like Jumble does (reduced for faster restoration)
    const connectPromise = bunkerSigner.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000); // 5 second timeout for faster restoration
    });

    try {
      await Promise.race([connectPromise, timeoutPromise]);
      debugLog.bunker('✅ Bunker signer connected successfully');
    } catch (error) {
      debugLog.bunker('⚠️ Bunker connection failed during restoration, but continuing:', error);
      // Continue anyway - many bunkers work without explicit connection during restoration
    }

    // Verify the connection by checking public key (with timeout)
    try {
      debugLog.bunker('🔍 Verifying public key for restoration...');
      const pubkeyPromise = bunkerSigner.getPublicKey();
      const pubkeyTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Public key verification timeout')), 3000); // 3 second timeout
      });
      
      const retrievedPubkey = await Promise.race([pubkeyPromise, pubkeyTimeout]);
      
      if (retrievedPubkey !== userPubkey) {
        debugLog.bunker('❌ Public key mismatch during restoration:', {
          expected: userPubkey?.substring(0, 16) + '...',
          received: retrievedPubkey?.substring(0, 16) + '...'
        });
        throw new Error('Public key mismatch - invalid restoration');
      }
      debugLog.bunker('✅ Public key verified during restoration');
    } catch (error) {
      debugLog.bunker('⚠️ Could not verify public key during restoration (continuing anyway):', error);
      // Continue anyway for bunker implementations that have verification issues
    }

    // Create Nostrify-compatible login with client secret (enhanced for immediate restoration)
    const login = createNostrifyBunkerLogin(
      userPubkey, 
      bunkerSigner, 
      bunkerData, 
      bunkerData.clientSecretKey || bunkerData.localSecretHex
    );

    // Update the last used timestamp
    const updatedBunkerData = {
      ...bunkerData,
      lastUsed: Date.now()
    };
    localStorage.setItem(`bunker-${userPubkey}`, JSON.stringify(updatedBunkerData));

    debugLog.bunker('✅ Bunker login restored successfully');
    return login;
  } catch (error) {
    debugLog.bunker('❌ Failed to restore bunker login:', error);
    return null;
  }
}