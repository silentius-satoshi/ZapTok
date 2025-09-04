// NIP-61 Nutzaps Type Definitions
// Extends NIP-60 implementation with nutzap functionality

import type { NostrEvent } from '@nostrify/nostrify';

/**
 * NIP-61 Nutzap informational event (kind 10019)
 * Published by users to indicate how others can send nutzaps to them
 */
export interface NutzapInfoEvent extends NostrEvent {
  kind: 10019;
  content: '';
  tags: string[][]; // Use standard string[][] format
}

/**
 * NIP-61 Nutzap event (kind 9321)
 * Contains P2PK-locked Cashu proofs sent as a nutzap
 */
export interface NutzapEvent extends NostrEvent {
  kind: 9321;
  content: string; // Optional comment
  tags: string[][]; // Use standard string[][] format
}

/**
 * Cashu proof with P2PK lock for nutzaps
 */
export interface P2PKProof {
  amount: number;
  id: string;
  secret: string; // NUT-11 P2PK secret: ["P2PK", {"nonce": "...", "data": "02...", "tags": [...]}]
  C: string;
  witness?: string; // P2PKWitness for spending: {"signatures": ["..."]}
}

/**
 * P2PK secret structure for Cashu proofs
 */
export interface P2PKSecret {
  nonce: string;   // Random nonce
  data: string;    // 02-prefixed recipient public key
}

/**
 * Nutzap redemption record (extends NIP-60 kind 7376)
 */
export interface NutzapRedemptionContent {
  direction: 'in';
  amount: string;
  nutzap_sender?: string;  // Pubkey of nutzap sender
  comment?: string;        // Optional nutzap comment
  e: [string, string, string, 'created'][];  // Created token events
}

/**
 * Validation functions for NIP-61 events
 */

export function validateNutzapInfoEvent(event: NostrEvent): event is NutzapInfoEvent {
  if (event.kind !== 10019) return false;
  if (event.content !== '') return false;

  const relays = event.tags.filter(([name]) => name === 'relay');
  const mints = event.tags.filter(([name]) => name === 'mint');
  const pubkeys = event.tags.filter(([name]) => name === 'pubkey');

  // Must have at least one relay, one mint, and exactly one pubkey
  if (relays.length === 0 || mints.length === 0 || pubkeys.length !== 1) {
    return false;
  }

  // Validate pubkey format (should be hex)
  const pubkey = pubkeys[0][1];
  if (!pubkey || !/^[0-9a-f]{64}$/i.test(pubkey)) {
    return false;
  }

  // Validate mint URLs
  for (const mint of mints) {
    const url = mint[1];
    if (!url || !isValidUrl(url)) {
      return false;
    }
  }

  return true;
}

export function validateNutzapEvent(event: NostrEvent): event is NutzapEvent {
  if (event.kind !== 9321) return false;

  const proofs = event.tags.filter(([name]) => name === 'proof');
  const mintTags = event.tags.filter(([name]) => name === 'u');
  const recipients = event.tags.filter(([name]) => name === 'p');

  // Must have at least one proof, one mint, and one recipient
  if (proofs.length === 0 || mintTags.length === 0 || recipients.length === 0) {
    return false;
  }

  // Validate proof structure
  for (const proof of proofs) {
    try {
      const parsed = JSON.parse(proof[1]) as P2PKProof;
      if (!validateP2PKProof(parsed)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export function validateP2PKProof(proof: P2PKProof): boolean {
  if (typeof proof.amount !== 'number' || proof.amount <= 0) return false;
  if (!proof.id || !proof.C) return false;

  try {
    // Parse the P2PK secret
    const secret = JSON.parse(proof.secret);
    if (!Array.isArray(secret) || secret[0] !== 'P2PK') return false;

    const p2pkData = secret[1] as P2PKSecret;
    if (!p2pkData.nonce || !p2pkData.data) return false;

    // Validate that data is 02-prefixed pubkey
    if (!p2pkData.data.startsWith('02') || p2pkData.data.length !== 66) return false;

    return true;
  } catch {
    return false;
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * NUT-11 compliant P2PK secret data for nutzaps
 */
export interface P2PKSecretData {
  nonce: string;
  data: string; // Recipient's compressed pubkey
  tags?: string[][];
}

/**
 * Helper function to create NUT-11 compliant P2PK secret for nutzaps
 */
export function createP2PKSecret(recipientPubkey: string): [string, P2PKSecretData] {
  // Generate random nonce
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Ensure pubkey has 02 prefix
  const data = recipientPubkey.startsWith('02') ? recipientPubkey : '02' + recipientPubkey;

  const p2pkData: P2PKSecretData = {
    nonce,
    data,
    tags: [["sigflag", "SIG_INPUTS"]]
  };

  const secret = JSON.stringify(['P2PK', p2pkData]);

  return [secret, p2pkData];
}

/**
 * Extract amount from nutzap event
 */
export function getNutzapAmount(event: NutzapEvent): number {
  const proofs = event.tags
    .filter(([name]) => name === 'proof')
    .map(([, proofJson]) => {
      try {
        return JSON.parse(proofJson) as P2PKProof;
      } catch {
        return null;
      }
    })
    .filter((proof): proof is P2PKProof => proof !== null);

  return proofs.reduce((sum, proof) => sum + proof.amount, 0);
}

/**
 * Get mint URL from nutzap event
 */
export function getNutzapMint(event: NutzapEvent): string | null {
  const mintTag = event.tags.find(([name]) => name === 'u');
  return mintTag ? mintTag[1] : null;
}

/**
 * Get recipient pubkey from nutzap event
 */
export function getNutzapRecipient(event: NutzapEvent): string | null {
  const recipientTag = event.tags.find(([name]) => name === 'p');
  return recipientTag ? recipientTag[1] : null;
}

/**
 * Get nutzapped event ID from nutzap event
 */
export function getNutzappedEvent(event: NutzapEvent): string | null {
  const eventTag = event.tags.find(([name]) => name === 'e');
  return eventTag ? eventTag[1] : null;
}