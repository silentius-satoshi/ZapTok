import { useCashuWallet } from "@/hooks/useCashuWallet";
import { formatBalance } from "@/lib/cashu";
import { useBitcoinPrice, satsToUSD, formatUSD } from "@/hooks/useBitcoinPrice";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrencyDisplayStore } from "@/stores/currencyDisplayStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function CashuWalletInfo() {
  const { user } = useCurrentUser();
  const { wallet, isLoading, totalBalance } = useCashuWallet();
  const { data: btcPrice } = useBitcoinPrice();
  const { showSats } = useCurrencyDisplayStore();
  const navigate = useNavigate();

  // Use reactive balance value directly

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cashu Wallet</CardTitle>
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
          <CardTitle className="text-sm">Cashu Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              No Cashu wallet configured
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/cashu-wallet')}
              className="w-full"
            >
              Go to Cashu Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          Cashu Wallet
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
              {formatBalance(totalBalance)}
            </div>
            {btcPrice && !showSats && (
              <div className="text-xs text-muted-foreground">
                {formatUSD(satsToUSD(totalBalance, btcPrice.USD))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}