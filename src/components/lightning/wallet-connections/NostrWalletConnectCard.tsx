import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Loader2, QrCode, Link } from 'lucide-react';

interface NostrWalletConnectCardProps {
  isConnecting: boolean;
  onConnect: () => void;
}

const NostrWalletConnectCard = ({ isConnecting, onConnect }: NostrWalletConnectCardProps) => {
  return (
    <Card className="bg-card border">
      <CardHeader className="pb-3">
        <div className="text-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-base">Nostr Wallet Connect</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            Recommended
          </Badge>
        </div>
        <CardDescription className="text-sm">
          Connect via NWC protocol for seamless Nostr integration
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          onClick={onConnect}
          disabled={isConnecting}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Link className="w-4 h-4 mr-2" />
              Connect NWC
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Works with Alby, Zeus, and other NWC-compatible wallets
        </p>
      </CardContent>
    </Card>
  );
};

export default NostrWalletConnectCard;
