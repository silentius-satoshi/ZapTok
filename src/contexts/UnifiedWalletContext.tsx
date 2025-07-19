// Enhanced Wallet Context with support for WebLN, NWC, and Cashu
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNWC } from '@/hooks/useNWC';
import { useCashu } from '@/hooks/useCashu';

export type WalletType = 'webln' | 'nwc' | 'cashu';

interface BaseTransaction {
  id: string;
  type: 'send' | 'receive';
  amount: number; // in sats
  timestamp: number;
  description?: string;
  preimage?: string;
  payment_hash?: string;
  settled: boolean;
  walletType: WalletType;
}

interface WalletInfo {
  alias: string;
  balance: number; // in sats
  walletType: WalletType;
  isConnected: boolean;
  pubkey?: string;
  version?: string;
  implementation?: string;
  network?: string;
}

// Enhanced WebLN interface
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

interface UnifiedWalletContextType {
  // Connection status
  isConnected: boolean;
  activeWalletType: WalletType | null;
  availableWallets: WalletInfo[];
  
  // Wallet operations
  connect: (walletType: WalletType) => Promise<void>;
  disconnect: () => void;
  switchWallet: (walletType: WalletType) => void;
  
  // Payment operations
  sendPayment: (invoice: string) => Promise<{ preimage: string; walletType: WalletType }>;
  makeInvoice: (amount: number, memo?: string) => Promise<{ invoice: string; walletType: WalletType }>;
  
  // Data fetching
  getBalance: () => Promise<number>;
  getTransactionHistory: () => Promise<BaseTransaction[]>;
  getWalletInfo: () => Promise<WalletInfo>;
  
  // State
  error: string | null;
  walletInfo: WalletInfo | null;
  transactions: BaseTransaction[];
  isLoading: boolean;
}

const UnifiedWalletContext = createContext<UnifiedWalletContextType | undefined>(undefined);

