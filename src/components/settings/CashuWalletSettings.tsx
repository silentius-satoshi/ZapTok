import { CashuRelaySettings } from './CashuRelaySettings';
import { SettingsSection } from './SettingsSection';
import { useWallet } from '@/hooks/useWallet';
import { LightningWalletInfo } from '@/components/LightningWalletInfo';
import { CashuWalletInfo } from '@/components/CashuWalletInfo';
import { CashuDebugInfo } from '@/components/CashuDebugInfo';
import { useCashuPreferences } from '@/hooks/useCashuPreferences';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CashuWalletSettings() {
  const { isCashuCompatible, isExtensionSigner } = useWallet();
  const { cashuEnabled, toggleCashuEnabled } = useCashuPreferences();

  return (
    <SettingsSection
      description="Manage your Lightning & Cashu wallet:"
    >
      <div className="space-y-6">
        {/* Cashu Feature Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cashu Features</CardTitle>
            <CardDescription>
              Control visibility of Cashu-related features throughout the app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Enable Cashu Features</div>
                <div className="text-sm text-muted-foreground">
                  Show nutzap buttons, Cashu balance, and wallet integration
                </div>
              </div>
              <Switch
                checked={cashuEnabled}
                onCheckedChange={toggleCashuEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lightning Wallet Info - Only show for extension signers */}
        {isExtensionSigner && (
          <div>
            <h3 className="text-sm font-medium mb-2">Lightning Wallet</h3>
            <LightningWalletInfo />
          </div>
        )}

        {/* Cashu Wallet - Only show if Cashu is enabled and compatible */}
        {cashuEnabled && isCashuCompatible && (
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