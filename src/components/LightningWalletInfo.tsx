import { useWallet } from "@/hooks/useWallet";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LightningWalletInfo() {
  const { walletInfo, isConnected, isLoading } = useWallet();
  const { data: btcPrice } = useBitcoinPrice();
  const { showSats } = useCurrencyDisplayStore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lightning Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected || !walletInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lightning Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Not connected</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          Lightning Wallet
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
              {walletInfo.balance.toLocaleString()} sats
            </div>
            {btcPrice && !showSats && (
              <div className="text-xs text-muted-foreground">
                {formatUSD(satsToUSD(walletInfo.balance, btcPrice.usd))}
              </div>
            )}
          </div>
        </div>
        {walletInfo.alias && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Wallet:</span>
            <span className="text-sm font-medium">{walletInfo.alias}</span>
          </div>
        )}
        {walletInfo.implementation && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Type:</span>
            <span className="text-sm font-medium">{walletInfo.implementation}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}