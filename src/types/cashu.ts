// Cashu-related type definitions
import type { Proof } from '@cashu/cashu-ts';

export interface CashuWalletConnection {
  id: string;
  mintUrl: string;
  alias: string;
  proofs: Proof[];
  balance: number;
  isConnected: boolean;
  lastSeen: number;
}

export interface PendingTransaction {
  id: string;
  type: 'mint' | 'melt' | 'send' | 'receive';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  mintUrl?: string;
  quoteId?: string;
  token?: string;
  invoice?: string;
  description?: string;
}
