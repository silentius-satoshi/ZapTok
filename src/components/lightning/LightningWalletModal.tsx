import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Zap,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  CheckCircle,
  Clock,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useCashu } from '@/hooks/useCashu';
import type { Transaction } from '@/lib/wallet-types';

interface LightningWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LightningWalletModal = ({ isOpen, onClose }: LightningWalletModalProps) => {
  const { walletInfo, transactions, getTransactionHistory, isConnected } = useWallet();
  const { currentBalance: cashuBalance } = useCashu();
  const [showInSats, setShowInSats] = useState(true);
  const [lightningAmount, setLightningAmount] = useState('');
  const [lightningDescription, setLightningDescription] = useState('');
  const [cashuToken, setCashuToken] = useState('');
  const [newMintUrl, setNewMintUrl] = useState('https://mint.example.com');
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  // Real-time Bitcoin price state
  const [btcPrice, setBtcPrice] = useState(65000); // fallback price
  const [priceLoading, setPriceLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  // Fetch transaction history when modal opens and wallet is connected
  useEffect(() => {
    if (isOpen && isConnected) {
      const loadTransactions = async () => {
        setIsLoadingTransactions(true);
        try {
          // Fetch recent transactions with a reasonable limit
          await getTransactionHistory({
            limit: 100, // Fetch last 100 transactions
            type: undefined, // Include both incoming and outgoing
          });
        } catch (error) {
          console.error('Failed to load transaction history:', error);
        } finally {
          setIsLoadingTransactions(false);
        }
      };
      loadTransactions();
    }
  }, [isOpen, isConnected, getTransactionHistory]); // getTransactionHistory is from useWallet hook

  // Function to refresh transactions
  const refreshTransactions = useCallback(async () => {
    if (!isConnected) return;

    setIsLoadingTransactions(true);
    try {
      // Fetch recent transactions with parameters based on filter
      await getTransactionHistory({
        limit: 100, // Fetch last 100 transactions
        type: transactionFilter === 'all' ? undefined : transactionFilter,
      });
    } catch (error) {
      console.error('Failed to refresh transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [isConnected, getTransactionHistory, transactionFilter]);

  // Fetch transactions when filter changes
  useEffect(() => {
    if (isOpen && isConnected) {
      refreshTransactions();
    }
  }, [transactionFilter, isOpen, isConnected, refreshTransactions]);

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
      return `${sats.toLocaleString()} sats`;
    } else {
      // Convert sats to BTC, then to USD using real-time price
      const btcAmount = sats / 100_000_000; // Convert sats to BTC
      const usdAmount = btcAmount * btcPrice;
      return `${usdAmount.toFixed(2)} USD`;
    }
  };

  // Helper function to format timestamps
  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    // For older transactions, show the actual date
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Updated to work with real Transaction data
  const getStatusIcon = (transaction: Transaction) => {
    if (transaction.settled) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    } else {
      return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getTransactionIcon = (type: 'send' | 'receive') => {
    return type === 'receive'
      ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
      : <ArrowUpRight className="w-4 h-4 text-red-400" />;
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
            <DialogTitle className="text-2xl font-bold text-white">
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
              ₿ Show in {showInSats ? 'USD' : 'sats'}
              <RotateCcw className="w-3 h-3" />
              {!showInSats && priceLoading && <span className="opacity-50">⟳</span>}
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="px-6 pb-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Lightning Wallet Section */}
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-yellow-400 font-medium">
                <Zap className="w-5 h-5" />
                Lightning Wallet
              </div>

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
                <Input
                  placeholder="Amount (sats)"
                  value={lightningAmount}
                  onChange={(e) => setLightningAmount(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
                <Input
                  placeholder="Description (optional)"
                  value={lightningDescription}
                  onChange={(e) => setLightningDescription(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium">
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Invoice
                </Button>
              </div>
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

            {/* Transaction History Section */}
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-400 font-medium">
                  <div className="w-5 h-5 bg-blue-400 rounded-sm flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-800 rounded-sm"></div>
                  </div>
                  Transaction History
                  {isConnected && transactions.length > 0 && (
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded-full text-gray-300">
                      {transactions.length}
                    </span>
                  )}
                </div>
                {isConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshTransactions}
                    disabled={isLoadingTransactions}
                    className="text-gray-400 hover:text-white h-8 w-8 p-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>

              <p className="text-gray-400 text-sm">
                {isConnected
                  ? "Browser extension wallets like Alby don't expose transaction history for privacy reasons. Use a direct NWC connection to view transaction history."
                  : "Connect your Lightning wallet to view available features"
                }
              </p>

              {/* Transaction Filter Buttons */}
              {isConnected && (
                <div className="flex gap-2">
                  {(['all', 'incoming', 'outgoing'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={transactionFilter === filter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTransactionFilter(filter)}
                      className={`text-xs ${
                        transactionFilter === filter
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {filter === 'all' ? 'All' : filter === 'incoming' ? 'Received' : 'Sent'}
                    </Button>
                  ))}
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading transactions...</span>
                    </div>
                  </div>
                ) : !isConnected ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-gray-500 text-sm">Connect your wallet to view transactions</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <p className="text-gray-500 text-sm">No transaction history available</p>
                    <p className="text-xs text-gray-600 text-center max-w-xs">
                      Browser extensions don't expose transaction history. Try connecting via Nostr Wallet Connect (NWC) for full transaction features.
                    </p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(tx.type)}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">
                            {tx.type === 'receive' ? '+' : '-'}{tx.amount.toLocaleString()} sats
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {tx.description || 'Lightning payment'}
                          </p>
                          {tx.payment_hash && (
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {tx.payment_hash.slice(0, 16)}...
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-right flex-shrink-0">
                        {getStatusIcon(tx)}
                        <div>
                          <p className="text-xs font-medium text-white capitalize">
                            {tx.settled ? 'Confirmed' : 'Pending'}
                          </p>
                          <p className="text-xs text-gray-400">{formatTimestamp(tx.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
