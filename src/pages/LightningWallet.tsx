import { AuthGate } from '@/components/AuthGate';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { CashuWalletCard } from '@/components/CashuWalletCard';
import { CashuHistoryCard } from '@/components/CashuHistoryCard';
import { CashuTokenCard } from '@/components/lightning/CashuTokenCard';
import { CashuWalletLightningCard } from '@/components/lightning/CashuWalletLightningCard';
import { NutzapCard } from '@/components/lightning/NutzapCard';
import { RelayContextIndicator } from '@/components/RelayContextIndicator';
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
  
  // Calculate total balance manually from wallets and pending proofs
  const walletProofs = cashuStore.wallets.flatMap(wallet => wallet.proofs || []);
  const allProofs = [...walletProofs, ...cashuStore.pendingProofs];
  const totalBalance = allProofs.reduce((sum, proof) => sum + proof.amount, 0);
  
  // Debug logging
  if (import.meta.env.DEV) {
  console.log('LightningWallet Debug:', {
    totalBalance,
    walletsCount: cashuStore.wallets.length,
    walletProofs: walletProofs.length,
    pendingProofs: cashuStore.pendingProofs.length,
    allProofs: allProofs.length,
    showSats,
    btcPrice
  });
  }

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
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-white">Lightning Wallet</h1>
                      <p className="text-gray-400 mt-2">Manage your Bitcoin Lightning and Cashu wallets</p>
                    </div>
                    <RelayContextIndicator className="text-right" />
                  </div>
                </div>
                
                {/* Total Balance Display - Show if balance >= 0 for debugging */}
                {totalBalance >= 0 && (
                  <div className="text-center space-y-2 mb-8">
                    <div className="text-4xl font-bold text-white">
                      {showSats
                        ? formatBalance(totalBalance)
                        : btcPrice
                        ? formatUSD(satsToUSD(totalBalance, btcPrice.USD))
                        : formatBalance(totalBalance)}
                    </div>
                    <div className="text-sm text-gray-400">Total Balance ({totalBalance} sats, W:{walletProofs.length} + P:{cashuStore.pendingProofs.length} proofs)</div>
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
