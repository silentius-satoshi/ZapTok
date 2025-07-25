import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Zap,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  RotateCcw
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useCashu } from '@/hooks/useCashu';
import { SendReceivePanel } from '@/components/SendReceivePanel';

interface LightningWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LightningWalletModal = ({ isOpen, onClose }: LightningWalletModalProps) => {
  const { walletInfo } = useWallet();
  const { currentBalance: cashuBalance } = useCashu();
  const [showInSats, setShowInSats] = useState(true);
  const [cashuToken, setCashuToken] = useState('');
  const [newMintUrl, setNewMintUrl] = useState('https://mint.example.com');
  const [_isLoadingTransactions, _setIsLoadingTransactions] = useState(false);
  const [_transactionFilter, _setTransactionFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  // Real-time Bitcoin price state
  const [btcPrice, setBtcPrice] = useState(65000); // fallback price
  const [priceLoading, setPriceLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  // Fetch real-time Bitcoin price from CoinGecko API
  useEffect(() => {
    if (!isOpen) return; // Only fetch when modal is open

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

    // Fetch price immediately when modal opens
    fetchBitcoinPrice();

    // Set up interval to fetch price every 1 minute while modal is open
    const interval = setInterval(fetchBitcoinPrice, 1 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Cashu mints mock data (to be replaced with real data later)
  const [cashuMints] = useState([
    {
      name: 'Minibits',
      url: 'https://mint.minibits.cash/Bitcoin',
      balance: 0,
      unit: 'USD'
    },
    {
      name: 'Chorus',
      url: 'https://mint.chorus.community',
      balance: 0,
      unit: 'USD'
    }
  ]);

  const totalBalance = (walletInfo?.balance || 0) + (cashuBalance || 0);

  const formatBalance = (sats: number) => {
    if (showInSats) {
      return `₿ ${sats.toLocaleString()} sats`;
    } else {
      // Convert sats to BTC, then to USD using real-time price
      const btcAmount = sats / 100_000_000; // Convert sats to BTC
      const usdAmount = btcAmount * btcPrice;
      return `$ ${usdAmount.toFixed(2)} USD`;
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
              title={`Switch to ${showInSats ? 'USD' : 'sats'} ${priceLoading ? '(updating price...)' : lastPriceUpdate ? `(updated ${lastPriceUpdate.toLocaleTimeString()})` : ''}`}
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
              {!showInSats && priceLoading && <span className="opacity-50">⟳</span>}
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
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-400 font-medium">
                <div className="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                </div>
                Cashu Mints
              </div>

              <p className="text-gray-400 text-sm">Connect to existing mints or add new ones</p>

              <div className="space-y-3">
                {cashuMints.map((mint, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-medium text-white">{mint.name}</p>
                      <p className="text-xs text-gray-400">{mint.url}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">${mint.balance.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{mint.unit}</p>
                    </div>
                  </div>
                ))}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Add Mint</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://mint.example.com"
                      value={newMintUrl}
                      onChange={(e) => setNewMintUrl(e.target.value)}
                      className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    />
                    <Button
                      size="icon"
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

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
