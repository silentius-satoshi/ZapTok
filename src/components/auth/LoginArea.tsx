// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { LoginModal } from './LoginModal';
import { AddAccountDialog } from './AddAccountDialog';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { DropdownList } from './DropdownList';
import { useWallet } from '@/hooks/useWallet';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { useCashuWallet } from '@/hooks/useCashuWallet';
import { useCashuStore } from '@/stores/cashuStore';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { cn } from '@/lib/utils';
import { bundleLog } from '@/lib/logBundler';
import { devLog } from '@/lib/devConsole';
import FeedButton from '@/components/FeedButton';

export interface LoginAreaProps {
  className?: string;
  showBrowseWithoutLogin?: boolean;
  browseButtonText?: string;
  onBrowseClick?: () => void;
}

export function LoginArea({ 
  className, 
  showBrowseWithoutLogin = false,
  browseButtonText = "Browse Videos", 
  onBrowseClick 
}: LoginAreaProps) {
  const { currentUser } = useLoggedInAccounts();
  const { walletInfo, isConnected, getBalance, provider, userHasLightningAccess } = useWallet();
  const { data: btcPriceData, isLoading: isPriceLoading } = useBitcoinPrice();

  // Get global store for comparison
  const globalCashuStore = useCashuStore();

  // Use global currency store instead of local state
  const { showSats, toggleCurrency } = useCurrencyDisplayStore();

  // Use modern Cashu hooks following Chorus patterns
  const { totalBalance: cashuBalance } = useCashuWallet();

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const navigate = useNavigate();

  // Remove the old currency state and reset effect since we're using global store now

  // Early initialization of user Cashu store to ensure nutzaps work immediately
  useEffect(() => {
    if (currentUser?.pubkey) {
      console.log("Login area initializing for user:", currentUser.pubkey);

      // Use modern initialization following Chorus patterns
      // The useCashuWallet hook handles wallet initialization automatically
      console.log("Wallet initialization handled by modern hooks");
    }
  }, [currentUser?.pubkey]);

  // Track balance state changes to reduce console spam
  const balanceLogRef = useRef<string>('');

  // Function to refresh wallet balance
  const refreshBalance = useCallback(async () => {
    if (provider && isConnected) {
      try {
        const newBalance = await getBalance();
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }
    }
  }, [provider, isConnected, getBalance]);

  // Auto-refresh balance when component mounts and wallet is connected
  useEffect(() => {
    if (isConnected && provider) {
      refreshBalance();
    }
  }, [isConnected, provider, refreshBalance]);

  const formatBalance = useCallback(() => {
    // Get balances from both sources
    const lightningBalance = userHasLightningAccess ? (walletInfo?.balance || 0) : 0;

    // Use reactive Cashu balance directly
    const globalCashuBalance = globalCashuStore?.getTotalBalance?.() || 0;

    // Calculate total balance as Lightning + Cashu
    const totalBalance = lightningBalance + cashuBalance;

    // Only log when values actually change to reduce console spam
    const currentState = JSON.stringify({
      userHasLightningAccess,
      lightningBalance,
      cashuBalance,
      totalBalance
    });

    if (balanceLogRef.current !== currentState) {
      balanceLogRef.current = currentState;

      // Only show detailed debug when there's a significant change or mismatch
      if (cashuBalance !== globalCashuBalance) {
        console.log('💰 Balance Calculation Debug');
        console.log('Lightning Balance:', lightningBalance, 'sats');
        console.log('User Cashu Balance:', cashuBalance, 'sats');
        console.log('Global Cashu Balance (reference):', globalCashuBalance, 'sats');
        console.log('Combined Total Balance:', totalBalance, 'sats');
        console.log('Balance Difference (User vs Global Cashu):', cashuBalance - globalCashuBalance, 'sats');
      }
    }

    if (showSats) {
      return `${totalBalance.toLocaleString()} sats`;
    } else {
      // Use the existing useBitcoinPrice hook utilities
      if (btcPriceData?.USD) {
        const usdAmount = satsToUSD(totalBalance, btcPriceData.USD);
        return `${usdAmount.toFixed(2)} USD`;
      } else {
        return `${totalBalance.toLocaleString()} sats (price loading...)`;
      }
    }
  }, [walletInfo?.balance, cashuBalance, globalCashuStore, showSats, btcPriceData, currentUser?.pubkey, userHasLightningAccess]);

  // Determine if currency toggle should be shown - Always show for logged-in users
  const shouldShowCurrencyToggle = useMemo(() => {
    // Always show currency toggle for any logged-in user
    return !!currentUser;
  }, [currentUser]);

  // Currency toggle button (BTC/USD) with balance display - Enhanced styling
  const CurrencyToggleButton = () => (
    <button
      className='group flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gray-800/30 hover:bg-gray-700/40 transition-all duration-200 whitespace-nowrap min-w-fit'
      onClick={() => {
        toggleCurrency();
        if (import.meta.env.DEV) {
          devLog(`💱 Currency switched to: ${showSats ? 'USD' : 'BTC'}`);
        }
      }}
      title={`Switch to ${showSats ? 'USD' : 'BTC'} ${isPriceLoading ? '(updating price...)' : btcPriceData?.USD ? `(BTC: $${btcPriceData.USD.toLocaleString()})` : ''}`}
    >
      {showSats ? (
        <>
          <span className='text-orange-400 font-semibold text-xs group-hover:text-orange-300 transition-colors duration-200'>₿</span>
          <span className='text-orange-200 font-medium text-xs group-hover:text-orange-100 transition-colors duration-200'>
            {formatBalance().replace(' sats', '')} sats
          </span>
        </>
      ) : (
        <>
          <span className='text-green-400 font-semibold text-xs group-hover:text-green-300 transition-colors duration-200'>$</span>
          <span className='text-green-200 font-medium text-xs group-hover:text-green-100 transition-colors duration-200'>
            {formatBalance().replace('$', '').replace(' USD', '')} USD
            {isPriceLoading && <span className="opacity-50 ml-1">⟳</span>}
          </span>
        </>
      )}
    </button>
  );

  return (
    <div className={cn("inline-flex items-center justify-start min-w-0", className)}>
      {/* Feed Selection Button - Always visible */}
      <FeedButton />
      
      {currentUser ? (
        <div className="flex items-center gap-2 ml-2">
          {/* Currency Toggle Button - show based on computed logic */}
          {shouldShowCurrencyToggle && <CurrencyToggleButton />}

          {/* Account Switcher */}
          <div className="flex-shrink-0">
            <DropdownList onAddAccountClick={() => {
              // Account switching temporarily disabled due to wallet isolation bug
              console.log('Add account disabled due to wallet isolation bug');
            }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full ml-2">
          <Button
            onClick={() => setLoginModalOpen(true)}
            className='flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground w-full font-medium transition-all hover:bg-primary/90 animate-scale-in'
          >
            <User className='w-4 h-4' />
            <span className='truncate'>Log in</span>
          </Button>
          
          {/* Browse without login option */}
          {showBrowseWithoutLogin && onBrowseClick && (
            <Button
              onClick={onBrowseClick}
              variant="outline"
              className='flex items-center gap-2 px-4 py-2 rounded-full w-full font-medium transition-all hover:bg-accent/50'
            >
              <span className='truncate'>{browseButtonText}</span>
            </Button>
          )}
        </div>
      )}

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      <AddAccountDialog
        isOpen={addAccountDialogOpen}
        onClose={() => setAddAccountDialogOpen(false)}
      />
    </div>
  );
}