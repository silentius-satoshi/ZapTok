// Nostr tools and utilities
import { nip04, nip05, nip19, nip44, nip47, nip57, utils } from 'nostr-tools';
import { getPublicKey, verifyEvent, finalizeEvent } from 'nostr-tools';

export interface Relay {
  url: string;
  read?: boolean;
  write?: boolean;
}

export {
  nip04,
  nip05,
  nip19,
  nip44,
  nip47,
  nip57,
  utils,
  getPublicKey,
  verifyEvent,
  finalizeEvent,
};

// Relay factory (simplified)
export class RelayFactory {
  constructor(public url: string) {}
}