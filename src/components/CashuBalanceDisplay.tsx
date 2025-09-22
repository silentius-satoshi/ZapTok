import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCashuStore } from '@/stores/cashuStore';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { calculateBalance, formatBalance } from '@/lib/cashu';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { cn } from '@/lib/utils';

interface CashuBalanceDisplayProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function CashuBalanceDisplay({ 
  variant = 'compact', 
  className 
}: CashuBalanceDisplayProps) {
  const navigate = useNavigate();
  const cashuStore = useCashuStore();
  const { showSats } = useCurrencyDisplayStore();
  const { data: btcPrice } = useBitcoinPrice();

  // Calculate total balance across all mints
  const balances = calculateBalance(cashuStore.proofs);
  const totalBalance = Object.values(balances).reduce((sum, balance) => sum + balance, 0);

  // Format balance based on currency preference
  const displayBalance = showSats 
    ? formatBalance(totalBalance)
    : btcPrice 
      ? formatUSD(satsToUSD(totalBalance, btcPrice.USD))
      : formatBalance(totalBalance);

  const balanceText = 'cashu wallet';

  const handleClick = () => {
    navigate('/cashu-wallet');
  };

  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer",
          className
        )}
        onClick={handleClick}
        title="Click to open Cashu wallet"
      >
        <img 
          src="/images/cashu-icon.png" 
          alt="Cashu" 
          className="h-4 w-4" 
        />
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
      title="Click to open Cashu wallet (Ctrl+Click to toggle currency)"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-full bg-yellow-500/10">
          <img 
            src="/images/cashu-icon.png" 
            alt="Cashu" 
            className="h-5 w-5" 
          />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Cashu Balance</p>
          <p className="text-2xl font-bold">{displayBalance}</p>
          <p className="text-xs text-muted-foreground">Click to open wallet • Use currency toggle in nav to switch {showSats ? 'USD' : 'sats'}</p>
        </div>
      </div>
    </div>
  );
}