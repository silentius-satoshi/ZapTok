// Cashu-related type definitions

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
