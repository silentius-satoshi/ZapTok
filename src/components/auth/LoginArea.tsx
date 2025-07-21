// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { useState, useEffect, useCallback } from 'react';
import { User, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { LoginModal } from './LoginModal';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { AccountSwitcher } from './AccountSwitcher';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import LightningWalletModal from '@/components/lightning/LightningWalletModal';

export interface LoginAreaProps {
  className?: string;
}

export function LoginArea({ className }: LoginAreaProps) {
  const { currentUser } = useLoggedInAccounts();
  const { walletInfo, isConnected, getBalance, provider } = useWallet();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [lightningModalOpen, setLightningModalOpen] = useState(false);
  const [currency, setCurrency] = useState<'BTC' | 'USD'>('BTC');

  const [btcPrice, setBtcPrice] = useState(65000); // fallback price
  const [priceLoading, setPriceLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  // Function to refresh wallet balance
  const refreshBalance = useCallback(async () => {
    if (provider && isConnected) {
      try {
        console.log('Refreshing wallet balance...');
        const newBalance = await getBalance();
        console.log('New balance retrieved:', newBalance);
        // The balance should be updated in the wallet context
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }
    }
  }, [provider, isConnected, getBalance]);

  // Fetch real-time Bitcoin price from CoinGecko API
  useEffect(() => {
    const fetchBitcoinPrice = async () => {
      setPriceLoading(true);
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true',
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.bitcoin && data.bitcoin.usd) {
          setBtcPrice(data.bitcoin.usd);
          setLastPriceUpdate(new Date());
          console.log('Bitcoin price updated:', data.bitcoin.usd);
        }
      } catch (error) {
        console.error('Failed to fetch Bitcoin price:', error);
        // Keep using the fallback/previous price on error
      } finally {
        setPriceLoading(false);
      }
    };

    // Fetch price immediately
    fetchBitcoinPrice();

    // Set up interval to fetch price every 1 minute
    const interval = setInterval(fetchBitcoinPrice, 1 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh balance when component mounts and wallet is connected
  useEffect(() => {
    if (isConnected && provider) {
      refreshBalance();
    }
  }, [isConnected, provider, refreshBalance]);

  const formatBalance = () => {
    const balance = walletInfo?.balance || 0;

    // Debug logging
    console.log('formatBalance called:', { balance, walletInfo, isConnected, btcPrice });

    if (currency === 'BTC') {
      return `₿ ${balance.toLocaleString()} sats`;
    } else {
      // Convert sats to BTC, then to USD using real-time price
      const btcAmount = balance / 100_000_000; // Convert sats to BTC
      const usdAmount = btcAmount * btcPrice;
      return `$ ${usdAmount.toFixed(2)} USD`;
    }
  };

  // Lightning wallet button
  const LightningWalletButton = () => (
    <button
      className='flex items-center justify-center p-3 rounded-2xl bg-gray-800/30 hover:bg-gray-700/40 transition-all'
      onClick={() => setLightningModalOpen(true)}
      title="Lightning Wallet"
    >
      <Zap className='w-5 h-5 text-yellow-400' />
    </button>
  );

  // Currency toggle button (BTC/USD) with balance display
  const CurrencyToggleButton = () => (
    <button
      className='flex items-center justify-center gap-2 px-3 py-3 rounded-2xl bg-gray-800/30 hover:bg-gray-700/40 transition-all whitespace-nowrap'
      onClick={() => {
        setCurrency(prev => prev === 'BTC' ? 'USD' : 'BTC');
        console.log('Currency toggled to:', currency === 'BTC' ? 'USD' : 'BTC');
      }}
      title={`Switch to ${currency === 'BTC' ? 'USD' : 'BTC'} ${priceLoading ? '(updating price...)' : lastPriceUpdate ? `(updated ${lastPriceUpdate.toLocaleTimeString()})` : ''}`}
    >
      {currency === 'BTC' ? (
        <span className='text-sm font-medium text-orange-400'>
          {formatBalance()}
        </span>
      ) : (
        <span className='text-sm font-medium text-green-400'>
          {formatBalance()} {priceLoading && <span className="opacity-50">⟳</span>}
        </span>
      )}
    </button>
  );

  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      {currentUser ? (
        <div className="flex items-center gap-2">
          {/* Lightning Wallet Button */}
          <LightningWalletButton />

          {/* Currency Toggle Button - only show if wallet is connected */}
          {isConnected && <CurrencyToggleButton />}

          {/* Account Switcher */}
          <AccountSwitcher onAddAccountClick={() => setLoginModalOpen(true)} />
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

      <LightningWalletModal
        isOpen={lightningModalOpen}
        onClose={() => setLightningModalOpen(false)}
      />
    </div>
  );
}