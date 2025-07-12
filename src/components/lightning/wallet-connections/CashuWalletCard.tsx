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
        <Button 
          onClick={onConnect}
          disabled={isConnecting}
          className="bg-pink-500 hover:bg-pink-600 text-white px-6"
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
