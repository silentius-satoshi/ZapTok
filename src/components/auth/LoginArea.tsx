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
import { useUserCashuStore } from '@/stores/userCashuStore';
import { cn } from '@/lib/utils';

export interface LoginAreaProps {
  className?: string;
}

export function LoginArea({ className }: LoginAreaProps) {
  const { currentUser } = useLoggedInAccounts();
  const { walletInfo, isConnected, getBalance, provider, userHasLightningAccess } = useWallet();
  const { data: btcPriceData, isLoading: isPriceLoading } = useBitcoinPrice();
  const cashuStore = useUserCashuStore(currentUser?.pubkey);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [currency, setCurrency] = useState<'BTC' | 'USD'>('BTC');
  const navigate = useNavigate();

  // Reset currency state when user changes to ensure UI updates
  useEffect(() => {
    if (currentUser) {
      // Force currency toggle to re-evaluate by resetting to BTC
      setCurrency('BTC');
    }
  }, [currentUser?.pubkey]);

  // Bundle balance logging to reduce console noise
  const balanceLogRef = useRef({
    lastLogTime: 0,
    callCount: 0,
    lastBalance: 0,
  });

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
    // Only include Lightning balance if user has Lightning access
    const lightningBalance = userHasLightningAccess ? (walletInfo?.balance || 0) : 0;
    const cashuBalance = cashuStore?.wallets
      ? cashuStore.wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0)
      : 0;
    const totalBalance = lightningBalance + cashuBalance;

    if (currency === 'BTC') {
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
  }, [walletInfo?.balance, cashuStore?.wallets, currency, btcPriceData, currentUser?.pubkey, userHasLightningAccess]);

  // Lightning wallet button - Enhanced with better styling
  const LightningWalletButton = () => (
    <button
      className='group flex items-center justify-center p-3 rounded-xl bg-gray-800/30 hover:bg-gray-700/40 transition-all duration-200'
      onClick={() => navigate('/wallet')}
      title="Lightning Wallet"
    >
      <Zap className='w-4 h-4 text-yellow-400 group-hover:text-yellow-300 transition-colors duration-200' />
    </button>
  );

  // Determine if currency toggle should be shown - Always show for logged-in users
  const shouldShowCurrencyToggle = useMemo(() => {
    // Always show currency toggle for any logged-in user
    return !!currentUser;
  }, [currentUser]);

  // Currency toggle button (BTC/USD) with balance display - Enhanced styling
  const CurrencyToggleButton = () => (
    <button
      className='group flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-gray-800/30 hover:bg-gray-700/40 transition-all duration-200 whitespace-nowrap min-w-fit'
      onClick={() => {
        const newCurrency = currency === 'BTC' ? 'USD' : 'BTC';
        setCurrency(newCurrency);
        if (import.meta.env.DEV) {
          console.log(`💱 Currency switched to: ${newCurrency}`);
        }
      }}
      title={`Switch to ${currency === 'BTC' ? 'USD' : 'BTC'} ${isPriceLoading ? '(updating price...)' : btcPriceData?.USD ? `(BTC: $${btcPriceData.USD.toLocaleString()})` : ''}`}
    >
      {currency === 'BTC' ? (
        <>
          <span className='text-orange-400 font-semibold text-sm group-hover:text-orange-300 transition-colors duration-200'>₿</span>
          <span className='text-orange-200 font-medium text-sm group-hover:text-orange-100 transition-colors duration-200'>
            {formatBalance().replace(' sats', '')} sats
          </span>
        </>
      ) : (
        <>
          <span className='text-green-400 font-semibold text-sm group-hover:text-green-300 transition-colors duration-200'>$</span>
          <span className='text-green-200 font-medium text-sm group-hover:text-green-100 transition-colors duration-200'>
            {formatBalance().replace('$', '').replace(' USD', '')} USD
            {isPriceLoading && <span className="opacity-50 ml-1">⟳</span>}
          </span>
        </>
      )}
    </button>
  );

  return (
    <div className={cn("inline-flex items-center justify-start min-w-0", className)}>
      {currentUser ? (
        <div className="flex items-center gap-3">
          {/* Lightning Wallet Button */}
          <LightningWalletButton />

          {/* Currency Toggle Button - show based on computed logic */}
          {shouldShowCurrencyToggle && <CurrencyToggleButton />}

          {/* Account Switcher */}
          <div className="flex-shrink-0">
            <DropdownList onAddAccountClick={() => setAddAccountDialogOpen(true)} />
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setLoginModalOpen(true)}
          className='flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground w-full font-medium transition-all hover:bg-primary/90 animate-scale-in'
        >
          <User className='w-4 h-4' />
          <span className='truncate'>Log in</span>
        </Button>
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