import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useCashuWallet } from "@/hooks/useCashuWallet";
import { formatBalance } from "@/lib/cashu";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash,
  Eraser,
  RefreshCw,
} from "lucide-react";
import { useCashuStore } from "@/stores/cashuStore";
import { Badge } from "@/components/ui/badge";
import { useCashuToken } from "@/hooks/useCashuToken";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { useWalletUiStore } from "@/stores/walletUiStore";
import { devLog } from '@/lib/devConsole';

export function CashuWalletCard() {
  const { user } = useCurrentUser();
  
  // Use modern hooks following Chorus patterns
  const walletHook = useCashuWallet();
  const { mints, getTotalBalance, addMint, setActiveMintUrl } = walletHook;
  const { cleanSpentProofs } = useCashuToken();
  const cashuStore = useCashuStore();
  
  const { data: btcPrice } = useBitcoinPrice();
  const walletUiStore = useWalletUiStore();
  const { showSats } = useCurrencyDisplayStore();
  
  // Use the actual expandedCards property from the store
  const isExpanded = walletUiStore.expandedCards.mints;
  const [newMint, setNewMint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedMint, setExpandedMint] = useState<string | null>(null);
  const [flashingMints, setFlashingMints] = useState<Record<string, boolean>>({});

  // Get total balance using new hook
  const totalBalance = getTotalBalance();
  const prevBalances = useRef<Record<string, string>>({});

  // Track balance changes for flash effect
  useEffect(() => {
    if (!showSats && btcPrice) {
      const currentValue = formatUSD(satsToUSD(totalBalance, btcPrice.USD));

      if (
        prevBalances.current['total'] &&
        prevBalances.current['total'] !== currentValue
      ) {
        setFlashingMints((prev) => ({ ...prev, 'total': true }));
        setTimeout(() => {
          setFlashingMints((prev) => ({ ...prev, 'total': false }));
        }, 300);
      }

      prevBalances.current['total'] = currentValue;
    }
  }, [totalBalance, btcPrice, showSats]);

  // Set active mint when mints change
  useEffect(() => {
    if (mints.length > 0 && !cashuStore.activeMintUrl) {
      setActiveMintUrl(mints[0].url);
    }
  }, [mints, cashuStore.activeMintUrl, setActiveMintUrl]);

  const handleAddMint = useCallback(async () => {
    try {
      // Validate URL
      new URL(newMint);
      
      // Add mint using new hook
      await addMint(newMint);
      
      // Clear input
      setNewMint("");
      setError(null);
    } catch (err) {
      setError("Invalid mint URL or failed to add mint");
      console.error("Failed to add mint:", err);
    }
  }, [newMint, addMint]);

  const handleRemoveMint = useCallback((mintUrl: string) => {
    // Don't allow removing the last mint
    if (mints.length <= 1) {
      setError("Cannot remove the last mint");
      return;
    }

    try {
      // Remove mint from store
      cashuStore.mints = cashuStore.mints.filter((m) => m.url !== mintUrl);
      
      // If removing the active mint, set the first available mint as active
      if (cashuStore.activeMintUrl === mintUrl) {
        const remainingMints = mints.filter((m) => m.url !== mintUrl);
        if (remainingMints.length > 0) {
          setActiveMintUrl(remainingMints[0].url);
        }
      }

      // Close expanded view if open
      if (expandedMint === mintUrl) {
        setExpandedMint(null);
      }
      
      setError(null);
    } catch (err) {
      setError("Failed to remove mint");
      console.error("Failed to remove mint:", err);
    }
  }, [mints, cashuStore, expandedMint, setActiveMintUrl]);

  const handleCleanSpentProofs = useCallback(async () => {
    try {
      await cleanSpentProofs.mutateAsync();
      setError(null);
    } catch (err) {
      setError("Failed to clean spent proofs");
      console.error("Failed to clean spent proofs:", err);
    }
  }, [cleanSpentProofs]);

  // Set active mint when clicking on a mint
  const handleSetActiveMint = useCallback((mintUrl: string) => {
    setActiveMintUrl(mintUrl);
  }, [setActiveMintUrl]);

  const toggleExpandMint = useCallback((mintUrl: string) => {
    setExpandedMint(prev => prev === mintUrl ? null : mintUrl);
  }, []);

  const cleanMintUrl = useCallback((mintUrl: string) => {
    return mintUrl.replace("https://", "");
  }, []);

  // Toggle expanded state using the correct method
  const toggleExpanded = useCallback(() => {
    walletUiStore.toggleCardExpansion('mints');
  }, [walletUiStore]);

  // Simple loading state - show setup when no mints
  if (mints.length === 0 && user) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Mints</CardTitle>
            <CardDescription>Set up your first Cashu mint</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="mint-url">Mint URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="mint-url"
                  value={newMint}
                  onChange={(e) => setNewMint(e.target.value)}
                  placeholder="https://mint.minibits.cash/Bitcoin"
                />
                <Button onClick={handleAddMint} disabled={!newMint.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => {
                setNewMint("https://mint.minibits.cash/Bitcoin");
                setTimeout(() => handleAddMint(), 100);
              }} 
              variant="outline" 
              className="w-full"
            >
              Use Default Mint
            </Button>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Mints</CardTitle>
            <CardDescription>You don't have a Cashu wallet yet</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to log in to create a wallet
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Main wallet interface when mints are available
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Mints
            <span
              className={`text-lg font-mono transition-all duration-300 ${
                flashingMints['total'] ? 'bg-yellow-200 dark:bg-yellow-900' : ''
              }`}
            >
              {showSats 
                ? `${formatBalance(totalBalance)} sats`
                : btcPrice
                ? formatUSD(satsToUSD(totalBalance, btcPrice.USD))
                : `${formatBalance(totalBalance)} sats`
              }
            </span>
          </CardTitle>
          <CardDescription>
            Manage your Cashu mints • {mints.length} mint{mints.length !== 1 ? 's' : ''}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleCleanSpentProofs}
            disabled={cleanSpentProofs.isPending}
            title="Clean spent proofs"
          >
            {cleanSpentProofs.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Eraser className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleExpanded}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {/* Add new mint form */}
            <div>
              <Label htmlFor="new-mint-url">Add New Mint</Label>
              <div className="flex space-x-2">
                <Input
                  id="new-mint-url"
                  value={newMint}
                  onChange={(e) => setNewMint(e.target.value)}
                  placeholder="https://mint.example.com"
                />
                <Button onClick={handleAddMint} disabled={!newMint.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Mints list */}
            <div className="space-y-2">
              {mints.map((mint) => {
                const isActive = cashuStore.activeMintUrl === mint.url;
                const mintBalance = 0; // Would need to calculate per-mint balance
                
                return (
                  <div
                    key={mint.url}
                    className={`border rounded-lg p-3 transition-colors ${
                      isActive ? 'border-primary bg-muted/50' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleSetActiveMint(mint.url)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {cleanMintUrl(mint.url)}
                          </span>
                          {isActive && <Badge variant="secondary">Active</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {mint.url}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">
                          {formatBalance(mintBalance)} sats
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpandMint(mint.url)}
                        >
                          {expandedMint === mint.url ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        {mints.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMint(mint.url)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {expandedMint === mint.url && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Mint Info</div>
                            <div>{mint.mintInfo?.name || 'Loading...'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Version</div>
                            <div>{mint.mintInfo?.version || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}