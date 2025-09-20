// Legacy types for compatibility
export interface SpendingHistoryEntry {
  direction: 'in' | 'out';
  amount: string;
  createdTokens?: string[];
  destroyedTokens?: string[];
  redeemedTokens?: string[];
  timestamp?: number;
}

// Re-export from main cashu lib
export * from './cashu';