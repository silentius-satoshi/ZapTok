import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Read-only signer that only provides public key access without signing capabilities.
 * Based on Jumble's NpubSigner pattern for non-authenticated users.
 * Allows users to browse content without requiring full authentication.
 */
export class ReadOnlySigner {
  private _pubkey: string;

  constructor(pubkey: string) {
    if (!pubkey) {
      throw new Error('Public key is required for read-only access');
    }
    this._pubkey = pubkey;
  }

  async getPublicKey(): Promise<string> {
    return this._pubkey;
  }

  async signEvent(_event: NostrEvent): Promise<NostrEvent> {
    throw new Error('Login required to post content. Please sign in to share videos and interact with the community.');
  }

  // NIP-44 encryption not available in read-only mode
  get nip44() {
    return {
      encrypt: async (_pubkey: string, _plaintext: string): Promise<string> => {
        throw new Error('Login required for encryption. Please sign in to send private messages.');
      },
      decrypt: async (_pubkey: string, _ciphertext: string): Promise<string> => {
        throw new Error('Login required for decryption. Please sign in to read private messages.');
      }
    };
  }

  // Check if this is a read-only signer
  get isReadOnly(): boolean {
    return true;
  }
}

/**
 * Hook to check if a user is in read-only mode
 */
export function useReadOnlyMode() {
  const isReadOnlyUser = (signer: any): boolean => {
    return signer instanceof ReadOnlySigner || signer?.isReadOnly === true;
  };

  const getReadOnlyCapabilities = () => ({
    canRead: true,
    canWrite: false,
    canEncrypt: false,
    canSign: false,
    requiresLogin: [
      'posting videos',
      'commenting',
      'liking content', 
      'following users',
      'customizing sharing options',
      'editing profile',
      'sending zaps'
    ]
  });

  return {
    isReadOnlyUser,
    getReadOnlyCapabilities
  };
}