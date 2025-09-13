import { useCashuWallet } from "@/hooks/useCashuWallet";
import { formatBalance } from "@/lib/cashu";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserCashuStore } from "@/stores/userCashuStore";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function CashuWalletInfo() {
  const { user } = useCurrentUser();
  const { wallet, isLoading } = useCashuWallet();
  const userCashuStore = useUserCashuStore(user?.pubkey);
  const { data: btcPrice } = useBitcoinPrice();
  const { showSats } = useCurrencyDisplayStore();

  // Get wallet total balance from user-specific store
  const totalBalance = userCashuStore.getTotalBalance?.() || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cashu eCash Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cashu eCash Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No Cashu wallet configured</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          Cashu eCash Wallet
          <Badge variant="secondary" className="text-xs">
            Connected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Balance:</span>
          <div className="text-right">
            <div className="font-medium">
              {formatBalance(totalBalance)} sats
            </div>
            {btcPrice && !showSats && (
              <div className="text-xs text-muted-foreground">
                {formatUSD(satsToUSD(totalBalance, btcPrice.USD))}
              </div>
            )}
          </div>
        </div>
        {wallet.mints && wallet.mints.length > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Mints:</span>
            <span className="text-sm font-medium">{wallet.mints.length}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}