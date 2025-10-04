/// <reference types="vite/client" />

import { WebLNProvider } from '@/lib/wallet-types';

// Nostr browser extension interface (NIP-07)
interface NostrExtension {
  getPublicKey(): Promise<string>;
  signEvent(event: any): Promise<any>;
  getRelays?: () => Promise<Record<string, { read: boolean; write: boolean }>>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

declare global {
  interface Window {
    webln?: WebLNProvider;
    nostr?: NostrExtension;
  }

  const __GIT_COMMIT__: string;
  const __APP_VERSION__: string;
}
