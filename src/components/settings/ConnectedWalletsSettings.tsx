import BitcoinConnectCard from '@/components/lightning/wallet-connections/BitcoinConnectCard';
import NostrWalletConnectCard from '@/components/lightning/wallet-connections/NostrWalletConnectCard';
import { CashuRelaySettings } from './CashuRelaySettings';
import { SettingsSection } from './SettingsSection';

interface ConnectedWalletsSettingsProps {
  isConnecting: string | null;
  onBitcoinConnect: () => Promise<void>;
  onNostrWalletConnect: () => Promise<void>;
  isConnected: boolean;
  onDisconnect: () => Promise<void>;
}

export function ConnectedWalletsSettings({
  isConnecting,
  onBitcoinConnect,
  onNostrWalletConnect,
  isConnected,
  onDisconnect
}: ConnectedWalletsSettingsProps) {
  return (
    <SettingsSection 
      description="To enable zapping from the ZapTok web app, connect a wallet:"
    >
      <div className="space-y-3">
        <BitcoinConnectCard
          isConnecting={isConnecting === 'btc'}
          onConnect={onBitcoinConnect}
          isConnected={isConnected}
          onDisconnect={onDisconnect}
        />

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
