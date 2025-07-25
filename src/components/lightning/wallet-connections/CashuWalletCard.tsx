import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Coins, Loader2, ExternalLink, Wallet, Plus, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useNIP60Cashu, type NIP60CashuWallet } from '@/hooks/useNIP60Cashu';
import { CASHU_MINTS } from '@/lib/cashu-types';
import { useNutzaps } from "@/hooks/useNutzaps";
import { Zap, Gift } from "lucide-react";
import { getNutzapAmount, getNutzapMint } from '@/lib/nip61-types';
import { isValidMintUrl } from '@/lib/cashu-client';
import { CreateCashuWalletModal } from '../CreateCashuWalletModal';
import { useToast } from '@/hooks/useToast';

interface CashuWalletCardProps {
  isConnecting: boolean;
  onConnect?: () => void; // Make optional
}

const CashuWalletCard = ({ isConnecting: _externalIsConnecting, onConnect: externalOnConnect }: CashuWalletCardProps) => {
  const [mintUrl, setMintUrl] = useState('');
  const [_alias, setAlias] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showMintForm, setShowMintForm] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'well-known' | 'custom'>('well-known');
  const [selectedWellKnownMint, setSelectedWellKnownMint] = useState<keyof typeof CASHU_MINTS>('MINIBITS');
  const [expandedMints, setExpandedMints] = useState<Record<string, boolean>>({});

  const { toast } = useToast();

  const {
    wallets,
    currentWallet: _currentWallet,
    createWallet,
    addWellKnownMint,
    setActiveWallet: _setActiveWallet,
    isLoading,
    error: hookError,
    refreshWallet,
    testConnection,
    cleanupWallet,
    removeMintFromWallet
  } = useNIP60Cashu();

  const {
    publishNutzapInfo,
    isNutzapInfoPublished,
    sendNutzap: _sendNutzap,
    receivedNutzaps,
    claimNutzap,
    isLoading: nutzapLoading,
    error: nutzapError,
    totalReceived,
    totalSent
  } = useNutzaps();

  const handleConnect = async () => {
    setError(null);

    console.log('CashuWalletCard: handleConnect called', { connectionMethod, selectedWellKnownMint, mintUrl });

    try {
      if (connectionMethod === 'well-known') {
        console.log('CashuWalletCard: Creating wallet with well-known mint:', selectedWellKnownMint);
        const walletId = await addWellKnownMint(selectedWellKnownMint);
        console.log('CashuWalletCard: Wallet created successfully:', walletId);
      } else {
        if (!mintUrl.trim()) {
          setError('Please enter a mint URL');
          return;
        }

        if (!isValidMintUrl(mintUrl)) {
          setError('Invalid mint URL format');
          return;
        }

        console.log('CashuWalletCard: Creating wallet with custom mint:', mintUrl);
        const walletId = await createWallet([mintUrl]);
        console.log('CashuWalletCard: Wallet created successfully:', walletId);
      }

      setMintUrl('');
      setAlias('');
      setShowMintForm(false);

      // Only call external handler if provided
      if (externalOnConnect) {
        externalOnConnect();
      }
    } catch (err) {
      console.error('CashuWalletCard: Failed to connect Cashu mint:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect mint');
    }
  };

  const handleRemove = async (_walletId: string) => {
    // NIP-60 wallets can't be directly removed since they're Nostr events
    // Instead, we could create a new wallet without the unwanted mints
    console.warn('NIP-60 wallet removal not implemented - wallets are permanent Nostr events');
  };

  const handleTest = async (walletId: string) => {
    await testConnection(walletId);
  };

  const handleRefresh = async (walletId: string) => {
    await refreshWallet(walletId);
  };

  const handleCleanupWallet = async (walletId: string) => {
    try {
      await cleanupWallet(walletId);
      toast({
        title: "Wallet cleaned up",
        description: "Spent tokens have been removed and wallet data consolidated.",
      });
    } catch (err) {
      toast({
        title: "Cleanup failed",
        description: err instanceof Error ? err.message : "Failed to cleanup wallet",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMint = async (walletId: string, mintUrl: string) => {
    try {
      await removeMintFromWallet(walletId, mintUrl);
      toast({
        title: "Mint removed",
        description: `Successfully removed ${mintUrl.replace('https://', '').replace('http://', '')} from wallet`,
      });
    } catch (err) {
      toast({
        title: "Remove failed",
        description: err instanceof Error ? err.message : "Failed to remove mint",
        variant: "destructive",
      });
    }
  };

  const toggleMintExpansion = (mintUrl: string) => {
    setExpandedMints(prev => ({
      ...prev,
      [mintUrl]: !prev[mintUrl]
    }));
  };

  const getMintBalance = (wallet: NIP60CashuWallet, mintUrl: string): number => {
    return wallet.tokens
      .filter((token) => token.mint === mintUrl)
      .reduce((sum: number, token) => {
        // Sum up all proof amounts for this mint
        return sum + token.proofs.reduce((proofSum, proof) => proofSum + proof.amount, 0);
      }, 0);
  };

  // Display error from hook if present
  const displayError = error || hookError || nutzapError;

  if (wallets.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-green-400" />
            NIP-60 Cashu Wallets
          </h3>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Wallet
          </Button>
        </div>

        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="p-4 bg-gray-900 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Wallet className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">
                    NIP-60 Wallet ({wallet.mints.length} mint{wallet.mints.length !== 1 ? 's' : ''})
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="text-xs">
                      On-chain
                    </Badge>
                    <span className="text-sm text-gray-400">
                      {wallet.balance.toLocaleString()} sats
                    </span>
                    <span className="text-xs text-gray-500">
                      ({wallet.tokens.length} token events)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleTest(wallet.id)}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                >
                  Test
                </Button>
                <Button
                  onClick={() => handleRefresh(wallet.id)}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                >
                  Refresh
                </Button>
                <Button
                  onClick={() => handleRemove(wallet.id)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-400"
                  disabled
                  title="NIP-60 wallets are permanent Nostr events"
                >
                  Permanent
                </Button>
              </div>
            </div>

            {/* Mints Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-white">Mints</h5>
                <span className="text-xs text-gray-400">Manage your Cashu mints</span>
              </div>

              {wallet.mints.map((mint) => {
                const isExpanded = expandedMints[mint];
                const mintBalance = getMintBalance(wallet, mint);
                const displayUrl = mint.replace('https://', '').replace('http://', '');
                
                return (
                  <div key={mint} className="bg-gray-800 rounded-lg border border-gray-600">
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <button
                            onClick={() => toggleMintExpansion(mint)}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-white truncate">
                                {displayUrl}
                              </span>
                              <Badge 
                                variant={mintBalance > 0 ? "default" : "secondary"} 
                                className="text-xs"
                              >
                                Active
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-400">
                              {mintBalance.toLocaleString()} sats used
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleCleanupWallet(wallet.id)}
                            variant="ghost"
                            size="sm"
                            disabled={isLoading}
                            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            Cleanup Wallet
                          </Button>
                          <Button
                            onClick={() => handleRemoveMint(wallet.id, mint)}
                            variant="ghost"
                            size="sm"
                            disabled={isLoading || wallet.mints.length === 1}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            title={wallet.mints.length === 1 ? "Cannot remove the last mint" : "Remove this mint"}
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Full URL:</span>
                              <div className="ml-2 text-white text-xs break-all">
                                {mint}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-400">Status:</span>
                              <span className="ml-2 text-green-400 text-xs">
                                Connected
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add Mint Button */}
              <Button
                onClick={() => setShowMintForm(true)}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Mint
              </Button>
            </div>

            {/* Nutzap Status Section */}
            <div className="mt-4 pt-4 border-t border-gray-600">
              <span className="text-gray-400">Nutzaps:</span>
              <div className="flex items-center space-x-2 mt-1">
                {isNutzapInfoPublished ? (
                  <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">
                    <Zap className="w-3 h-3 mr-1" />
                    NIP-61 Ready
                  </Badge>
                ) : (
                  <Button
                    onClick={publishNutzapInfo}
                    variant="outline"
                    size="sm"
                    disabled={isLoading || nutzapLoading}
                    className="text-xs"
                  >
                    Enable Nutzaps
                  </Button>
                )}
                {receivedNutzaps.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Gift className="w-3 h-3 mr-1" />
                    {receivedNutzaps.length} pending
                  </Badge>
                )}
              </div>
              {(totalReceived > 0 || totalSent > 0) && (
                <div className="text-xs text-gray-500 mt-1">
                  Received: {totalReceived} sats • Sent: {totalSent} sats
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Pending Nutzaps Section */}
        {receivedNutzaps.length > 0 && (
          <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-600/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-400" />
                Pending Nutzaps ({receivedNutzaps.length})
              </h4>
            </div>
            <div className="space-y-2">
              {receivedNutzaps.slice(0, 3).map((nutzap) => {
                const amount = getNutzapAmount(nutzap);
                const mint = getNutzapMint(nutzap);
                return (
                  <div key={nutzap.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div>
                      <div className="text-sm text-white">{amount} sats</div>
                      {nutzap.content && (
                        <div className="text-xs text-gray-400 truncate max-w-48">
                          "{nutzap.content}"
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {mint?.replace("https://", "").replace("http://", "")}
                      </div>
                    </div>
                    <Button
                      onClick={() => claimNutzap(nutzap)}
                      size="sm"
                      disabled={isLoading || nutzapLoading}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      {nutzapLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Claim"
                      )}
                    </Button>
                  </div>
                );
              })}
              {receivedNutzaps.length > 3 && (
                <div className="text-center text-xs text-gray-400">
                  +{receivedNutzaps.length - 3} more nutzaps pending
                </div>
              )}
            </div>
          </div>
        )}

        {showMintForm && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 space-y-4">
            <h4 className="font-medium text-white">Create NIP-60 Cashu Wallet</h4>

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
            </div>

            {displayError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{displayError}</AlertDescription>
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
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Wallet'
                )}
              </Button>
            </div>
          </div>
        )}

        <CreateCashuWalletModal 
          open={showCreateModal} 
          onClose={() => {
            setShowCreateModal(false);
            // Call external handler if provided
            if (externalOnConnect) {
              externalOnConnect();
            }
          }}
        />
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
          <h3 className="font-medium text-white">NIP-60 Cashu Wallet</h3>
          <p className="text-sm text-gray-400">
            Nostr-native eCash with NIP-61 Nutzaps support
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <a
          href="https://github.com/nostr-protocol/nips/blob/master/60.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-300 flex items-center"
        >
          NIP-60 Spec <ExternalLink className="w-3 h-3 ml-1" />
        </a>
        <a
          href="https://github.com/nostr-protocol/nips/blob/master/61.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-300 flex items-center"
        >
          NIP-61 Spec <ExternalLink className="w-3 h-3 ml-1" />
        </a>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={isLoading}
          className="bg-green-500 hover:bg-green-600 text-white px-6"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "Create Wallet"
          )}
        </Button>
      </div>

      <CreateCashuWalletModal 
        open={showCreateModal} 
        onClose={() => {
          setShowCreateModal(false);
          // Call external handler if provided
          if (externalOnConnect) {
            externalOnConnect();
          }
        }}
      />
    </div>
  );
};

export default CashuWalletCard;
