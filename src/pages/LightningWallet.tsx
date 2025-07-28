import { AuthGate } from '@/components/AuthGate';
import { Navigation } from '@/components/Navigation';
import { LogoHeader } from '@/components/LogoHeader';
import { CashuWalletCard } from '@/components/CashuWalletCard';
import { CashuHistoryCard } from '@/components/lightning/CashuHistoryCard';
import { CashuTokenCard } from '@/components/lightning/CashuTokenCard';
import { CashuWalletLightningCard } from '@/components/lightning/CashuWalletLightningCard';
import { NutzapCard } from '@/components/lightning/NutzapCard';

export function LightningWallet() {
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
                
                {/* Wallet Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CashuWalletCard />
                  <CashuWalletLightningCard />
                  <CashuHistoryCard />
                  <CashuTokenCard />
                  <NutzapCard />
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