export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  // WebLN state
  const [webLNProvider, setWebLNProvider] = useState<WebLNProvider | null>(null);
  const [webLNConnected, setWebLNConnected] = useState(false);
  
  // Hooks for NWC and Cashu
  const nwc = useNWC();
  const cashu = useCashu();
  
  // Unified state
  const [activeWalletType, setActiveWalletType] = useState<WalletType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<BaseTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize WebLN
  useEffect(() => {
    const checkWebLN = async () => {
      try {
        if (window.webln?.isEnabled) {
          setWebLNProvider(window.webln);
          setWebLNConnected(true);
        }
      } catch {
        console.log('No existing WebLN connection');
      }
    };

    checkWebLN();
  }, []);

  // Get available wallets
  const availableWallets: WalletInfo[] = [];
  
  // Add WebLN wallet if available
  if (webLNConnected && webLNProvider) {
    availableWallets.push({
      alias: 'WebLN Wallet',
      balance: 0, // Will be updated when selected
      walletType: 'webln',
      isConnected: true,
      implementation: 'WebLN',
    });
  }
  
  // Add NWC wallets
  if (nwc.connections.length > 0) {
    availableWallets.push({
      alias: nwc.currentConnection?.alias || 'NWC Wallet',
      balance: nwc.currentBalance,
      walletType: 'nwc',
      isConnected: nwc.isConnected,
      network: nwc.currentConnection?.walletInfo?.network,
      implementation: 'Nostr Wallet Connect',
    });
  }
  
  // Add Cashu wallets
  if (cashu.wallets.length > 0) {
    availableWallets.push({
      alias: cashu.currentWallet?.alias || 'Cashu Wallet',
      balance: cashu.currentBalance,
      walletType: 'cashu',
      isConnected: cashu.isConnected,
      implementation: 'Cashu eCash',
    });
  }

  const isConnected = availableWallets.some(w => w.isConnected);

  const connect = async (walletType: WalletType) => {
    try {
      setError(null);
      setIsLoading(true);
      
      switch (walletType) {
        case 'webln':
          if (!window.webln) {
            throw new Error('WebLN wallet not available. Please install Alby or another WebLN wallet.');
          }
          await window.webln.enable();
          setWebLNProvider(window.webln);
          setWebLNConnected(true);
          break;
          
        case 'nwc':
          if (nwc.connections.length === 0) {
            throw new Error('No NWC connections configured. Please add a connection first.');
          }
          if (!nwc.isConnected) {
            throw new Error('NWC wallet is not connected.');
          }
          break;
          
        case 'cashu':
          if (cashu.wallets.length === 0) {
            throw new Error('No Cashu wallets configured. Please add a mint first.');
          }
          if (!cashu.isConnected) {
            throw new Error('Cashu wallet is not connected.');
          }
          break;
      }
      
      setActiveWalletType(walletType);
      await refreshWalletInfo(walletType);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setActiveWalletType(null);
    setError(null);
    setWalletInfo(null);
    setTransactions([]);
  };

  const switchWallet = (walletType: WalletType) => {
    setActiveWalletType(walletType);
    refreshWalletInfo(walletType);
  };

  const refreshWalletInfo = async (walletType: WalletType) => {
    try {
      let info: WalletInfo;
      
      switch (walletType) {
        case 'webln': {
          if (!webLNProvider) throw new Error('WebLN not available');
          const balance = await (webLNProvider.getBalance?.() || Promise.resolve({ balance: 0 }));
          info = {
            alias: 'WebLN Wallet',
            balance: balance.balance || 0,
            walletType: 'webln',
            isConnected: true,
            implementation: 'WebLN',
          };
          break;
        }
          
        case 'nwc': {
          info = {
            alias: nwc.currentConnection?.alias || 'NWC Wallet',
            balance: nwc.currentBalance,
            walletType: 'nwc',
            isConnected: nwc.isConnected,
            network: nwc.currentConnection?.walletInfo?.network,
            implementation: 'Nostr Wallet Connect',
          };
          break;
        }
          
        case 'cashu': {
          info = {
            alias: cashu.currentWallet?.alias || 'Cashu Wallet',
            balance: cashu.currentBalance,
            walletType: 'cashu',
            isConnected: cashu.isConnected,
            implementation: 'Cashu eCash',
          };
          break;
        }
          
        default:
          throw new Error('Unknown wallet type');
      }
      
      setWalletInfo(info);
    } catch (error) {
      console.error('Failed to refresh wallet info:', error);
    }
  };

  const sendPayment = async (invoice: string): Promise<{ preimage: string; walletType: WalletType }> => {
    if (!activeWalletType) throw new Error('No active wallet');
    
    try {
      let preimage: string;
      
      switch (activeWalletType) {
        case 'webln': {
          if (!webLNProvider) throw new Error('WebLN not available');
          const webLNResult = await webLNProvider.sendPayment(invoice);
          preimage = webLNResult.preimage;
          break;
        }
          
        case 'nwc': {
          const nwcResult = await nwc.payInvoice(invoice);
          preimage = nwcResult.preimage;
          break;
        }
          
        case 'cashu': {
          const cashuResult = await cashu.payInvoice(invoice);
          if (!cashuResult.success || !cashuResult.preimage) {
            throw new Error('Cashu payment failed');
          }
          preimage = cashuResult.preimage;
          break;
        }
          
        default:
          throw new Error('Unknown wallet type');
      }
      
      // Refresh wallet data after payment
      await refreshWalletInfo(activeWalletType);
      
      return { preimage, walletType: activeWalletType };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Payment failed');
    }
  };

  const makeInvoice = async (amount: number, memo?: string): Promise<{ invoice: string; walletType: WalletType }> => {
    if (!activeWalletType) throw new Error('No active wallet');
    
    try {
      let invoice: string;
      
      switch (activeWalletType) {
        case 'webln': {
          if (!webLNProvider?.makeInvoice) throw new Error('WebLN invoice creation not supported');
          const webLNResult = await webLNProvider.makeInvoice({ amount, defaultMemo: memo });
          invoice = webLNResult.paymentRequest;
          break;
        }
          
        case 'nwc': {
          const nwcResult = await nwc.makeInvoice(amount, memo);
          if (!nwcResult.invoice) throw new Error('Failed to create NWC invoice');
          invoice = nwcResult.invoice;
          break;
        }
          
        case 'cashu': {
          const cashuResult = await cashu.createInvoice(amount);
          invoice = cashuResult.invoice;
          break;
        }
          
        default:
          throw new Error('Unknown wallet type');
      }
      
      return { invoice, walletType: activeWalletType };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create invoice');
    }
  };

  const getBalance = async (): Promise<number> => {
    if (!activeWalletType) throw new Error('No active wallet');
    
    switch (activeWalletType) {
      case 'webln': {
        if (!webLNProvider?.getBalance) return 0;
        const balance = await webLNProvider.getBalance();
        return balance.balance || 0;
      }
        
      case 'nwc':
        return nwc.currentBalance;
        
      case 'cashu':
        return cashu.currentBalance;
        
      default:
        return 0;
    }
  };

  const getTransactionHistory = async (): Promise<BaseTransaction[]> => {
    if (!activeWalletType) return [];
    
    try {
      let transactions: BaseTransaction[] = [];
      
      switch (activeWalletType) {
        case 'webln': {
          // WebLN transaction history is limited
          if (webLNProvider?.listTransactions) {
            const response = await webLNProvider.listTransactions();
            transactions = response.transactions?.map((tx: Record<string, unknown>) => ({
              id: String(tx.payment_hash || tx.id || Math.random().toString(36)),
              type: tx.type === 'outgoing' ? 'send' as const : 'receive' as const,
              amount: Number(tx.amount) || 0,
              timestamp: Number(tx.settled_at || tx.created_at || Date.now() / 1000),
              description: String(tx.description || tx.memo || ''),
              preimage: String(tx.preimage || ''),
              payment_hash: String(tx.payment_hash || ''),
              settled: tx.settled !== false,
              walletType: 'webln' as const,
            })) || [];
          }
          break;
        }
          
        case 'nwc': {
          const nwcTransactions = await nwc.getTransactions();
          transactions = nwcTransactions.map(tx => ({
            id: tx.payment_hash,
            type: tx.type === 'incoming' ? 'receive' : 'send',
            amount: tx.amount,
            timestamp: tx.created_at,
            description: tx.description,
            preimage: tx.preimage,
            payment_hash: tx.payment_hash,
            settled: !!tx.settled_at,
            walletType: 'nwc' as const,
          }));
          break;
        }
          
        case 'cashu':
          // Cashu doesn't have traditional transaction history
          // We could implement a local transaction log
          transactions = [];
          break;
      }
      
      setTransactions(transactions);
      return transactions;
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  };

  const getWalletInfo = async (): Promise<WalletInfo> => {
    if (!activeWalletType) throw new Error('No active wallet');
    
    await refreshWalletInfo(activeWalletType);
    return walletInfo!;
  };

  return (
    <UnifiedWalletContext.Provider value={{
      isConnected,
      activeWalletType,
      availableWallets,
      connect,
      disconnect,
      switchWallet,
      sendPayment,
      makeInvoice,
      getBalance,
      getTransactionHistory,
      getWalletInfo,
      error,
      walletInfo,
      transactions,
      isLoading,
    }}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}

export const useUnifiedWallet = () => {
  const context = useContext(UnifiedWalletContext);
  if (!context) {
    throw new Error('useUnifiedWallet must be used within UnifiedWalletProvider');
  }
  return context;
};

// Re-export the original hook for backward compatibility
export { useWallet } from '@/contexts/WalletContext';
