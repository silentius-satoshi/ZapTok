import { AuthGate } from '@/components/AuthGate';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { CashuWalletCard } from '@/components/CashuWalletCard';
import { CashuHistoryCard } from '@/components/lightning/CashuHistoryCard';
import { CashuTokenCard } from '@/components/lightning/CashuTokenCard';
import { CashuWalletLightningCard } from '@/components/lightning/CashuWalletLightningCard';
import { NutzapCard } from '@/components/lightning/NutzapCard';
import { Button } from '@/components/ui/button';
import { Bitcoin } from 'lucide-react';
import { useCashuStore } from '@/stores/cashuStore';
import { formatBalance } from '@/lib/cashu';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';

export function LightningWallet() {
  const cashuStore = useCashuStore();
  const { data: btcPrice } = useBitcoinPrice();
  const { showSats, toggleCurrency } = useCurrencyDisplayStore();
  
  // Calculate total balance across all mints using wallet balances directly
  const totalBalance = cashuStore.wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);

  return (
    <AuthGate>
      <div className="min-h-screen bg-black text-white">
        <main className="h-screen">
          <div className="flex h-full">
            {/* Left Sidebar - Logo and Navigation */}
            <div className="flex flex-col bg-black">
              <LogoHeader />
              <div className="flex-1">
                <Navigation />
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <div className="max-w-7xl mx-auto p-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-white">Lightning Wallet</h1>
                  <p className="text-gray-400 mt-2">Manage your Bitcoin Lightning and Cashu wallets</p>
                </div>
                
                {/* Total Balance Display */}
                {totalBalance > 0 && (
                  <div className="text-center space-y-2 mb-8">
                    <div className="text-4xl font-bold text-white">
                      {showSats
                        ? formatBalance(totalBalance)
                        : btcPrice
                        ? formatUSD(satsToUSD(totalBalance, btcPrice.USD))
                        : formatBalance(totalBalance)}
                    </div>
                    <div className="text-sm text-gray-400">Total Balance</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleCurrency}
                      className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <Bitcoin className="h-3 w-3 mr-1" />
                      Show in {showSats ? "USD" : "sats"}
                    </Button>
                  </div>
                )}
                
                {/* Wallet Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CashuWalletLightningCard />
                  <CashuWalletCard />
                  <CashuTokenCard />
                  <NutzapCard />
                  <CashuHistoryCard className="lg:col-span-2" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}

export default LightningWallet;
