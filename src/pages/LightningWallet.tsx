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
import { Bitcoin } from 'lucide-react';
import { useCashuStore } from '@/stores/cashuStore';
import { formatBalance } from '@/lib/cashu';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { useCurrencyDisplayStore } from '@/stores/currencyDisplayStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrLogin } from '@nostrify/react/login';
import { useSeoMeta } from '@unhead/react';

export function LightningWallet() {
  useSeoMeta({
    title: 'Lightning Wallet - ZapTok',
    description: 'Manage your Bitcoin lightning wallet, send and receive zaps, and view transaction history.',
  });
  
  const cashuStore = useCashuStore();
  const { data: btcPrice } = useBitcoinPrice();
  const { showSats, toggleCurrency } = useCurrencyDisplayStore();
  const isMobile = useIsMobile();
  const { user } = useCurrentUser();
  const { logins } = useNostrLogin();
  
  // Get the current user's login type and detect signer type
  const currentUserLogin = logins.find(login => login.pubkey === user?.pubkey);
  const loginType = currentUserLogin?.type;
  
  // Detect if this is a bunker signer (can't access Cashu due to remote signing)
  const isBunkerSigner = loginType === 'bunker' || 
                        loginType === 'x-bunker-nostr-tools' ||
                        user?.signer?.constructor?.name?.includes('bunker');
  
  // Calculate total balance manually from wallets and pending proofs (only for non-bunker signers)
  const walletProofs = !isBunkerSigner ? cashuStore.wallets.flatMap(wallet => wallet.proofs || []) : [];
  const allProofs = !isBunkerSigner ? [...walletProofs, ...cashuStore.pendingProofs] : [];
  const totalBalance = allProofs.reduce((sum, proof) => sum + proof.amount, 0);

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
                    <div>
                      <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>Lightning Wallet</h1>
                      <p className={`text-gray-400 mt-2 ${isMobile ? 'text-sm' : ''}`}>
                        {isBunkerSigner 
                          ? 'Bitcoin Connect wallet (Cashu not available with remote signing)'
                          : 'Manage your Bitcoin Lightning and Cashu wallets'
                        }
                      </p>
                    </div>
                    {!isMobile && <RelayContextIndicator className="text-right" />}
                  </div>
                </div>
                
                {/* Total Balance Display - Only for non-bunker signers with Cashu wallets */}
                {!isBunkerSigner && totalBalance >= 0 && (
                  <div className={`text-center space-y-2 ${isMobile ? 'mb-6' : 'mb-8'}`}>
                    <div className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold text-white`}>
                      {showSats
                        ? formatBalance(totalBalance)
                        : btcPrice
                        ? formatUSD(satsToUSD(totalBalance, btcPrice.USD))
                        : formatBalance(totalBalance)}
                    </div>
                    <div className="text-sm text-gray-400">Total Cashu Balance</div>
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
                    <div className="text-sm text-gray-400">
                      Connect to Bitcoin Connect for Lightning payments. Cashu and NWC require local signing and are not available with remote signers.
                    </div>
                  </div>
                )}
                
                {/* Wallet Cards Grid */}
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-2 gap-6'}`}>
                  {!isBunkerSigner ? (
                    // Show all wallet options for extension and nsec signers
                    <>
                      <CashuWalletLightningCard />
                      <CashuWalletCard />
                      <CashuTokenCard />
                      <NutzapCard />
                      <CashuHistoryCard className={isMobile ? '' : 'lg:col-span-2'} />
                    </>
                  ) : (
                    // Show only Bitcoin Connect info for bunker signers
                    <div className="col-span-full">
                      <div className={`p-6 bg-gray-900/50 border border-gray-700 rounded-lg text-center`}>
                        <h3 className="text-lg font-medium text-white mb-2">Bitcoin Connect Only</h3>
                        <p className="text-gray-400 text-sm mb-4">
                          With remote signing, only Bitcoin Connect is available for Lightning payments.
                          Cashu wallets require local private key access for token operations.
                        </p>
                        <div className="text-xs text-gray-500">
                          To access Cashu features, switch to an extension wallet (like Alby) or use an nsec login.
                        </div>
                      </div>
                    </div>
                  )}
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
