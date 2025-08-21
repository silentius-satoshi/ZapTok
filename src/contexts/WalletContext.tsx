import { useEffect, useState, ReactNode, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type {
  Transaction,
  WalletInfo,
  WebLNProvider,
} from '@/lib/wallet-types';
import { WalletContext } from './wallet-context';

// User-specific Lightning wallet balance storage
const getUserLightningBalanceKey = (pubkey: string) => `lightning_balance_${pubkey}`;

const getUserLightningBalance = (pubkey: string): number => {
  try {
    const stored = localStorage.getItem(getUserLightningBalanceKey(pubkey));
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
};

const setUserLightningBalance = (pubkey: string, balance: number): void => {
  try {
    localStorage.setItem(getUserLightningBalanceKey(pubkey), balance.toString());
  } catch {
    // Ignore localStorage errors
  }
};

// User-specific Lightning wallet connection tracking
const getUserLightningEnabledKey = (pubkey: string) => `lightning_enabled_${pubkey}`;

const getUserLightningEnabled = (pubkey: string): boolean => {
  try {
    const stored = localStorage.getItem(getUserLightningEnabledKey(pubkey));
    return stored === 'true';
  } catch {
    return false;
  }
};

const setUserLightningEnabled = (pubkey: string, enabled: boolean): void => {
  try {
    localStorage.setItem(getUserLightningEnabledKey(pubkey), enabled.toString());
  } catch {
    // Ignore localStorage errors
  }
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser(); // Only auto-connect if user is logged in
  const [provider, setProvider] = useState<WebLNProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionSupport, setTransactionSupport] = useState<boolean | null>(null);

  // Track whether current user has Lightning wallet access enabled
  const [userHasLightningAccess, setUserHasLightningAccess] = useState(false);

  // Track the current user to detect changes
  const previousUserRef = useRef(user?.pubkey);

  // Ref to track ongoing async operations
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset wallet state when user changes
  useEffect(() => {
    const currentUserPubkey = user?.pubkey;
    const previousUserPubkey = previousUserRef.current;

    // If user changed (including logout), reset wallet state
    if (currentUserPubkey !== previousUserPubkey) {
      if (import.meta.env.DEV) {
        console.log('👤 User changed, resetting wallet state:', {
          previous: previousUserPubkey?.slice(0,8) + '...',
          current: currentUserPubkey?.slice(0,8) + '...',
          previousWalletInfo: walletInfo,
          isConnected: isConnected
        });
      }

      // Cancel any ongoing async operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Reset all wallet-related state but handle per-user Lightning access
      setError(null);
      setTransactions([]);

      if (currentUserPubkey) {
        // Check if this user has Lightning wallet access
        const hasLightningAccess = getUserLightningEnabled(currentUserPubkey);
        setUserHasLightningAccess(hasLightningAccess);

        if (hasLightningAccess) {
          // User has Lightning access - maintain connection and load their balance
          const userBalance = getUserLightningBalance(currentUserPubkey);
          setWalletInfo(prev => prev ? {
            ...prev,
            balance: userBalance
          } : {
            alias: 'WebLN Wallet',
            balance: userBalance,
            implementation: 'WebLN',
          });
        } else {
          // User doesn't have Lightning access - reset connection state
          setProvider(null);
          setIsConnected(false);
          setWalletInfo(null);
          setTransactionSupport(null);
        }
      } else {
        // User logged out - reset everything
        setUserHasLightningAccess(false);
        setProvider(null);
        setIsConnected(false);
        setWalletInfo(null);
        setTransactionSupport(null);
      }

      if (import.meta.env.DEV) {
        console.log('👤 Wallet state reset complete for user:', {
          user: currentUserPubkey?.slice(0,8) + '...',
          hasLightningAccess: currentUserPubkey ? getUserLightningEnabled(currentUserPubkey) : false
        });
      }

      // Update the ref for next comparison
      previousUserRef.current = currentUserPubkey;
    }
  }, [user?.pubkey, walletInfo]);

  useEffect(() => {
    // Only attempt automatic WebLN connection if user is logged in and has Lightning access
    if (!user || !getUserLightningEnabled(user.pubkey)) {
      return;
    }

    const checkConnection = async () => {
      try {
        if (window.webln) {
          // Always try to enable first, even if isEnabled is true
          try {
            await window.webln.enable();
            const webln = window.webln;
            setProvider({
              ...webln,
              isEnabled: webln.isEnabled ?? true
            });
            setIsConnected(true);

            // Load initial wallet data after enabling
            try {
              const balance = await (window.webln.getBalance?.() || Promise.resolve({ balance: 0 }));
              const userBalance = user?.pubkey ? getUserLightningBalance(user.pubkey) : balance.balance || 0;

              setWalletInfo({
                alias: 'WebLN Wallet',
                balance: userBalance,
                implementation: 'WebLN',
              });

              // Check transaction support once during initial connection
              setTransactionSupport(!!window.webln.listTransactions);
            } catch {
            if (import.meta.env.DEV) {
              console.log('Could not load initial wallet data');
            }
            }
          } catch {
          if (import.meta.env.DEV) {
            console.log('WebLN provider not enabled or user rejected');
          }
          }
        }
      } catch {
      if (import.meta.env.DEV) {
        console.log('No existing wallet connection');
      }
      }
    };

    checkConnection();
  }, [user]); // Only run when user login state changes

  const connect = async () => {
    if (!user?.pubkey) {
      throw new Error('User must be logged in to connect Lightning wallet');
    }

    try {
      setError(null);
      setIsLoading(true);

      // Try to use WebLN first
      if (window.webln) {
        await window.webln.enable();
        const webln = window.webln;
        setProvider({
          ...webln,
          isEnabled: webln.isEnabled ?? true
        });
        setIsConnected(true);

        // Mark this user as having Lightning access
        setUserLightningEnabled(user.pubkey, true);
        setUserHasLightningAccess(true);

        // Load initial wallet data
        try {
          const balance = await (window.webln.getBalance?.() || Promise.resolve({ balance: 0 }));
          const actualBalance = balance.balance || 0;

          // Store the actual balance for this user
          setUserLightningBalance(user.pubkey, actualBalance);

          setWalletInfo({
            alias: 'WebLN Wallet',
            balance: actualBalance,
            implementation: 'WebLN',
          });

          // Check transaction support once during manual connection
          setTransactionSupport(!!window.webln.listTransactions);
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
    setTransactionSupport(null);
  };

  const sendPayment = async (invoice: string): Promise<{ preimage: string }> => {
    if (!provider) throw new Error('No wallet connected');

    try {
      const response = await provider.sendPayment(invoice);

      // Update balance after successful payment and store per user
      if (user?.pubkey) {
        try {
          await getBalance(); // This will update the stored balance
        } catch {
          // Balance update failed but payment succeeded
        }
      }

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

      if (provider.getBalance && user?.pubkey) {
        const response = await provider.getBalance();
        const actualBalance = response.balance;

        // Store the actual balance from WebLN for this user
        setUserLightningBalance(user.pubkey, actualBalance);

        // Update walletInfo with the new balance
        setWalletInfo(prev => prev ? {
          ...prev,
          balance: actualBalance
        } : {
          alias: 'WebLN Wallet',
          balance: actualBalance,
          implementation: 'WebLN',
        });

        return actualBalance;
      }

      // Return stored user balance if WebLN getBalance not available
      return user?.pubkey ? getUserLightningBalance(user.pubkey) : 0;
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

      const balance = await getBalance(); // This now handles user-specific storage
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

  const getTransactionHistory = async (args?: {
    from?: number;
    until?: number;
    limit?: number;
    offset?: number;
    unpaid?: boolean;
    type?: "incoming" | "outgoing";
  }): Promise<Transaction[]> => {
    if (!provider) throw new Error('No wallet connected');

    try {
      // Ensure provider is enabled before calling listTransactions
      if (!provider.isEnabled) {
        await provider.enable();
      }

      // Create abort controller for this operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const currentAbortController = abortControllerRef.current;

      let transactions: Transaction[] = [];

      // Use cached transaction support check to avoid repeated calls
      if (transactionSupport === null) {
        // First time check - update the support flag
        const hasSupport = !!provider.listTransactions;
        setTransactionSupport(hasSupport);

        if (!hasSupport) {
          if (import.meta.env.DEV) {
          console.log('listTransactions method not available on provider (browser extension limitation)');
          }
          setTransactions([]);
          return [];
        }
      } else if (transactionSupport === false) {
        // Already confirmed no support, skip API call
        if (import.meta.env.DEV) {
        console.log('Skipping transaction history call - provider does not support listTransactions');
        }
        setTransactions([]);
        return [];
      }

      // Provider supports transactions, proceed with API call
      if (provider.listTransactions) {
        if (import.meta.env.DEV) {
          console.log('Fetching transaction history with args:', args);
        }

        try {
          // Call listTransactions with optional parameters
          const response = await provider.listTransactions(args || { limit: 50 });

          // Check if operation was cancelled
          if (currentAbortController.signal.aborted) {
            if (import.meta.env.DEV) {
              console.log('Transaction history fetch aborted - user changed');
            }
            return [];
          }

          if (import.meta.env.DEV) {
          console.log('Transaction response:', response);
          }

          // Map the NWC/NIP-47 transaction format to our internal format
          transactions = response.transactions?.map((tx: Record<string, unknown>) => ({
            id: (tx.payment_hash as string) || (tx.id as string) || Math.random().toString(36),
            type: tx.type === 'outgoing' ? 'send' : 'receive',
            amount: (tx.amount as number) || 0, // Already converted from msats in NostrWebLNProvider
            timestamp: (tx.settled_at as number) || (tx.created_at as number) || Date.now() / 1000,
            description: (tx.description as string) || (tx.memo as string) || '',
            preimage: tx.preimage as string,
            payment_hash: tx.payment_hash as string,
            settled: tx.settled !== false,
          })) || [];

          if (import.meta.env.DEV) {
          console.log('Mapped transactions:', transactions);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
          console.log('Failed to fetch transactions from provider:', error);
          }
          // Fall through to show unsupported message
        }
      }

      // Final check before setting state - make sure operation wasn't cancelled
      if (!currentAbortController.signal.aborted) {
        setTransactions(transactions);
      }

      return transactions;
    } catch (error) {
      console.error('Failed to fetch transaction history:', error);
      // Return empty array instead of throwing to prevent UI crashes
      setTransactions([]);
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
      transactionSupport,
      userHasLightningAccess,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
