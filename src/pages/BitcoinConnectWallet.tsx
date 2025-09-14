import { useState } from 'react';
import { ArrowLeft, Bitcoin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AuthGate } from '@/components/AuthGate';
import { LogoHeader } from '@/components/LogoHeader';
import { Navigation } from '@/components/Navigation';
import { RelayContextIndicator } from '@/components/RelayContextIndicator';
import { Button as BcButton } from '@getalby/bitcoin-connect-react';
import { useWallet } from '@/hooks/useWallet';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { formatBalance } from '@/lib/cashu';
import { useSeoMeta } from '@unhead/react';

export function BitcoinConnectWallet() {
  useSeoMeta({
    title: 'Bitcoin Connect Wallet - ZapTok',
    description: 'Connect your Lightning wallet to send and receive Bitcoin payments through WebLN.',
  });

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isBunkerSigner, isNsecSigner, isExtensionSigner } = useWallet();
  const { data: btcPrice } = useBitcoinPrice();
  const [showSats, setShowSats] = useState(true);

  const toggleCurrency = () => setShowSats(!showSats);

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
                        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white`}>Bitcoin Connect Wallet</h1>
                        <p className={`text-gray-400 mt-2 ${isMobile ? 'text-sm' : ''}`}>
                          Connect your Lightning wallet to send and receive payments
                        </p>
                      </div>
                    </div>
                    {!isMobile && <RelayContextIndicator className="text-right" />}
                  </div>
                </div>

                {/* Bitcoin Connect Wallet Section */}
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 gap-6'} max-w-2xl mx-auto`}>
                  <div className="p-8 bg-gray-900 border border-gray-700 rounded-lg text-center">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bitcoin className="h-8 w-8 text-orange-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white mb-2">Lightning Wallet Connection</h2>
                      <p className="text-gray-400 text-sm mb-6">
                        Connect your preferred Lightning wallet to enable instant Bitcoin payments. 
                        Supports Alby, Zeus, Blue Wallet, and many other Lightning wallets.
                      </p>
                    </div>
                    
                    <BcButton />
                    
                    <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                      <h3 className="text-blue-400 font-medium mb-2">Features</h3>
                      <ul className="text-sm text-gray-300 space-y-1 text-left">
                        <li>• Send Lightning payments instantly</li>
                        <li>• Receive Lightning invoices</li>
                        <li>• Zap content creators</li>
                        <li>• Connect with WebLN-compatible wallets</li>
                      </ul>
                    </div>

                    {isBunkerSigner && (
                      <div className="mt-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                        <div className="text-amber-400 font-medium mb-1">Remote Signing Mode</div>
                        <div className="text-xs text-gray-400">
                          You're using a remote signer. Bitcoin Connect provides Lightning functionality, 
                          while Cashu and NWC require local signing and are not available.
                        </div>
                      </div>
                    )}

                    {(isNsecSigner || isExtensionSigner) && (
                      <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                        <div className="text-purple-400 font-medium mb-1">Also Available</div>
                        <div className="text-xs text-gray-400">
                          Since you're using local signing, you can also use the{' '}
                          <Button 
                            variant="link" 
                            className="text-purple-300 p-0 h-auto font-normal text-xs hover:text-purple-200"
                            onClick={() => navigate('/cashu-wallet')}
                          >
                            Cashu Wallet
                          </Button>
                          {' '}for ecash payments and enhanced privacy.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}

export default BitcoinConnectWallet;