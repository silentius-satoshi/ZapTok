import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Coins, Loader2, ExternalLink, Wallet, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCashu } from '@/hooks/useCashu';
import { CASHU_MINTS } from '@/lib/cashu-types';
import { isValidMintUrl } from '@/lib/cashu-client';

interface CashuWalletCardProps {
  isConnecting: boolean;
  onConnect: () => void;
}

const CashuWalletCard = ({ isConnecting: _externalIsConnecting, onConnect: externalOnConnect }: CashuWalletCardProps) => {
  const [mintUrl, setMintUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showMintForm, setShowMintForm] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'well-known' | 'custom'>('well-known');
  const [selectedWellKnownMint, setSelectedWellKnownMint] = useState<keyof typeof CASHU_MINTS>('MINIBITS');
  
  const { 
    wallets, 
    currentWallet: _currentWallet,
    addMint,
    addWellKnownMint,
    removeWallet,
    isConnecting,
    refreshWallet,
    testConnection 
  } = useCashu();

  const handleConnect = async () => {
    setError(null);
    
    try {
      if (connectionMethod === 'well-known') {
        await addWellKnownMint(selectedWellKnownMint);
      } else {
        if (!mintUrl.trim()) {
          setError('Please enter a mint URL');
          return;
        }

        if (!isValidMintUrl(mintUrl)) {
          setError('Invalid mint URL format');
          return;
        }

        await addMint(mintUrl, alias || undefined);
      }
      
      setMintUrl('');
      setAlias('');
      setShowMintForm(false);
      externalOnConnect(); // Call the external handler for UI feedback
    } catch (err) {
      console.error('Failed to connect Cashu mint:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect mint');
    }
  };

  const handleRemove = async (walletId: string) => {
    removeWallet(walletId);
  };

  const handleTest = async (walletId: string) => {
    await testConnection(walletId);
  };

  const handleRefresh = async (walletId: string) => {
    await refreshWallet(walletId);
  };

  if (wallets.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-green-400" />
            Cashu eCash Wallets
          </h3>
          <Button 
            onClick={() => setShowMintForm(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Mint
          </Button>
        </div>

        {wallets.map((wallet) => (
          <div 
            key={wallet.id}
            className="p-4 bg-gray-900 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Wallet className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">{wallet.alias}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={wallet.isConnected ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {wallet.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    <span className="text-sm text-gray-400">
                      {wallet.balance.toLocaleString()} sats
                    </span>
                    <span className="text-xs text-gray-500">
                      ({wallet.proofs.length} tokens)
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleTest(wallet.id)}
                  variant="ghost"
                  size="sm"
                  disabled={isConnecting !== null}
                >
                  Test
                </Button>
                <Button
                  onClick={() => handleRefresh(wallet.id)}
                  variant="ghost" 
                  size="sm"
                  disabled={isConnecting !== null}
                >
                  Refresh
                </Button>
                <Button
                  onClick={() => handleRemove(wallet.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </Button>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Mint:</span>
                  <span className="ml-2 text-white text-xs truncate block">
                    {wallet.mint.url.replace('https://', '').replace('http://', '')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Network:</span>
                  <span className="ml-2 text-white">
                    {wallet.mint.info?.name || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {showMintForm && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 space-y-4">
            <h4 className="font-medium text-white">Add Cashu Mint</h4>
            
            <div className="space-y-3">
              <div>
                <Label>Connection Method</Label>
                <Select 
                  value={connectionMethod} 
                  onValueChange={(value) => setConnectionMethod(value as 'well-known' | 'custom')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="well-known">Well-known Mints</SelectItem>
                    <SelectItem value="custom">Custom Mint URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {connectionMethod === 'well-known' ? (
                <div>
                  <Label>Select Mint</Label>
                  <Select 
                    value={selectedWellKnownMint} 
                    onValueChange={(value) => setSelectedWellKnownMint(value as keyof typeof CASHU_MINTS)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MINIBITS">Minibits (mint.minibits.cash)</SelectItem>
                      <SelectItem value="LNBITS_LEGEND">LNbits Legend (legend.lnbits.com)</SelectItem>
                      <SelectItem value="CASHU_ME">Cashu.me (cashu.me)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="mint-url">Mint URL</Label>
                  <Input
                    id="mint-url"
                    value={mintUrl}
                    onChange={(e) => setMintUrl(e.target.value)}
                    placeholder="https://mint.example.com"
                    className="mt-1"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="mint-alias">Alias (optional)</Label>
                <Input
                  id="mint-alias"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="My Cashu Mint"
                  className="mt-1"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => {
                  setShowMintForm(false);
                  setError(null);
                  setMintUrl('');
                  setAlias('');
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={isConnecting !== null}
                size="sm"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <Coins className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">Cashu Wallet</h3>
          <p className="text-sm text-gray-400">
            Privacy-focused eCash for anonymous payments
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <a 
          href="https://cashu.space" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-300 flex items-center"
        >
          Learn More <ExternalLink className="w-3 h-3 ml-1" />
        </a>
        <Button 
          onClick={() => setShowMintForm(true)}
          disabled={isConnecting !== null}
          className="bg-green-500 hover:bg-green-600 text-white px-6"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CashuWalletCard;
