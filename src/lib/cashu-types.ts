// Cashu eCash types and interfaces
// Based on Cashu protocol specification

export interface CashuMint {
  url: string;
  alias?: string;
  info?: MintInfo;
}

export interface MintInfo {
  name: string;
  pubkey: string;
  version: string;
  description?: string;
  description_long?: string;
  contact?: Contact[];
  motd?: string;
  nuts: NutInfo;
}

export interface Contact {
  method: string;
  info: string;
}

export interface NutInfo {
  [key: string]: unknown;
  "4": Nut4Info;
  "5": Nut5Info;
  "10"?: Nut10Info;
  "11"?: Nut11Info;
  "12"?: Nut12Info;
}

export interface Nut4Info {
  methods: MeltMethodInfo[];
  disabled: boolean;
}

export interface Nut5Info {
  methods: MintMethodInfo[];
  disabled: boolean;
}

export interface MeltMethodInfo {
  method: string;
  unit: string;
  min_amount?: number;
  max_amount?: number;
}

export interface MintMethodInfo {
  method: string;
  unit: string;
  min_amount?: number;
  max_amount?: number;
}

export interface Nut10Info {
  supported: boolean;
}

export interface Nut11Info {
  supported: boolean;
}

export interface Nut12Info {
  supported: boolean;
}

export interface CashuToken {
  token: Array<{
    mint: string;
    proofs: Proof[];
  }>;
  memo?: string;
}

export interface Proof {
  id: string;
  amount: number;
  secret: string;
  C: string;
}

export interface CashuWallet {
  mint: CashuMint;
  balance: number;
  proofs: Proof[];
}

export interface PayInvoiceRequest {
  invoice: string;
  proofs: Proof[];
}

export interface PayInvoiceResponse {
  ok: boolean;
  change?: Proof[];
  fee?: number;
  preimage?: string;
}

export interface MintTokensRequest {
  amount: number;
  id: string;
}

export interface MintTokensResponse {
  promises: BlindedSignature[];
}

export interface BlindedSignature {
  id: string;
  amount: number;
  C_: string;
}

export interface MeltQuoteRequest {
  request: string; // Lightning invoice
  unit: string;
}

export interface MeltQuoteResponse {
  quote: string;
  amount: number;
  fee_reserve: number;
  paid: boolean;
  expiry?: number;
}

export interface MintQuoteRequest {
  amount: number;
  unit: string;
}

export interface MintQuoteResponse {
  quote: string;
  request: string; // Lightning invoice to pay
  paid: boolean;
  expiry?: number;
}

// Error types
export interface CashuError {
  error: string;
  code?: number;
}

// Well-known mint URLs
export const CASHU_MINTS = {
  MINIBITS: 'https://mint.minibits.cash/Bitcoin',
  LNBITS_LEGEND: 'https://legend.lnbits.com/cashu/api/v1/4gr9Xcmz3XEkUNwiBiQKrsvHNcW',
  CASHU_ME: 'https://cashu.me',
} as const;

export type WellKnownMint = typeof CASHU_MINTS[keyof typeof CASHU_MINTS];
