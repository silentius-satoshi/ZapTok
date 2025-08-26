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
      console.log('[BitcoinConnect] Bitcoin Connect connected, initializing connection...');

      // PREEMPTIVE PROTECTION: Immediately mark Bitcoin Connect as active to prevent browser extension interference
      (window as any).__bitcoinConnectActive = true;

      // Store any existing browser extension WebLN before Bitcoin Connect overwrites it
      const existingWebLN = window.webln;
      if (existingWebLN && !existingWebLN.constructor?.name?.includes('BitcoinConnect')) {
        console.log('[BitcoinConnect] 🚨 Browser extension WebLN detected, storing reference:', existingWebLN.constructor?.name);
        (window as any).__browserExtensionWebLN = existingWebLN;
      }

      // Initialize Bitcoin Connect with proper settings
      init({
        appName: 'ZapTok',
        filters: ['nwc'],
        showBalance: false,
        autoConnect: false, // Ensure auto-connect is disabled
      });

      // Give Bitcoin Connect time to fully establish the NWC connection
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Multi-attempt connection with progressive delays
      const maxAttempts = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`[BitcoinConnect] Connection attempt ${attempt}/${maxAttempts}`);

          // Wait progressively longer for each attempt
          if (attempt > 1) {
            const delay = attempt * 1000; // 1s, 2s, 3s
            console.log(`[BitcoinConnect] Waiting ${delay}ms before attempt ${attempt}`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Check if WebLN is available
          if (!window.webln) {
            throw new Error(`WebLN provider not available (attempt ${attempt}/${maxAttempts})`);
          }

          console.log('[BitcoinConnect] WebLN available, testing connection...');

          // CRITICAL: Store a reference to Bitcoin Connect's WebLN to prevent browser extension override
          const bitcoinConnectWebLN = window.webln;
          (window as any).__bitcoinConnectWebLN = bitcoinConnectWebLN;

          // Set up a protection mechanism against browser extension override
          const protectBitcoinConnect = () => {
            if ((window as any).__bitcoinConnectActive && window.webln !== bitcoinConnectWebLN) {
              console.log('[BitcoinConnect] ⚠️ Browser extension tried to override Bitcoin Connect WebLN - restoring Bitcoin Connect');
              window.webln = bitcoinConnectWebLN;
            }
          };

          // Check for override attempts every 50ms for the first 10 seconds (more aggressive protection)
          const protectionInterval = setInterval(protectBitcoinConnect, 50);
          setTimeout(() => clearInterval(protectionInterval), 10000);

          // Test the connection
          await window.webln.enable();

          // Test basic functionality to ensure the connection is working
          if ('getInfo' in window.webln && typeof window.webln.getInfo === 'function') {
            try {
              const info = await (window.webln as any).getInfo();
              console.log('[BitcoinConnect] WebLN info:', info);
            } catch (infoError) {
              console.log('[BitcoinConnect] getInfo not available, continuing anyway');
            }
          }

          // Now that we've verified the connection works, connect via WalletContext
          await connect();

          toast({
            title: "Wallet Connected",
            description: "Successfully connected your Lightning wallet via Bitcoin Connect",
          });

          // Success! Break out of the retry loop
          return;

        } catch (attemptError) {
          lastError = attemptError instanceof Error ? attemptError : new Error(String(attemptError));
          console.error(`[BitcoinConnect] Attempt ${attempt} failed:`, lastError.message);
          
          // If this isn't the last attempt, continue to retry
          if (attempt < maxAttempts) {
            console.log(`[BitcoinConnect] Retrying connection (${maxAttempts - attempt} attempts remaining)...`);
            continue;
          }
        }
      }

      // If we get here, all attempts failed
      throw lastError || new Error("All connection attempts failed");

    } catch (error) {
      console.error('[BitcoinConnect] Connection failed:', error);
      
      // Clean up on failure
      (window as any).__bitcoinConnectActive = false;
      delete (window as any).__bitcoinConnectWebLN;
      
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnected = async () => {
    try {
      console.log('[BitcoinConnect] Disconnecting...');

      // First disable Bitcoin Connect protection
      (window as any).__bitcoinConnectActive = false;
      delete (window as any).__bitcoinConnectWebLN;

      // First disconnect via WalletContext
      await disconnect();

      // Then clear Bitcoin Connect's WebLN provider
      if (window.webln && 'disconnect' in window.webln && typeof window.webln.disconnect === 'function') {
        try {
          await window.webln.disconnect();
          console.log('[BitcoinConnect] Bitcoin Connect WebLN disconnected');
        } catch (bcDisconnectError) {
          console.warn('[BitcoinConnect] Bitcoin Connect disconnect failed:', bcDisconnectError);
        }
      }

      // Clear window.webln to prevent stale connections
      if (window.webln) {
        delete (window as any).webln;
        console.log('[BitcoinConnect] Cleared window.webln');
      }

      toast({
        title: "Wallet Disconnected",
        description: "Lightning wallet has been disconnected successfully",
        variant: "destructive",
      });
    } catch (error) {
      console.error('[BitcoinConnect] Disconnect failed:', error);
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
