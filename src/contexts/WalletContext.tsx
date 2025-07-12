import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// We'll use the standard WebLN interface for now
// This will be updated to use Bitcoin Connect once installed
interface WebLNProvider {
  isEnabled: boolean;
  enable(): Promise<void>;
  sendPayment(invoice: string): Promise<{ preimage: string }>;
  getBalance?(): Promise<{ balance: number }>;
  makeInvoice?(args: { amount: number; defaultMemo?: string }): Promise<{ paymentRequest: string }>;
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
  provider: WebLNProvider | null;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<WebLNProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if WebLN is already available
    const checkConnection = async () => {
      try {
        if (window.webln?.isEnabled) {
          setProvider(window.webln);
          setIsConnected(true);
        }
      } catch (error) {
        console.log('No existing wallet connection');
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    try {
      setError(null);
      
      // Try to use WebLN first
      if (window.webln) {
        await window.webln.enable();
        setProvider(window.webln);
        setIsConnected(true);
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
    }
  };

  const disconnect = () => {
    setProvider(null);
    setIsConnected(false);
    setError(null);
  };

  const sendPayment = async (invoice: string): Promise<{ preimage: string }> => {
    if (!provider) throw new Error('No wallet connected');
    
    try {
      const response = await provider.sendPayment(invoice);
      return { preimage: response.preimage };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Payment failed');
    }
  };

  const getBalance = async (): Promise<number> => {
    if (!provider) throw new Error('No wallet connected');
    
    try {
      if (provider.getBalance) {
        const response = await provider.getBalance();
        return response.balance;
      }
      return 0; // Some wallets don't support balance queries
    } catch (error) {
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

  return (
    <WalletContext.Provider value={{
      isConnected,
      connect,
      disconnect,
      sendPayment,
      getBalance,
      makeInvoice,
      provider,
      error,
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
