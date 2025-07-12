import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, Link } from 'lucide-react';

interface NostrWalletConnectCardProps {
  isConnecting: boolean;
  onConnect: () => void;
}

const NostrWalletConnectCard = ({ isConnecting, onConnect }: NostrWalletConnectCardProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <QrCode className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">Nostr Wallet Connect</h3>
          <p className="text-sm text-gray-400">
            Connect an external wallet that supports NWC
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

export default NostrWalletConnectCard;
