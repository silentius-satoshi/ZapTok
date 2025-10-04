import { CashuRelaySettings } from './CashuRelaySettings';
import { SettingsSection } from './SettingsSection';
import { useWallet } from '@/hooks/useWallet';
import { LightningWalletInfo } from '@/components/LightningWalletInfo';
import { CashuWalletInfo } from '@/components/CashuWalletInfo';
import { CashuDebugInfo } from '@/components/CashuDebugInfo';

export function CashuWalletSettings() {
  const { isCashuCompatible, isExtensionSigner } = useWallet();

  return (
    <SettingsSection
      description="Manage your Lightning & Cashu wallet:"
    >
      <div className="space-y-4">
        {/* Lightning Wallet Info - Only show for extension signers */}
        {isExtensionSigner && (
          <div>
            <h3 className="text-sm font-medium mb-2">Lightning Wallet</h3>
            <LightningWalletInfo />
          </div>
        )}

        {/* Cashu Wallet - Use centralized compatibility check from WalletContext */}
        {isCashuCompatible && (
          <div>
            <h3 className="text-sm font-medium mb-2">Cashu Wallet</h3>
            <CashuWalletInfo />
            <div className="mt-3">
              <CashuRelaySettings alwaysExpanded={true} />
            </div>
            <div className="mt-4">
              <CashuDebugInfo />
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}