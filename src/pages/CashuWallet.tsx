import { AuthGate } from '@/components/AuthGate';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { CashuWalletCard } from '@/components/CashuWalletCard';
import { CashuHistoryCard } from '@/components/lightning/CashuHistoryCard';
import { CashuTokenCard } from '@/components/lightning/CashuTokenCard';
import { CashuWalletLightningCard } from '@/components/lightning/CashuWalletLightningCard';
import { NutzapCard } from '@/components/lightning/NutzapCard';
import { RelayContextIndicator } from '@/components/RelayContextIndicator';
import { Button } from '@/components/ui/button';
import { Bitcoin, ArrowLeft } from 'lucide-react';
import { useCashuStore } from '@/stores/cashuStore';
import { useUserCashuStore } from '@/stores/userCashuStore';
import { formatBalance } from '@/lib/cashu';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrLogin } from '@nostrify/react/login';
import { useSeoMeta } from '@unhead/react';
import { useNavigate } from 'react-router-dom';

export function CashuWallet() {
  useSeoMeta({
    title: 'Cashu Wallet - ZapTok',
    description: 'Manage your Cashu ecash wallet, send private payments, and view transaction history.',
  });

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Wallet detection
  const { isBunkerSigner, isNsecSigner, isExtensionSigner } = useWallet();
  
  // User state
  const { user } = useCurrentUser();
  
  // Cashu store states
  const cashuStore = useCashuStore();
  const userCashuStore = useUserCashuStore(user?.pubkey);
  
  // Price and currency
  const { data: btcPrice } = useBitcoinPrice();
  const { showSats, toggleCurrency } = useCurrencyDisplayStore();
  
  // Calculate total Cashu balance from both stores
  const cashuBalance = cashuStore.proofs.reduce((sum, proof) => sum + proof.amount, 0);
  const userCashuBalance = userCashuStore?.proofs?.reduce((sum, proof) => sum + proof.amount, 0) || 0;
  const totalBalance = cashuBalance + userCashuBalance;

  return (
    <AuthGate>
      <div className={`min-h-screen bg-black text-white ${isMobile ? 'overflow-x-hidden' : ''}`}>
        <main className="h-screen">
          <div className="flex h-full">
            {/* Left Sidebar - Logo and Navigation - Hidden on Mobile */}
            {!isMobile && (
              <div className="flex flex-col bg-black">
                <LogoHeader />
                <div className="flex-1">
                  <Navigation />
                </div>
              </div>
            )}

            {/* Main Content - Full Width on Mobile */}
            <div className={`flex-1 overflow-y-auto scrollbar-hide ${isMobile ? 'min-w-0 overflow-x-hidden' : ''}`}>
              <div className={`max-w-7xl mx-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Back Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/')}
                        className="text-gray-400 hover:text-white hover:bg-gray-800"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {!isMobile && <span className="ml-2">Back</span>}
                      </Button>

                      <div>
                        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>Cashu Wallet</h1>
                        <p className={`text-gray-400 mt-2 ${isMobile ? 'text-sm' : ''}`}>
                          {isBunkerSigner
                            ? 'Cashu not available with remote signing. Try Bitcoin Connect for Lightning payments.'
                            : 'Manage your private Cashu ecash wallet'
                          }
                        </p>
                      </div>
                    </div>
                    {!isMobile && <RelayContextIndicator className="text-right" />}
                  </div>
                </div>

                {/* Total Cashu Balance Display - Only for local signers */}
                {!isBunkerSigner && totalBalance >= 0 && (
                  <div className={`text-center space-y-2 ${isMobile ? 'mb-6' : 'mb-8'}`}>
                    <div className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold text-white`}>
                      {showSats
                        ? formatBalance(totalBalance)
                        : btcPrice
                        ? formatUSD(satsToUSD(totalBalance, btcPrice.USD))
                        : formatBalance(totalBalance)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Total Cashu Balance
                    </div>
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

                {/* Bunker Signer Notice */}
                {isBunkerSigner && (
                  <div className={`text-center space-y-2 ${isMobile ? 'mb-6' : 'mb-8'} p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg`}>
                    <div className="text-amber-400 font-medium">Remote Signing Mode</div>
                    <div className="text-sm text-gray-400 mb-4">
                      Cashu and NWC require local signing and are not available with remote signers.
                    </div>
                    <Button
                      onClick={() => navigate('/bitcoin-connect-wallet')}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Try Bitcoin Connect Wallet →
                    </Button>
                  </div>
                )}

                {/* Cashu Wallet Cards Grid - Only for local signers */}
                {!isBunkerSigner && (
                  <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-2 gap-6'}`}>
                    <CashuWalletLightningCard />
                    <CashuWalletCard />
                    <CashuTokenCard />
                    <NutzapCard />
                    <CashuHistoryCard className={isMobile ? '' : 'lg:col-span-2'} />
                  </div>
                )}

                {/* Bitcoin Connect Alternative for local signers */}
                {!isBunkerSigner && (
                  <div className={`mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg text-center`}>
                    <div className="text-blue-400 font-medium mb-2">Need Lightning Payments?</div>
                    <div className="text-sm text-gray-400 mb-3">
                      For direct Lightning wallet connections, try our Bitcoin Connect integration.
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/bitcoin-connect-wallet')}
                      className="border-blue-600 text-blue-300 hover:bg-blue-900/30"
                    >
                      Bitcoin Connect Wallet →
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}

export default CashuWallet;