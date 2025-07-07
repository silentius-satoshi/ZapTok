import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Loader2 } from 'lucide-react';

interface CashuWalletCardProps {
  isConnecting: boolean;
  onConnect: () => void;
}

const CashuWalletCard = ({ isConnecting, onConnect }: CashuWalletCardProps) => {
  return (
    <Card className="bg-card border">
      <CardHeader className="pb-3">
        <div className="text-lg flex items-center justify-between">
          <div className="text-lg flex items-center space-x-2">
            <Coins className="w-5 h-5 text-green-500" />
            <CardTitle className="text-base">Cashu Wallet</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            Private
          </Badge>
        </div>
        <CardDescription className="text-sm">
          Privacy-focused eCash for anonymous payments
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Coins className="w-4 h-4 mr-2" />
              Connect Cashu Wallet
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CashuWalletCard;
