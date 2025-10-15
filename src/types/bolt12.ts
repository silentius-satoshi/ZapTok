// Basic BOLT12 types and utilities we can implement immediately
// src/types/bolt12.ts

export interface Bolt12MintQuoteRequest {
  amount: number | null;
  unit: string;
  description?: string;
  pubkey: string; // Required for NUT-25
}

export interface Bolt12MintQuoteResponse {
  quote: string;
  request: string;       // BOLT12 offer
  amount: number | null;
  unit: string;
  expiry: number | null;
  pubkey: string;
  amount_paid: number;   // Total amount paid to this offer
  amount_issued: number; // Total amount of ecash issued
}

export interface Bolt12MeltQuoteRequest {
  request: string; // BOLT12 offer to pay
  unit: string;
  options?: {
    amountless?: {
      amount_msat: number;
    };
  };
}

export interface Bolt12MeltQuoteResponse {
  quote: string;
  request: string;
  amount: number;
  unit: string;
  fee_reserve: number;
  state: 'UNPAID' | 'PENDING' | 'PAID';
  expiry: number;
  payment_preimage?: string;
}

// BOLT12 mint settings
export interface Bolt12MintSettings {
  method: 'bolt12';
  unit: string;
  min_amount?: number;
  max_amount?: number;
  options: {
    description: boolean; // Whether mint supports offer descriptions
  };
}

// Available amount calculation for multiple issuances
export function getAvailableToMint(response: Bolt12MintQuoteResponse): number {
  return response.amount_paid - response.amount_issued;
}

// Check if more minting is possible
export function canMintMore(response: Bolt12MintQuoteResponse): boolean {
  return getAvailableToMint(response) > 0;
}