// Types for NIP-47 Nostr Wallet Connect protocol
// Based on NIP-47 specification

export interface NWCConnectionURI {
  walletPubkey: string;
  relay: string[];
  secret: string;
  lud16?: string;
}

export interface NWCRequest {
  method: string;
  params: Record<string, any>;
}

export interface NWCResponse {
  result_type: string;
  error?: {
    code: string;
    message: string;
  };
  result?: Record<string, any>;
}

export interface NWCNotification {
  notification_type: string;
  notification: Record<string, any>;
}

// Command Types
export interface PayInvoiceParams {
  invoice: string;
  amount?: number;
}

export interface PayInvoiceResult {
  preimage: string;
  fees_paid?: number;
}

export interface MakeInvoiceParams {
  amount: number;
  description?: string;
  description_hash?: string;
  expiry?: number;
}

export interface MakeInvoiceResult {
  type: "incoming";
  invoice?: string;
  description?: string;
  description_hash?: string;
  preimage?: string;
  payment_hash: string;
  amount: number;
  fees_paid?: number;
  created_at: number;
  expires_at?: number;
  metadata?: Record<string, any>;
}

export interface GetBalanceResult {
  balance: number;
}

export interface GetInfoResult {
  alias: string;
  color: string;
  pubkey: string;
  network: string;
  block_height: number;
  block_hash: string;
  methods: string[];
  notifications?: string[];
}

export interface Transaction {
  type: "incoming" | "outgoing";
  invoice?: string;
  description?: string;
  description_hash?: string;
  preimage?: string;
  payment_hash: string;
  amount: number;
  fees_paid?: number;
  created_at: number;
  expires_at?: number;
  settled_at?: number;
  metadata?: Record<string, any>;
}

export interface ListTransactionsParams {
  from?: number;
  until?: number;
  limit?: number;
  offset?: number;
  unpaid?: boolean;
  type?: "incoming" | "outgoing";
}

export interface ListTransactionsResult {
  transactions: Transaction[];
}

// Error codes from NIP-47
export const NWC_ERROR_CODES = {
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RESTRICTED: 'RESTRICTED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL: 'INTERNAL',
  OTHER: 'OTHER',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export type NWCErrorCode = typeof NWC_ERROR_CODES[keyof typeof NWC_ERROR_CODES];

// Notification types
export const NWC_NOTIFICATION_TYPES = {
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_SENT: 'payment_sent',
} as const;

export type NWCNotificationType = typeof NWC_NOTIFICATION_TYPES[keyof typeof NWC_NOTIFICATION_TYPES];

// Event kinds from NIP-47
export const NWC_KINDS = {
  INFO: 13194,
  REQUEST: 23194,
  RESPONSE: 23195,
  NOTIFICATION: 23196,
} as const;
