// NWC Connection URI utilities for parsing and validating
// Based on NIP-47 specification

import { NWCConnectionURI } from './nwc-types';

/**
 * Parses a Nostr Wallet Connect URI
 * Format: nostr+walletconnect://pubkey?relay=url&secret=hex&lud16=address
 */
export function parseNWCURI(uri: string): NWCConnectionURI {
  if (!uri.startsWith('nostr+walletconnect://')) {
    throw new Error('Invalid NWC URI: must start with nostr+walletconnect://');
  }

  try {
    const url = new URL(uri);
    const walletPubkey = url.hostname;
    
    if (!walletPubkey || walletPubkey.length !== 64) {
      throw new Error('Invalid wallet pubkey in NWC URI');
    }

    if (!/^[0-9a-fA-F]{64}$/.test(walletPubkey)) {
      throw new Error('Invalid wallet pubkey format: must be 64 hex characters');
    }

    const relayParams = url.searchParams.getAll('relay');
    if (relayParams.length === 0) {
      throw new Error('NWC URI must contain at least one relay');
    }

    const secret = url.searchParams.get('secret');
    if (!secret) {
      throw new Error('NWC URI must contain a secret');
    }

    if (secret.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(secret)) {
      throw new Error('Invalid secret format: must be 64 hex characters');
    }

    const lud16 = url.searchParams.get('lud16') || undefined;

    // Validate relay URLs
    const relay = relayParams.map(r => {
      try {
        const relayUrl = new URL(r);
        if (!['ws:', 'wss:'].includes(relayUrl.protocol)) {
          throw new Error('Relay must use ws: or wss: protocol');
        }
        return r;
      } catch {
        throw new Error(`Invalid relay URL: ${r}`);
      }
    });

    return {
      walletPubkey,
      relay,
      secret,
      lud16,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('Invalid')) {
      throw err;
    }
    throw new Error('Failed to parse NWC URI: ' + (err as Error).message);
  }
}

/**
 * Generates a Nostr Wallet Connect URI
 */
export function generateNWCURI(params: NWCConnectionURI): string {
  const url = new URL(`nostr+walletconnect://${params.walletPubkey}`);
  
  params.relay.forEach(relay => {
    url.searchParams.append('relay', relay);
  });
  
  url.searchParams.set('secret', params.secret);
  
  if (params.lud16) {
    url.searchParams.set('lud16', params.lud16);
  }
  
  return url.toString();
}

/**
 * Validates if a string looks like a valid NWC URI
 */
export function isValidNWCURI(uri: string): boolean {
  try {
    parseNWCURI(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts the wallet pubkey from an NWC URI without full parsing
 */
export function extractWalletPubkey(uri: string): string | null {
  try {
    if (!uri.startsWith('nostr+walletconnect://')) {
      return null;
    }
    const url = new URL(uri);
    return url.hostname || null;
  } catch {
    return null;
  }
}
