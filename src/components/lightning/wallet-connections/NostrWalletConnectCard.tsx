import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Zap, Loader2, ExternalLink, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useNWC } from '@/hooks/useNWC';
import { isValidNWCURI } from '@/lib/nwc-utils';

interface NostrWalletConnectCardProps {
  isConnecting: boolean;
  onConnect: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

const NostrWalletConnectCard = ({
  isConnecting: _externalIsConnecting,
  onConnect: externalOnConnect,
  disabled = false,
  disabledReason = "Another wallet is connected"
}: NostrWalletConnectCardProps) => {
  const [connectionURI, setConnectionURI] = useState('');
  const [alias, setAlias] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showConnectionForm, setShowConnectionForm] = useState(false);

  const {
    connections,
    currentConnection: _currentConnection,
    addConnection,
    removeConnection,
    isConnecting,
    refreshWallet,
    testConnection
  } = useNWC();

  const handleConnect = async () => {
    if (!connectionURI.trim()) {
      setError('Please enter a connection URI');
      return;
    }

    if (!isValidNWCURI(connectionURI)) {
      setError('Invalid NWC URI format');
      return;
    }

    setError(null);

    try {
      await addConnection(connectionURI, alias || undefined);
      setConnectionURI('');
      setAlias('');
      setShowConnectionForm(false);
      externalOnConnect(); // Call the external handler for UI feedback
    } catch (err) {
      console.error('Failed to connect NWC wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const handleRemove = async (connectionId: string) => {
    removeConnection(connectionId);
  };

  const handleTest = async (connectionId: string) => {
    await testConnection(connectionId);
  };

  const handleRefresh = async (connectionId: string) => {
    await refreshWallet(connectionId);
  };

  if (connections.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            Nostr Wallet Connect
          </h3>
          <Button
            onClick={() => setShowConnectionForm(true)}
            variant="outline"
            size="sm"
          >
            Add Connection
          </Button>
        </div>

        {connections.map((connection) => (
          <div
            key={connection.id}
            className="p-4 bg-gray-900 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Wallet className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">{connection.alias}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={connection.isConnected ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {connection.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    {connection.balance !== undefined && (
                      <span className="text-sm text-gray-400">
                        {connection.balance.toLocaleString()} sats
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleTest(connection.id)}
                  variant="ghost"
                  size="sm"
                  disabled={isConnecting !== null}
                >
                  Test
                </Button>
                <Button
                  onClick={() => handleRefresh(connection.id)}
                  variant="ghost"
                  size="sm"
                  disabled={isConnecting !== null}
                >
                  Refresh
                </Button>
                <Button
                  onClick={() => handleRemove(connection.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </Button>
              </div>
            </div>

            {connection.walletInfo && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Network:</span>
                    <span className="ml-2 text-white">{connection.walletInfo.network}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Methods:</span>
                    <span className="ml-2 text-white">{connection.walletInfo.methods.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {showConnectionForm && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 space-y-4">
            <h4 className="font-medium text-white">Add NWC Connection</h4>

            <div className="space-y-3">
              <div>
                <Label htmlFor="nwc-uri">Connection URI</Label>
                <Input
                  id="nwc-uri"
                  value={connectionURI}
                  onChange={(e) => setConnectionURI(e.target.value)}
                  placeholder="nostr+walletconnect://..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="nwc-alias">Alias (optional)</Label>
                <Input
                  id="nwc-alias"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="My Lightning Wallet"
                  className="mt-1"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => {
                  setShowConnectionForm(false);
                  setError(null);
                  setConnectionURI('');
                  setAlias('');
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={isConnecting !== null}
                size="sm"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      disabled
        ? 'bg-gray-800/50 border-gray-700/50 opacity-60'
        : 'bg-gray-900 border-gray-700'
    }`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${
          disabled
            ? 'bg-gray-600/20'
            : 'bg-orange-500/20'
        }`}>
          <Zap className={`w-6 h-6 ${
            disabled
              ? 'text-gray-500'
              : 'text-orange-400'
          }`} />
        </div>
        <div>
          <h3 className={`font-medium ${
            disabled
              ? 'text-gray-500'
              : 'text-white'
          }`}>
            Nostr Wallet Connect
          </h3>
          <p className={`text-sm ${
            disabled
              ? 'text-gray-600'
              : 'text-gray-400'
          }`}>
            {disabled
              ? disabledReason
              : 'Connect via NWC protocol for secure Lightning payments'
            }
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <a
          href="https://nwc.getalby.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs flex items-center ${
            disabled
              ? 'text-gray-600 pointer-events-none'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Learn More <ExternalLink className="w-3 h-3 ml-1" />
        </a>
        <Button
          onClick={() => setShowConnectionForm(true)}
          disabled={disabled || isConnecting !== null}
          className={`px-6 ${
            disabled
              ? 'bg-gray-600 text-gray-500 cursor-not-allowed hover:bg-gray-600'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
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
