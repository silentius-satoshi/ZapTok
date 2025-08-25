import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bitcoin, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button as BitcoinConnectButton, init, disconnect as bitcoinConnectDisconnect } from '@getalby/bitcoin-connect-react';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrLogin } from '@nostrify/react/login';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useBitcoinConnectConsent } from '@/hooks/useBitcoinConnectConsent';
import { BitcoinConnectConsentDialog } from '@/components/lightning/BitcoinConnectConsentDialog';

interface BitcoinConnectCardProps {
  onTestConnection?: () => Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
}

const BitcoinConnectCard = ({
  onTestConnection,
  disabled = false,
  disabledReason
}: BitcoinConnectCardProps) => {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { logins } = useNostrLogin();
  const {
    isConnected,
    userHasLightningAccess,
    connect,
    disconnect
  } = useWallet();

  // Use consent hook for bunker signers
  const {
    isDialogOpen,
    detectedWallet,
    signerType,
    isBunkerSigner,
    closeDialog,
    hasUserConsent,
    hasUserDeclined
  } = useBitcoinConnectConsent();

  // Initialize Bitcoin Connect only for appropriate signer types
  useEffect(() => {
    if (!user?.pubkey) return;

    // Get user's login type to determine signer type
    const currentUserLogin = logins.find(login => login.pubkey === user.pubkey);
    const loginType = currentUserLogin?.type;

    // Only initialize for bunker signers
    const isBunkerSigner = loginType === 'bunker' ||
                          loginType === 'x-bunker-nostr-tools' ||
                          user?.signer?.constructor?.name?.includes('bunker');

    if (isBunkerSigner) {
      console.log('[BitcoinConnect] Bunker signer detected, Bitcoin Connect will initialize on demand:', loginType);
      // Don't initialize here - let the Bitcoin Connect Button handle it
      // Consent dialog will handle any auto-connection scenarios
    } else {
      console.log('[BitcoinConnect] Non-bunker signer - Bitcoin Connect disabled:', loginType);
      // For non-bunker signers, ensure Bitcoin Connect is disconnected
      try {
        bitcoinConnectDisconnect();
        console.log('[BitcoinConnect] Disconnected Bitcoin Connect for non-bunker signer');
      } catch (error) {
        console.log('[BitcoinConnect] No active Bitcoin Connect connection to disconnect');
      }
    }
  }, [user?.pubkey, logins]);

  const handleConnected = async () => {
    try {
      // Initialize Bitcoin Connect with proper settings before handling connection
      init({
        appName: 'ZapTok',
        filters: ['nwc'],
        showBalance: false,
        autoConnect: false, // Ensure auto-connect is disabled
      });

      // Wait for window.webln to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      if (window.webln) {
        await connect(); // This will detect the new WebLN provider
        toast({
          title: "Wallet Connected",
          description: "Successfully connected your Lightning wallet",
        });
      } else {
        // Try again after a longer delay
        await new Promise(resolve => setTimeout(resolve, 500));
        if (window.webln) {
          await connect();
          toast({
            title: "Wallet Connected",
            description: "Successfully connected your Lightning wallet",
          });
        } else {
          throw new Error("WebLN provider not available after Bitcoin Connect");
        }
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnected = async () => {
    try {
      await disconnect();
      toast({
        title: "Wallet Disconnected",
        description: "Lightning wallet has been disconnected successfully",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };
  // If user doesn't have Lightning access, show unavailable state
  if (!userHasLightningAccess) {
    return (
      <div className={cn("flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700",
        disabled ? "opacity-30" : "opacity-60")}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-500/20 rounded-lg">
            <Bitcoin className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-300">Bitcoin Connect</h3>
            <p className="text-sm text-gray-400">
              {disabled && disabledReason ? disabledReason : "No Lightning wallet connected for this account"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            {disabled ? "Disabled" : "Unavailable"}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700",
      disabled && "opacity-50")}>
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <Bitcoin className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">Bitcoin Connect</h3>
          <p className="text-sm text-gray-400">
            {disabled && disabledReason ? disabledReason :
              isConnected ? "Your Bitcoin Lightning wallet is connected" : "Connect your Bitcoin Lightning wallet directly"}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {isConnected ? (
          <>
            <Button
              onClick={onTestConnection}
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
              disabled={disabled}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button
              onClick={handleDisconnected}
              variant="ghost"
              size="sm"
              className="text-pink-400 hover:text-pink-300 hover:bg-pink-400/10"
              disabled={disabled}
            >
              Disconnect
            </Button>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20">
              <CheckCircle className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </>
        ) : (
          <BitcoinConnectButton
            onConnected={handleConnected}
            onDisconnected={handleDisconnected}
          />
        )}
      </div>

      {/* Consent Dialog for Bunker Signers */}
      {isBunkerSigner && (
        <BitcoinConnectConsentDialog
          isOpen={isDialogOpen}
          onClose={closeDialog}
          detectedWallet={detectedWallet || undefined}
          signerType={signerType}
        />
      )}
    </div>
  );
};

export default BitcoinConnectCard;
