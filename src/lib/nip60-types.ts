// NIP-60 Cashu wallet types and event structures
// Implements the specification for Nostr-based Cashu wallets

import type { NostrEvent } from '@nostrify/nostrify';

// NIP-60 Event Kinds
export const NIP60_KINDS = {
  WALLET: 17375,      // Cashu Wallet Event
  TOKEN: 7375,        // Token Event (unspent proofs)
  HISTORY: 7376,      // Spending History Event
  QUOTE: 7374,        // Reserved Cashu Wallet Tokens (optional quote tracking)
} as const;

// Basic Cashu types (maintaining compatibility with existing types)
export interface Proof {
  id: string;
  amount: number;
  secret: string;
  C: string;
}

export interface CashuMint {
  url: string;
  alias?: string;
  info?: MintInfo;
}

export interface MintInfo {
  name?: string;
  pubkey?: string;
  version?: string;
  description?: string;
  description_long?: string;
  contact?: Contact[];
  motd?: string;
  nuts?: Record<string, unknown>;
}

export interface Contact {
  method: string;
  info: string;
}

// NIP-60 specific types
export interface WalletEventContent {
  privkey: string;  // P2PK private key (hex)
  mint: string[];   // Array of mint URLs
}

export interface TokenEventContent {
  mint: string;
  proofs: Proof[];
  del?: string[];   // token-event-ids that were destroyed
}

export interface HistoryEventContent {
  direction: 'in' | 'out';
  amount: string;
  e?: string[][];   // Event references with markers
}

export interface QuoteEventContent {
  quote: string;    // Quote ID for tracking payment status
}

// NIP-60 Events
export interface WalletEvent extends NostrEvent {
  kind: typeof NIP60_KINDS.WALLET;
  content: string;  // NIP-44 encrypted WalletEventContent
}

export interface TokenEvent extends NostrEvent {
  kind: typeof NIP60_KINDS.TOKEN;
  content: string;  // NIP-44 encrypted TokenEventContent
}

export interface HistoryEvent extends NostrEvent {
  kind: typeof NIP60_KINDS.HISTORY;
  content: string;  // NIP-44 encrypted HistoryEventContent
}

export interface QuoteEvent extends NostrEvent {
  kind: typeof NIP60_KINDS.QUOTE;
  content: string;  // NIP-44 encrypted QuoteEventContent
  tags: [['expiration', string], ['mint', string]];
}

// Wallet state management
export interface NIP60Wallet {
  id: string;                    // Event ID of wallet event
  privkey: string;              // P2PK private key for receiving nutzaps
  mints: string[];              // Array of mint URLs
  tokens: TokenEventContent[];   // Current unspent proofs grouped by mint
  history: HistoryEventContent[]; // Transaction history
  balance: number;              // Total balance across all mints
  lastUpdated: number;          // Timestamp of last state update
}

// State transition helpers
export interface TokenSpendResult {
  newTokenEvent: TokenEventContent;
  historyEvent: HistoryEventContent;
  deletedTokenIds: string[];
}

export interface TokenReceiveResult {
  tokenEvent: TokenEventContent;
  historyEvent: HistoryEventContent;
}

// Validation functions
export function validateProof(proof: Proof): boolean {
  return !!(proof.id && proof.amount > 0 && proof.secret && proof.C);
}

export function validateTokenEvent(content: TokenEventContent): boolean {
  if (!content.mint || !content.proofs || !Array.isArray(content.proofs)) {
    return false;
  }
  
  return content.proofs.every(validateProof);
}

export function validateWalletEvent(content: WalletEventContent): boolean {
  if (!content.privkey || !content.mint || !Array.isArray(content.mint)) {
    return false;
  }
  
  // Validate private key format (64 hex characters)
  if (!/^[0-9a-fA-F]{64}$/.test(content.privkey)) {
    return false;
  }
  
  // Validate mint URLs
  return content.mint.every(mintUrl => {
    try {
      new URL(mintUrl);
      return true;
    } catch {
      return false;
    }
  });
}

export function validateHistoryEvent(content: HistoryEventContent): boolean {
  if (!['in', 'out'].includes(content.direction)) {
    return false;
  }
  
  if (!content.amount || isNaN(parseInt(content.amount))) {
    return false;
  }
  
  return true;
}

// Utility functions
export function calculateTokenBalance(tokens: TokenEventContent[]): number {
  return tokens.reduce((total, token) => {
    return total + token.proofs.reduce((sum, proof) => sum + proof.amount, 0);
  }, 0);
}

export function groupProofsByMint(tokens: TokenEventContent[]): Record<string, Proof[]> {
  const grouped: Record<string, Proof[]> = {};
  
  for (const token of tokens) {
    if (!grouped[token.mint]) {
      grouped[token.mint] = [];
    }
    grouped[token.mint].push(...token.proofs);
  }
  
  return grouped;
}

export function createTokenSpendTransaction(
  originalTokens: TokenEventContent[],
  spentAmount: number,
  mintUrl: string,
  deletedEventIds: string[]
): TokenSpendResult {
  const mintTokens = originalTokens.filter(t => t.mint === mintUrl);
  const allProofs = mintTokens.flatMap(t => t.proofs);
  
  // Sort proofs by amount to select efficiently
  allProofs.sort((a, b) => a.amount - b.amount);
  
  let selectedAmount = 0;
  const selectedProofs: Proof[] = [];
  const remainingProofs: Proof[] = [];
  
  for (const proof of allProofs) {
    if (selectedAmount < spentAmount) {
      selectedProofs.push(proof);
      selectedAmount += proof.amount;
    } else {
      remainingProofs.push(proof);
    }
  }
  
  if (selectedAmount < spentAmount) {
    throw new Error(`Insufficient balance. Need ${spentAmount}, have ${selectedAmount}`);
  }
  
  return {
    newTokenEvent: {
      mint: mintUrl,
      proofs: remainingProofs,
      del: deletedEventIds
    },
    historyEvent: {
      direction: 'out',
      amount: spentAmount.toString()
    },
    deletedTokenIds: deletedEventIds
  };
}
