import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bitcoin, Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';

interface BitcoinConnectCardProps {
  isConnecting: boolean;
  onConnect: () => void;
  isConnected?: boolean;
  onDisconnect?: () => void;
  userHasLightningAccess?: boolean;
  onEnableNWC?: () => void;
}

const BitcoinConnectCard = ({
  isConnecting,
  onConnect,
  isConnected = false,
  onDisconnect,
  userHasLightningAccess = false,
  onEnableNWC
}: BitcoinConnectCardProps) => {
  // If user doesn't have Lightning access, show NWC option
  if (!userHasLightningAccess) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700 opacity-60">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-500/20 rounded-lg">
            <Bitcoin className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-300">Bitcoin Connect</h3>
            <p className="text-sm text-gray-400">
              No Lightning wallet connected for this account
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onEnableNWC && (
            <Button
              onClick={onEnableNWC}
              variant="outline"
              size="sm"
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400"
            >
              <Zap className="w-4 h-4 mr-2" />
              Enable NWC
            </Button>
          )}
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unavailable
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <Bitcoin className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">Bitcoin Connect</h3>
          <p className="text-sm text-gray-400">
            {isConnected ? "Your Bitcoin Lightning wallet is connected" : "Connect your Bitcoin Lightning wallet directly"}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {isConnected ? (
          <>
            {onDisconnect && (
              <Button
                onClick={onDisconnect}
                variant="ghost"
                size="sm"
                className="text-pink-400 hover:text-pink-300 hover:bg-pink-400/10"
              >
                disconnect
              </Button>
            )}
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default BitcoinConnectCard;
