import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Zap,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useCashu } from '@/hooks/useCashu';
import { useBitcoinPrice, satsToUSD, formatUSD } from '@/hooks/useBitcoinPrice';
import { SendReceivePanel } from '@/components/SendReceivePanel';
import { CashuWalletCard } from '@/components/CashuWalletCard';

interface LightningWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LightningWalletModal = ({ isOpen, onClose }: LightningWalletModalProps) => {
  const { walletInfo } = useWallet();
  const { currentBalance: cashuBalance } = useCashu();
  const { data: btcPriceData, isLoading: isPriceLoading } = useBitcoinPrice();
  const [showInSats, setShowInSats] = useState(true);
  const [cashuToken, setCashuToken] = useState('');
  const [_isLoadingTransactions, _setIsLoadingTransactions] = useState(false);
  const [_transactionFilter, _setTransactionFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  const totalBalance = (walletInfo?.balance || 0) + (cashuBalance || 0);

  const formatBalance = (sats: number) => {
    if (showInSats) {
      return `₿ ${sats.toLocaleString()} sats`;
    } else {
      // Use the existing useBitcoinPrice hook utilities
      if (btcPriceData?.USD) {
        const usdAmount = satsToUSD(sats, btcPriceData.USD);
        return `$ ${formatUSD(usdAmount).replace(' usd', ' USD')}`;
      } else {
        return `$ ${sats.toLocaleString()} sats (price loading...)`;
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-6xl max-h-[90vh] overflow-hidden p-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Centered content */}
          <div className="text-center">
            <DialogTitle className={`text-2xl font-bold ${showInSats ? 'text-orange-400' : 'text-green-400'}`}>
              {formatBalance(totalBalance)}
            </DialogTitle>
            <p className="text-gray-400 text-sm mt-2">Total Balance</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInSats(!showInSats)}
              className="text-gray-400 hover:text-white text-xs flex items-center gap-1 mx-auto mt-2"
              title={`Switch to ${showInSats ? 'USD' : 'sats'} ${isPriceLoading ? '(updating price...)' : btcPriceData?.USD ? `(BTC: $${btcPriceData.USD.toLocaleString()})` : ''}`}
            >
              {showInSats ? (
                <>
                  <span className="text-green-400">$</span> Show in USD
                </>
              ) : (
                <>
                  <span className="text-orange-400">₿</span> Show in sats
                </>
              )}
              <RotateCcw className="w-3 h-3" />
              {!showInSats && isPriceLoading && <span className="opacity-50">⟳</span>}
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Lightning Wallet Section */}
                        {/* Lightning Wallet Send/Receive */}
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-yellow-400 font-medium">
                <Zap className="w-5 h-5" />
                Lightning Wallet
              </div>

              <SendReceivePanel />
            </div>

            {/* Cashu Mints Section */}
            <CashuWalletCard />

            {/* Cashu Transaction History Section */}
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <span>Transaction History</span>
                  </div>
                  <p className="text-gray-400 text-sm">Your Cashu transaction history</p>
                </div>
                <Button
                  variant="ghost" 
                  size="sm"
                  className="text-gray-400 hover:text-white h-6 w-6 p-0"
                >
                  <ArrowUpRight className="w-4 h-4 rotate-90" />
                </Button>
              </div>

              <div className="py-8 text-center">
                <p className="text-gray-400 text-sm">No transactions yet</p>
              </div>
            </div>

            {/* Send & Receive Cashu Section */}
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-purple-400 font-medium">
                <div className="w-5 h-5 bg-purple-400 rounded-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-800 rounded-lg"></div>
                </div>
                Send & Receive
              </div>

              <p className="text-gray-400 text-sm">Transfer Cashu tokens</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-gray-700 border-gray-600 hover:bg-gray-600 text-white"
                >
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Receive
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-gray-700 border-gray-600 hover:bg-gray-600 text-white"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Token</label>
                  <Input
                    placeholder="cashuB..."
                    value={cashuToken}
                    onChange={(e) => setCashuToken(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-medium">
                  Redeem Token
                </Button>
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LightningWalletModal;
