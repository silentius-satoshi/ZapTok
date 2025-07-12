import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Zap, Unlink } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function WalletConnect() {
  const { isConnected, connect, disconnect, provider } = useWallet();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      await connect();
      toast({
        title: "Wallet Connected! ⚡",
        description: "Your Lightning wallet is now connected",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  if (isConnected && provider) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Wallet Connected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Ready to send Lightning payments ⚡
              </p>
            </div>
            <Button 
              onClick={handleDisconnect}
              variant="outline"
              className="w-full"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button onClick={handleConnect} className="w-full max-w-md">
      <Wallet className="h-4 w-4 mr-2" />
      Connect Lightning Wallet
    </Button>
  );
}
