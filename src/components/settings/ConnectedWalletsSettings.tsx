import BitcoinConnectCard from '@/components/lightning/wallet-connections/BitcoinConnectCard';
import { EnhancedBitcoinConnectCard } from '@/components/lightning/wallet-connections/EnhancedBitcoinConnectCard';
import NostrWalletConnectCard from '@/components/lightning/wallet-connections/NostrWalletConnectCard';
import { CashuRelaySettings } from './CashuRelaySettings';
import { SettingsSection } from './SettingsSection';
import { useWallet } from '@/hooks/useWallet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsMobile } from '@/hooks/useIsMobile';

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
  const { userHasLightningAccess } = useWallet();
  const { user } = useCurrentUser();
  const isMobile = useIsMobile();

  // Check if user qualifies for enhanced Bitcoin Connect
  // Target: Mobile PWA users with bunker or nsec login types (non-extension users)
  const shouldUseEnhancedBitcoinConnect = isMobile && user && (
    user.signer?.constructor?.name?.includes('bunker') ||
    user.signer?.constructor?.name?.includes('nsec') ||
    // Check login type from user data if available
    (user as any)?.loginType === 'bunker' ||
    (user as any)?.loginType === 'nsec' ||
    (user as any)?.loginType === 'x-bunker-nostr-tools' ||
    // Fallback: if no extension wallet detected, assume non-extension user
    !window.nostr
  );

  return (
    <SettingsSection
      description="To enable zapping from the ZapTok web app, connect a wallet:"
    >
      <div className="space-y-3">
        {shouldUseEnhancedBitcoinConnect ? (
          // Enhanced Bitcoin Connect for mobile PWA users with bunker/nsec
          <EnhancedBitcoinConnectCard onTestConnection={onTestConnection} />
        ) : (
          // Standard Bitcoin Connect for extension users
          <BitcoinConnectCard
            isConnecting={isConnecting === 'btc'}
            onConnect={onBitcoinConnect}
            isConnected={isConnected}
            onDisconnect={onDisconnect}
            onTestConnection={onTestConnection}
            userHasLightningAccess={userHasLightningAccess}
            onEnableNWC={onEnableNWC}
          />
        )}

        <NostrWalletConnectCard
          isConnecting={isConnecting === 'nwc'}
          onConnect={onNostrWalletConnect}
          disabled={isConnected}
          disabledReason="Browser extension wallet is connected"
        />

        <CashuRelaySettings alwaysExpanded={true} />
      </div>
    </SettingsSection>
  );
}
