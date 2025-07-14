export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number; // in sats
  timestamp: number;
  description?: string;
  preimage?: string;
  payment_hash?: string;
  settled: boolean;
}

export interface WalletInfo {
  alias?: string;
  balance: number; // in sats
  pubkey?: string;
  version?: string;
  implementation?: string;
}

// Enhanced WebLN interface for Bitcoin Connect compatibility
export interface WebLNProvider {
  isEnabled: boolean;
  enable(): Promise<void>;
  sendPayment(invoice: string): Promise<{ preimage: string }>;
  getBalance?(): Promise<{ balance: number }>;
  makeInvoice?(args: { amount: number; defaultMemo?: string }): Promise<{ paymentRequest: string }>;
  getInfo?(): Promise<Record<string, unknown>>;
  listTransactions?(): Promise<{ transactions: Record<string, unknown>[] }>;
}

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}

export interface WalletContextType {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendPayment: (invoice: string) => Promise<{ preimage: string }>;
  getBalance: () => Promise<number>;
  makeInvoice: (amount: number, memo?: string) => Promise<string>;
  getTransactionHistory: () => Promise<Transaction[]>;
  getWalletInfo: () => Promise<WalletInfo>;
  provider: WebLNProvider | null;
  error: string | null;
  walletInfo: WalletInfo | null;
  transactions: Transaction[];
  isLoading: boolean;
}
