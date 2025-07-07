import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bitcoin, Loader2 } from 'lucide-react';

interface BitcoinConnectCardProps {
  isConnecting: boolean;
  onConnect: () => void;
}

const BitcoinConnectCard = ({ isConnecting, onConnect }: BitcoinConnectCardProps) => {
  return (
    <Card className="bg-card border">
      <CardHeader className="pb-3">
        <div className="text-lg flex items-center space-x-2">
          <Bitcoin className="w-5 h-5 text-orange-400" />
          <CardTitle className="text-base">Bitcoin Connect</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground">
          Connect your Bitcoin Lightning wallet directly
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Bitcoin className="w-4 h-4 mr-2" />
              Connect Bitcoin Lightning Wallet
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BitcoinConnectCard;
