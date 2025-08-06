import { useState, useEffect, useRef } from "react";
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
import { useCashuStore, CashuWalletStruct } from "@/stores/cashuStore";
import { Badge } from "@/components/ui/badge";
import { useCashuToken } from "@/hooks/useCashuToken";
import { useCreateCashuWallet } from "@/hooks/useCreateCashuWallet";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { useWalletUiStore } from "@/stores/walletUiStore";


export function CashuWalletCard() {
  const { user } = useCurrentUser();
  const { wallet, isLoading, createWallet, walletError, tokensError } = useCashuWallet();
  const cashuStore = useCashuStore();
  const { cleanSpentProofs } = useCashuToken();
  const { data: btcPrice } = useBitcoinPrice();
  const walletUiStore = useWalletUiStore();
  const isExpanded = walletUiStore.expandedCards.mints;
  const [newMint, setNewMint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedMint, setExpandedMint] = useState<string | null>(null);
  const [flashingMints, setFlashingMints] = useState<Record<string, boolean>>({});

  // Get wallet total balance (not per-mint, since balance is total across all mints)
  const totalBalance = cashuStore.wallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
  
  const prevBalances = useRef<Record<string, string>>({});
  const { showSats } = useCurrencyDisplayStore();

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

  // Use useEffect to set active mint when wallet changes
  useEffect(() => {
    if (
      wallet &&
      wallet.mints &&
      wallet.mints.length > 0 &&
      !cashuStore.activeMintUrl
    ) {
      cashuStore.setActiveMintUrl(wallet.mints[0]);
    }
  }, [wallet, cashuStore]);

  const {
    mutate: handleCreateWallet,
    isPending: isCreatingWallet,
    error: createWalletError,
  } = useCreateCashuWallet();

  // Update error state when createWalletError changes
  useEffect(() => {
    if (createWalletError) {
      setError(createWalletError.message);
    }
  }, [createWalletError]);

  const handleAddMint = () => {
    if (!wallet || !wallet.mints) return;

    try {
      // Validate URL
      new URL(newMint);

      // Add mint to wallet
      const updatedWalletData: CashuWalletStruct = {
        id: crypto.randomUUID(),
        name: 'My Wallet',
        unit: 'sat',
        mints: [...wallet.mints, newMint],
        balance: 0,
        proofs: [],
        lastUpdated: Date.now(),
        privkey: wallet.privkey,
      };
      
      createWallet(updatedWalletData);

      // Clear input
      setNewMint("");
      setError(null);
    } catch {
      setError("Invalid mint URL");
    }
  };

  const handleRemoveMint = (mintUrl: string) => {
    if (!wallet || !wallet.mints) {
      setError("No mints found");
      return;
    }

    // Don't allow removing the last mint
    if (wallet.mints.length <= 1) {
      setError("Cannot remove the last mint");
      return;
    }

    try {
      // Remove mint from wallet
      const updatedWalletData: CashuWalletStruct = {
        id: crypto.randomUUID(),
        name: 'My Wallet',
        unit: 'sat',
        mints: wallet.mints.filter((m) => m !== mintUrl),
        balance: 0,
        proofs: [],
        lastUpdated: Date.now(),
        privkey: wallet.privkey,
      };
      
      createWallet(updatedWalletData);
    } catch {
      setError("Failed to remove mint");
    }

    // If removing the active mint, set the first available mint as active
    if (cashuStore.activeMintUrl === mintUrl) {
      const remainingMints = wallet.mints.filter((m) => m !== mintUrl);
      if (remainingMints.length > 0) {
        cashuStore.setActiveMintUrl(remainingMints[0]);
      }
    }

    // remove the mint from the cashuStore.mints array
    cashuStore.mints = cashuStore.mints.filter((m) => m.url !== mintUrl);

    // Close expanded view if open
    if (expandedMint === mintUrl) {
      setExpandedMint(null);
    }
  };

  const handleCleanSpentProofs = async (mintUrl: string) => {
    if (!wallet || !wallet.mints) return;
    if (!cashuStore.activeMintUrl) return;
    const spentProofs = await cleanSpentProofs(mintUrl);
    const proofSum = spentProofs.reduce((sum, proof) => sum + proof.amount, 0);
    console.log(
      `Removed ${spentProofs.length} spent proofs for ${proofSum} sats`
    );
  };

  // Set active mint when clicking on a mint
  const handleSetActiveMint = (mintUrl: string) => {
    cashuStore.setActiveMintUrl(mintUrl);
  };

  const toggleExpandMint = (mintUrl: string) => {
    if (expandedMint === mintUrl) {
      setExpandedMint(null);
    } else {
      setExpandedMint(mintUrl);
    }
  };

  const cleanMintUrl = (mintUrl: string) => {
    return mintUrl.replace("https://", "");
  };

  if (isLoading || isCreatingWallet) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Mints</CardTitle>
            <CardDescription>Loading wallet...</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Mints</CardTitle>
            <CardDescription>You don't have a Cashu wallet yet</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={() => handleCreateWallet(undefined)} disabled={!user}>
            Create Wallet
          </Button>
          {!user && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to log in to create a wallet
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Mints</CardTitle>
          <CardDescription>Manage your Cashu mints</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => walletUiStore.toggleCardExpansion("mints")}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Mints</h3>
            </div>
            <div>
              {wallet.mints && wallet.mints.length > 0 ? (
                <div className="space-y-2">
                  {wallet.mints.map((mint) => {
                    const amount = totalBalance; // Show total wallet balance for each mint
                    const isActive = cashuStore.activeMintUrl === mint;
                    const isExpanded = expandedMint === mint;

                    return (
                      <div key={mint} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-sm hover:text-primary text-left truncate max-w-[160px]"
                              onClick={() => handleSetActiveMint(mint)}
                            >
                              {cleanMintUrl(mint)}
                            </button>
                            {isActive && (
                              <Badge
                                variant="secondary"
                                className="h-5 px-1.5 bg-green-100 text-green-700 hover:bg-green-200"
                              >
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium tabular-nums ${
                                flashingMints[mint] || flashingMints['total'] ? "flash-update" : ""
                              }`}
                            >
                              {showSats
                                ? formatBalance(amount)
                                : btcPrice
                                ? formatUSD(satsToUSD(amount, btcPrice.USD))
                                : formatBalance(amount)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => toggleExpandMint(mint)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="pl-4 flex justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCleanSpentProofs(mint)}
                              className="border-muted-foreground/20 hover:bg-muted"
                            >
                              <Eraser className="h-4 w-4 mr-1 text-amber-500" />
                              Cleanup Wallet
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMint(mint)}
                              className="border-muted-foreground/20 hover:bg-destructive/10"
                            >
                              <Trash className="h-4 w-4 mr-1 text-destructive" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  No mints added yet
                </p>
              )}
            </div>

            <Separator />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-end gap-2">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="mint">Add Mint</Label>
                <Input
                  id="mint"
                  placeholder="https://mint.example.com"
                  value={newMint}
                  onChange={(e) => setNewMint(e.target.value)}
                />
              </div>
              <Button onClick={handleAddMint}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}