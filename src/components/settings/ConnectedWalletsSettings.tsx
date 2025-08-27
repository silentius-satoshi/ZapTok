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
  onBitcoinConnect: () => Promise<void>;
  onNostrWalletConnect: () => Promise<void>;
  isConnected: boolean;
  onDisconnect: () => Promise<void>;
  onTestConnection: () => Promise<void>;
  onEnableNWC?: () => void;
}

export function ConnectedWalletsSettings({
  isConnecting,
  onBitcoinConnect,
  onNostrWalletConnect,
  isConnected,
  onDisconnect,
  onTestConnection,
  onEnableNWC
}: ConnectedWalletsSettingsProps) {
  const { userHasLightningAccess, walletInfo } = useWallet();
  const { isConnected: nwcConnected } = useNWC(); // Add NWC connection detection
  const { user } = useCurrentUser();
  const { logins } = useNostrLogin();
  const isMobile = useIsMobile();

  // Get the current user's login type from the login objects
  const currentUserLogin = logins.find(login => login.pubkey === user?.pubkey);
  const loginType = currentUserLogin?.type;

  // Detect signer type based on login type and constructor name
  const isExtensionSigner = loginType === 'extension' || !!(window.nostr && user?.signer?.constructor?.name?.includes('NIP07'));
  const isBunkerSigner = loginType === 'bunker' || 
                        loginType === 'x-bunker-nostr-tools' ||
                        user?.signer?.constructor?.name?.includes('bunker');
  const isNsecSigner = loginType === 'nsec' || 
                      user?.signer?.constructor?.name?.includes('nsec');

  // Debug: Log signer detection for troubleshooting
  console.log('[ConnectedWalletsSettings] Signer Detection Debug:', {
    loginType,
    signerConstructorName: user?.signer?.constructor?.name,
    isExtensionSigner,
    isBunkerSigner,
    isNsecSigner,
    userPubkey: user?.pubkey?.slice(0, 8) + '...',
    isMobile
  });

  // Detect current Lightning connection type
  const hasBitcoinConnect = userHasLightningAccess && walletInfo?.implementation === 'WebLN';
  const hasNWC = nwcConnected; // Use actual NWC connection state

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
        {/* Bitcoin Connect - Show Enhanced for bunker/nsec, Standard for extension */}
        {shouldShowEnhancedBitcoinConnect ? (
          <EnhancedBitcoinConnectCard
            onTestConnection={onTestConnection}
            disabled={bitcoinConnectDisabled}
            disabledReason={getBitcoinConnectDisabledReason()}
          />
        ) : shouldShowStandardBitcoinConnect ? (
          <BitcoinConnectCard
            isConnecting={isConnecting === 'btc'}
            onConnect={onBitcoinConnect}
            isConnected={isConnected}
            onDisconnect={onDisconnect}
            onTestConnection={onTestConnection}
            userHasLightningAccess={userHasLightningAccess}
            onEnableNWC={onEnableNWC}
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

        {/* Cashu Wallet - Always available regardless of Lightning connection */}
        <CashuRelaySettings alwaysExpanded={true} />
      </div>
    </SettingsSection>
  );
}
