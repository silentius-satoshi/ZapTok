import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/hooks/useWallet';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { formatBalance } from '@/lib/cashu';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { cn } from '@/lib/utils';

interface BitcoinConnectBalanceDisplayProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function BitcoinConnectBalanceDisplay({ 
  variant = 'compact', 
  className 
}: BitcoinConnectBalanceDisplayProps) {
  const navigate = useNavigate();
  const { walletInfo, isConnected } = useWallet();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  const handleClick = () => {
    navigate('/bitcoin-connect-wallet');
  };

  // Use balance from connected wallet or show 0 if not connected
  const balance = (isConnected && walletInfo) ? walletInfo.balance || 0 : 0;

  // Format balance based on currency preference
  const displayBalance = showSats 
    ? formatBalance(balance)
    : btcPrice 
      ? formatUSD(satsToUSD(balance, btcPrice.USD))
      : formatBalance(balance);

  const balanceText = isConnected && walletInfo 
    ? 'bitcoin connect wallet' 
    : 'bitcoin connect (not connected)';

  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer",
          className
        )}
        onClick={handleClick}
        title={isConnected && walletInfo 
          ? "Click to open Bitcoin Connect wallet" 
          : "Click to connect Bitcoin Connect wallet"
        }
      >
        <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">₿</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{displayBalance}</span>
          <span className="text-xs text-muted-foreground">{balanceText}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center justify-between p-4 rounded-lg bg-card border cursor-pointer hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={handleClick}
      title={isConnected && walletInfo 
        ? "Click to open Bitcoin Connect wallet" 
        : "Click to connect Bitcoin Connect wallet"
      }
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-full bg-orange-500/10">
          <div className="h-5 w-5 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">₿</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Bitcoin Connect Balance</p>
          <p className="text-2xl font-bold">{displayBalance}</p>
          <p className="text-xs text-muted-foreground">
            {isConnected && walletInfo 
              ? `Click to open wallet • Use currency toggle in nav to switch ${showSats ? 'USD' : 'sats'}`
              : 'Click to connect Bitcoin Connect wallet'
            }
          </p>
        </div>
      </div>
    </div>
  );
}