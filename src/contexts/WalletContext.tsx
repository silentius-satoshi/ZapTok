import { useEffect, useState, ReactNode, useRef } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrLogin } from '@nostrify/react/login';
import type {
  Transaction,
  WalletInfo,
  WebLNProvider,
} from '@/lib/wallet-types';
import { WalletContext } from './wallet-context';
import { devLog, devError, bundleLog } from '@/lib/devConsole';

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
  const { logins } = useNostrLogin();
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

  // Get the current user's login type from the login objects
  const currentUserLogin = logins.find(login => login.pubkey === user?.pubkey);
  const loginType = currentUserLogin?.type;

  // Centralized bunker signer detection
  const isBunkerSigner = !!(loginType === 'bunker' ||
                           loginType === 'x-bunker-nostr-tools' ||
                           user?.signer?.constructor?.name?.includes('bunker'));

  // Extension signer detection - only these should get WebLN auto-enable
  const isExtensionSigner = !!(loginType === 'extension' ||
                              user?.signer?.constructor?.name?.includes('NIP07') ||
                              user?.signer?.constructor?.name?.includes('Extension'));

  // Cashu compatibility check - bunker signers cannot sign Cashu events due to remote signing limitations
  const isCashuCompatible = !isBunkerSigner;

  // Reset wallet state when user changes
  useEffect(() => {
    const currentUserPubkey = user?.pubkey;
    const previousUserPubkey = previousUserRef.current;

    // If user changed (including logout), reset wallet state
    if (currentUserPubkey !== previousUserPubkey) {
      devLog('👤 User changed, resetting wallet state:', {
        previous: previousUserPubkey?.slice(0,8) + '...',
        current: currentUserPubkey?.slice(0,8) + '...',
        previousWalletInfo: walletInfo,
        isConnected: isConnected
      });

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

      devLog('👤 Wallet state reset complete for user:', {
        user: currentUserPubkey?.slice(0,8) + '...',
        hasLightningAccess: currentUserPubkey ? getUserLightningEnabled(currentUserPubkey) : false
      });

      // Update the ref for next comparison
      previousUserRef.current = currentUserPubkey;
    }
  }, [user?.pubkey, walletInfo]);

  useEffect(() => {
    // Auto-detect WebLN only for extension signers (not bunker or other remote signers)
    if (!user?.pubkey || !isExtensionSigner) {
      bundleLog('walletAutoDetection', '[WalletContext] Skipping WebLN auto-detection - Extension signer: ' + isExtensionSigner + ', User: ' + !!user?.pubkey);
      return;
    }

    const attemptAutoDetection = async () => {
      try {
        // Check if user has explicitly disabled Lightning access
        const userExplicitlyDisabled = localStorage.getItem(`lightning_disabled_${user.pubkey}`);
        if (userExplicitlyDisabled === 'true') {
          bundleLog('walletAutoDetection', '[WalletContext] Auto-detection skipped - user explicitly disabled Lightning');
          return;
        }

        bundleLog('walletAutoDetection', '[WalletContext] Signer type detection - Extension signer: ' + isExtensionSigner + ', Constructor: ' + user.signer?.constructor?.name);

        // Check if WebLN is available
        if (window.webln) {
          bundleLog('walletAutoDetection', '[WalletContext] WebLN detected, attempting auto-enable for extension signer: ' + user.pubkey.slice(0, 8) + '...');

          // Check if this is Bitcoin Connect's WebLN by looking for specific properties
          const isBitcoinConnect = window.webln.constructor?.name?.includes('BitcoinConnect') ||
                                 'requestProvider' in window.webln ||
                                 window.webln.constructor?.name === 'WebLNProvider' ||
                                 'connectors' in window.webln;

          bundleLog('walletAutoDetection', '[WalletContext] Bitcoin Connect detection - isBitcoinConnect: ' + isBitcoinConnect + ', WebLN constructor: ' + window.webln.constructor?.name);

          if (isBitcoinConnect) {
            bundleLog('walletAutoDetection', '[WalletContext] Bitcoin Connect WebLN detected for extension signer - clearing Bitcoin Connect to allow extension WebLN priority');

            // Clear Bitcoin Connect's WebLN to allow extension WebLN to take priority
            if (window.webln && 'disconnect' in window.webln && typeof window.webln.disconnect === 'function') {
              try {
                await window.webln.disconnect();
              } catch (disconnectError) {
                bundleLog('walletAutoDetection', '[WalletContext] Bitcoin Connect disconnect failed: ' + disconnectError);
              }
            }

            // Clear the global webln to allow extension to set it up
            delete (window as any).webln;

            // Wait a moment for extension to potentially set up webln again
            await new Promise(resolve => setTimeout(resolve, 500));

            // If still no webln or still Bitcoin Connect, skip auto-detection
            if (!window.webln || window.webln.constructor?.name?.includes('BitcoinConnect')) {
              bundleLog('walletAutoDetection', '[WalletContext] Extension WebLN not available after Bitcoin Connect cleanup - skipping auto-detection');
              return;
            }
          }

          try {
            await window.webln.enable();
            const webln = window.webln;

            // Successfully enabled - set up the connection
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
              const userBalance = getUserLightningBalance(user.pubkey) || balance.balance || 0;

              setWalletInfo({
                alias: 'WebLN Wallet',
                balance: userBalance,
                implementation: 'WebLN',
              });

              setTransactionSupport(!!window.webln.listTransactions);

              bundleLog('walletAutoDetection', '[WalletContext] Auto-detection successful for extension signer: ' + user.pubkey.slice(0, 8) + '...');
            } catch (balanceError) {
              bundleLog('walletAutoDetection', '[WalletContext] Could not load initial wallet data: ' + balanceError);
            }
          } catch (enableError) {
            bundleLog('walletAutoDetection', '[WalletContext] WebLN enable failed (user may have rejected): ' + enableError);
            // Don't mark as explicitly disabled here - user might try again later
          }
        } else {
          bundleLog('walletAutoDetection', '[WalletContext] No WebLN provider detected for extension signer');
        }
      } catch (error) {
        bundleLog('walletAutoDetection', '[WalletContext] Auto-detection error: ' + error);
      }
    };

    attemptAutoDetection();
  }, [user?.pubkey, isExtensionSigner]); // Run when user or signer type changes

  const connect = async () => {
    if (!user?.pubkey) {
      throw new Error('User must be logged in to connect Lightning wallet');
    }

    try {
      setError(null);
      setIsLoading(true);

      // Try to use WebLN first
      if (window.webln) {
        try {
          await window.webln.enable();
        } catch (enableError) {
          console.warn('[WalletContext] WebLN enable failed (non-critical):', enableError);
          // Don't fail the entire connection for WebLN enable errors
          // This commonly happens when browser extension prompts are closed
        }

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
          bundleLog('walletConnection', 'Could not load initial wallet data');
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

  const disconnect = async () => {
    try {
      // Try to disable WebLN provider if available
      if (window.webln?.disable) {
        await window.webln.disable();
      }

      // Clear user-specific Lightning access if user is logged in
      if (user?.pubkey) {
        setUserLightningEnabled(user.pubkey, false);
        setUserHasLightningAccess(false);
      }

      // Reset local state
      setProvider(null);
      setIsConnected(false);
      setError(null);
      setWalletInfo(null);
      setTransactions([]);
      setTransactionSupport(null);
    } catch (error) {
      // Even if WebLN disable fails, still clear local state
      console.warn('WebLN disable failed, but clearing local state:', error);

      if (user?.pubkey) {
        setUserLightningEnabled(user.pubkey, false);
        setUserHasLightningAccess(false);
      }

      setProvider(null);
      setIsConnected(false);
      setError(null);
      setWalletInfo(null);
      setTransactions([]);
      setTransactionSupport(null);
    }
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

  const testConnection = async (): Promise<boolean> => {
    try {
      if (!provider) {
        throw new Error('No wallet connected');
      }

      // Try to enable the provider
      if (!provider.isEnabled) {
        await provider.enable();
      }

      // Optionally test getInfo or getBalance to verify connection
      if (provider.getInfo) {
        await provider.getInfo();
      }

      return true;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Connection test failed');
    }
  };

  const getTransactionHistory = async (args?: {
    limit?: number;
    offset?: number;
    unpaid?: boolean;
    from?: number;
    until?: number;
  }) => {
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
          bundleLog('transactionHistory', 'listTransactions method not available on provider (browser extension limitation)');
          }
          setTransactions([]);
          return [];
        }
      } else if (transactionSupport === false) {
        // Already confirmed no support, skip API call
        bundleLog('transactionHistory', 'Skipping transaction history call - provider does not support listTransactions');
        setTransactions([]);
        return [];
      }

      // Provider supports transactions, proceed with API call
      if (provider.listTransactions) {
        if (import.meta.env.DEV) {
          bundleLog('transactionHistory', 'Fetching transaction history with args: ' + JSON.stringify(args));
        }

        try {
          // Call listTransactions with optional parameters
          const response = await provider.listTransactions(args || { limit: 50 });

          // Check if operation was cancelled
          if (currentAbortController.signal.aborted) {
            bundleLog('transactionHistory', 'Transaction history fetch aborted - user changed');
            return [];
          }

          bundleLog('transactionHistory', 'Transaction response: ' + JSON.stringify(response));

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

          bundleLog('transactionHistory', 'Mapped transactions: ' + JSON.stringify(transactions));
        } catch (error) {
          bundleLog('transactionHistory', 'Failed to fetch transactions from provider: ' + error);
          // Fall through to show unsupported message
        }
      }

      // Final check before setting state - make sure operation wasn't cancelled
      if (!currentAbortController.signal.aborted) {
        setTransactions(transactions);
      }

      return transactions;
    } catch (error) {
      devError('Failed to fetch transaction history:', error);
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
      testConnection,
      provider,
      error,
      walletInfo,
      transactions,
      isLoading,
      transactionSupport,
      userHasLightningAccess,
      isBunkerSigner,
      isCashuCompatible,
      isExtensionSigner,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
