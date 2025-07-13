import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number; // in sats
  timestamp: number;
  description?: string;
  preimage?: string;
  payment_hash?: string;
  settled: boolean;
}

interface WalletInfo {
  alias?: string;
  balance: number; // in sats
  pubkey?: string;
  version?: string;
  implementation?: string;
}

// Enhanced WebLN interface for Bitcoin Connect compatibility
interface WebLNProvider {
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

interface WalletContextType {
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

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<WebLNProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (window.webln) {
          // Always try to enable first, even if isEnabled is true
          try {
            await window.webln.enable();
            setProvider(window.webln);
            setIsConnected(true);
            
            // Load initial wallet data after enabling
            try {
              const balance = await (window.webln.getBalance?.() || Promise.resolve({ balance: 0 }));
              setWalletInfo({
                alias: 'WebLN Wallet',
                balance: balance.balance || 0,
                implementation: 'WebLN',
              });
            } catch {
              console.log('Could not load initial wallet data');
            }
          } catch {
            console.log('WebLN provider not enabled or user rejected');
          }
        }
      } catch {
        console.log('No existing wallet connection');
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Try to use WebLN first
      if (window.webln) {
        await window.webln.enable();
        setProvider(window.webln);
        setIsConnected(true);
        
        // Load initial wallet data
        try {
          const balance = await (window.webln.getBalance?.() || Promise.resolve({ balance: 0 }));
          setWalletInfo({
            alias: 'WebLN Wallet',
            balance: balance.balance || 0,
            implementation: 'WebLN',
          });
        } catch {
          console.log('Could not load initial wallet data');
        }
        
        return;
      }

      // If WebLN is not available, we'll need Bitcoin Connect
      // For now, throw an error to guide users to install a WebLN wallet
      throw new Error(
        'No Lightning wallet found. Please install a WebLN-compatible wallet like Alby, or connect using Bitcoin Connect.'
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setProvider(null);
    setIsConnected(false);
    setError(null);
    setWalletInfo(null);
    setTransactions([]);
  };

  const sendPayment = async (invoice: string): Promise<{ preimage: string }> => {
    if (!provider) throw new Error('No wallet connected');
    
    try {
      const response = await provider.sendPayment(invoice);
      // Refresh transaction history after payment
      await getTransactionHistory();
      return { preimage: response.preimage };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Payment failed');
    }
  };

  const getBalance = async (): Promise<number> => {
    if (!provider) throw new Error('No wallet connected');
    
    try {
      // Ensure provider is enabled before calling getBalance
      if (!provider.isEnabled) {
        await provider.enable();
      }
      
      if (provider.getBalance) {
        const response = await provider.getBalance();
        return response.balance;
      }
      return 0; // Some wallets don't support balance queries
    } catch (error) {
      if (error instanceof Error && error.message.includes('enable')) {
        throw new Error('Wallet provider must be enabled before checking balance');
      }
      throw new Error(error instanceof Error ? error.message : 'Failed to get balance');
    }
  };

  const makeInvoice = async (amount: number, memo?: string): Promise<string> => {
    if (!provider) throw new Error('No wallet connected');
    
    try {
      if (provider.makeInvoice) {
        const response = await provider.makeInvoice({ amount, defaultMemo: memo });
        return response.paymentRequest;
      }
      throw new Error('Wallet does not support invoice creation');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create invoice');
    }
  };

  const getWalletInfo = async (): Promise<WalletInfo> => {
    if (!provider) throw new Error('No wallet connected');
    
    try {
      // Ensure provider is enabled before calling methods
      if (!provider.isEnabled) {
        await provider.enable();
      }
      
      const balance = await getBalance();
      let info: Record<string, unknown> = {};
      
      if (provider.getInfo) {
        info = await provider.getInfo();
      }
      
      const walletInfo: WalletInfo = {
        alias: (info.alias as string) || 'Unknown Wallet',
        balance,
        pubkey: ((info.node as Record<string, unknown>)?.alias as string) || (info.pubkey as string),
        version: info.version as string,
        implementation: (info.implementation_name as string) || 'WebLN Wallet',
      };
      
      setWalletInfo(walletInfo);
      return walletInfo;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get wallet info');
    }
  };

  const getTransactionHistory = async (): Promise<Transaction[]> => {
    if (!provider) throw new Error('No wallet connected');
    
    try {
      // Note: Transaction history support varies by wallet
      // Some wallets may not support this method
      let transactions: Transaction[] = [];
      
      if (provider.listTransactions) {
        const response = await provider.listTransactions();
        transactions = response.transactions?.map((tx: Record<string, unknown>) => ({
          id: (tx.payment_hash as string) || (tx.id as string) || Math.random().toString(36),
          type: tx.type === 'outgoing' ? 'send' : 'receive',
          amount: (tx.amount as number) || 0,
          timestamp: (tx.settled_at as number) || (tx.created_at as number) || Date.now() / 1000,
          description: (tx.description as string) || (tx.memo as string),
          preimage: tx.preimage as string,
          payment_hash: tx.payment_hash as string,
          settled: tx.settled !== false,
        })) || [];
      }
      
      setTransactions(transactions);
      return transactions;
    } catch (error) {
      // Many wallets don't support transaction history
      console.log('Transaction history not available:', error);
      return [];
    }
  };

  return (
    <WalletContext.Provider value={{
      isConnected,
      connect,
      disconnect,
      sendPayment,
      getBalance,
      makeInvoice,
      getTransactionHistory,
      getWalletInfo,
      provider,
      error,
      walletInfo,
      transactions,
      isLoading,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
