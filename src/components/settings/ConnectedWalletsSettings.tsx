import BitcoinConnectCard from '@/components/lightning/wallet-connections/BitcoinConnectCard';
import { EnhancedBitcoinConnectCard } from '@/components/lightning/wallet-connections/EnhancedBitcoinConnectCard';
import NostrWalletConnectCard from '@/components/lightning/wallet-connections/NostrWalletConnectCard';
import { CashuRelaySettings } from './CashuRelaySettings';
import { SettingsSection } from './SettingsSection';
import { useWallet } from '@/hooks/useWallet';
import { useNWC } from '@/hooks/useNWC';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useNostrLogin } from '@nostrify/react/login';

interface ConnectedWalletsSettingsProps {
  isConnecting: string | null;
  onNostrWalletConnect: () => Promise<void>;
  onTestConnection: () => Promise<void>;
  onEnableNWC?: () => void;
}

export function ConnectedWalletsSettings({
  isConnecting,
  onNostrWalletConnect,
  onTestConnection,
  onEnableNWC
}: ConnectedWalletsSettingsProps) {
  const { userHasLightningAccess, walletInfo, isBunkerSigner, isCashuCompatible, isExtensionSigner, isConnected } = useWallet();
  const { isConnected: nwcConnected } = useNWC(); // Add NWC connection detection
  const { user } = useCurrentUser();
  const isMobile = useIsMobile();

  // Detect nsec signer type (still needed locally)
  const { logins } = useNostrLogin();
  const currentUserLogin = logins.find(login => login.pubkey === user?.pubkey);
  const isNsecSigner = currentUserLogin?.type === 'nsec' ||
                      user?.signer?.constructor?.name?.includes('nsec');

  // Debug: Log signer detection for troubleshooting
  console.log('[ConnectedWalletsSettings] Signer Detection Debug (using WalletContext):', {
    loginType: currentUserLogin?.type,
    signerConstructorName: user?.signer?.constructor?.name,
    isExtensionSigner,
    isBunkerSigner,
    isNsecSigner,
    isCashuCompatible,
    userPubkey: user?.pubkey?.slice(0, 8) + '...',
    isMobile
  });

  // Detect current Lightning connection type with enhanced Bitcoin Connect detection
  const hasBitcoinConnect = userHasLightningAccess && 
    (walletInfo?.implementation === 'WebLN' || 
     (isConnected && !!(window as any).__bitcoinConnectActive) ||
     (!!(window as any).__bitcoinConnectActive));  // Check the flag directly
  const hasNWC = nwcConnected; // Use actual NWC connection state

  // Debug logging for wallet connection detection
  console.log('[ConnectedWalletsSettings] Wallet Connection Detection Debug:', {
    userHasLightningAccess,
    walletInfo,
    hasBitcoinConnect,
    hasNWC,
    hasWindowWebln: !!window.webln,
    weblnConstructor: window.webln?.constructor?.name
  });

  // Determine which components to show based on signer type and current connections
  const shouldShowEnhancedBitcoinConnect = isBunkerSigner || isNsecSigner; // Show Enhanced for all bunker/nsec signers
  const shouldShowStandardBitcoinConnect = isExtensionSigner; // Only show Standard for extension signers

  // Apply mutual exclusivity rules
  const bitcoinConnectDisabled = hasNWC; // Rule 3 & 5: If NWC connected, disable Bitcoin Connect
  const nwcDisabled = hasBitcoinConnect; // Rule 2 & 4: If Bitcoin Connect is active, disable NWC

  // Determine disabled reasons
  const getBitcoinConnectDisabledReason = () => {
    if (hasNWC) return "Nostr Wallet Connect is already connected";
    return undefined;
  };

  const getNWCDisabledReason = () => {
    if (hasBitcoinConnect) return "Bitcoin Connect is already connected";
    return undefined;
  };

  // Override userHasLightningAccess for bunker signers - they should always be able to connect via Bitcoin Connect
  const shouldAllowBitcoinConnect = isBunkerSigner || userHasLightningAccess;

  return (
    <SettingsSection
      description="To enable zapping from the ZapTok web app, connect a wallet:"
    >
      <div className="space-y-3">
        {/* Debug Panel - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-xs">
            <h4 className="font-medium text-orange-400 mb-2">🔧 Debug: Wallet Connection Status</h4>
            <div className="space-y-1 text-gray-300">
              <div>userHasLightningAccess: <span className="text-blue-400">{userHasLightningAccess.toString()}</span></div>
              <div>walletInfo?.implementation: <span className="text-blue-400">{walletInfo?.implementation || 'none'}</span></div>
              <div>walletInfo?.balance: <span className="text-blue-400">{walletInfo?.balance || 0} sats</span></div>
              <div>hasBitcoinConnect: <span className="text-blue-400">{hasBitcoinConnect.toString()}</span></div>
              <div>hasNWC: <span className="text-blue-400">{hasNWC.toString()}</span></div>
              <div>window.webln available: <span className="text-blue-400">{(!!window.webln).toString()}</span></div>
              <div>WebLN constructor: <span className="text-blue-400">{window.webln?.constructor?.name || 'none'}</span></div>
              
              {/* Bitcoin Connect specific debugging */}
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="text-yellow-400 font-medium">Bitcoin Connect Debug:</div>
                <div>__bitcoinConnectActive: <span className="text-green-400">{((window as any).__bitcoinConnectActive || false).toString()}</span></div>
                <div>__bitcoinConnectWebLN: <span className="text-green-400">{(!!(window as any).__bitcoinConnectWebLN).toString()}</span></div>
                <div>BC provider constructor: <span className="text-green-400">{(window as any).__bitcoinConnectWebLN?.constructor?.name || 'none'}</span></div>
                
                {/* Show which provider would be used for balance operations */}
                <div className="mt-1">
                  <span className="text-orange-400">Balance provider would be: </span>
                  <span className="text-cyan-400">
                    {(window as any).__bitcoinConnectActive && (window as any).__bitcoinConnectWebLN 
                      ? 'Bitcoin Connect WebLN' 
                      : 'Standard WebLN'}
                  </span>
                </div>
                
                {/* Provider conflict warning */}
                {(window as any).__bitcoinConnectActive && window.webln?.constructor?.name === 'i' && (
                  <div className="text-red-400 mt-1">⚠️ Alby extension detected - using BC provider to avoid conflicts</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bitcoin Connect - Show Enhanced for bunker/nsec, Standard for extension */}
        {shouldShowEnhancedBitcoinConnect ? (
          <EnhancedBitcoinConnectCard
            disabled={bitcoinConnectDisabled}
            disabledReason={getBitcoinConnectDisabledReason()}
          />
        ) : shouldShowStandardBitcoinConnect ? (
          <BitcoinConnectCard
            disabled={bitcoinConnectDisabled}
            disabledReason={getBitcoinConnectDisabledReason()}
          />
        ) : null}

        {/* Nostr Wallet Connect - Only show for extension and nsec signers (NOT bunker) */}
        {(isExtensionSigner || isNsecSigner) && !isBunkerSigner && (
          <NostrWalletConnectCard
            isConnecting={isConnecting === 'nwc'}
            onConnect={onNostrWalletConnect}
            disabled={nwcDisabled}
            disabledReason={getNWCDisabledReason()}
          />
        )}

        {/* Cashu Wallet - Use centralized compatibility check from WalletContext */}
        {isCashuCompatible && (
          <CashuRelaySettings alwaysExpanded={true} />
        )}
      </div>
    </SettingsSection>
  );
}
