import { useState } from 'react';
import { CashuRelaySettings } from './CashuRelaySettings';
import { SettingsSection } from './SettingsSection';
import { useWallet } from '@/hooks/useWallet';
import { useCashuPreferences } from '@/hooks/useCashuPreferences';
import { CashuWalletInfo } from '@/components/CashuWalletInfo';
import { CashuDebugInfo } from '@/components/CashuDebugInfo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function CashuWalletSettings() {
  const { isCashuCompatible } = useWallet();
  const { cashuEnabled, setCashuEnabled } = useCashuPreferences();
  
  const [cashuWalletExpanded, setCashuWalletExpanded] = useState(false);
  const [cashuRelayExpanded, setCashuRelayExpanded] = useState(false);
  const [cashuDebugExpanded, setCashuDebugExpanded] = useState(false);

  return (
    <SettingsSection
      description="Manage your Cashu wallet:"
    >
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Show Cashu Features Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-base font-medium">Show Cashu Features</div>
              <div className="text-xs text-muted-foreground">
                Display Cashu Wallet and nutzap features throughout the app
              </div>
            </div>
            <Switch
              id="cashu-visibility"
              checked={cashuEnabled}
              onCheckedChange={setCashuEnabled}
            />
          </div>

          {/* Cashu Wallet - Only show if Cashu is enabled and compatible */}
          {cashuEnabled && isCashuCompatible && (
            <>
              {/* Cashu Wallet Info Collapsible */}
              <Collapsible open={cashuWalletExpanded} onOpenChange={setCashuWalletExpanded} className="pt-4 border-t">
                <CollapsibleTrigger className="flex items-center justify-between w-full group hover:bg-gray-800/50 transition-colors py-2 -mx-4 px-4 rounded">
                  <div className="flex-1 flex items-center justify-between">
                    <div className="text-sm font-medium">Cashu Wallet</div>
                    {cashuWalletExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <CashuWalletInfo />
                </CollapsibleContent>
              </Collapsible>

              {/* Cashu Relay Settings Collapsible */}
              <Collapsible open={cashuRelayExpanded} onOpenChange={setCashuRelayExpanded} className="pt-4 border-t">
                <CollapsibleTrigger className="flex items-center justify-between w-full group hover:bg-gray-800/50 transition-colors py-2 -mx-4 px-4 rounded">
                  <div className="flex-1 flex items-center justify-between">
                    <div className="text-sm font-medium">Cashu Relay Settings</div>
                    {cashuRelayExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <CashuRelaySettings alwaysExpanded={false} />
                </CollapsibleContent>
              </Collapsible>

              {/* Cashu Debug Info Collapsible */}
              <Collapsible open={cashuDebugExpanded} onOpenChange={setCashuDebugExpanded} className="pt-4 border-t">
                <CollapsibleTrigger className="flex items-center justify-between w-full group hover:bg-gray-800/50 transition-colors py-2 -mx-4 px-4 rounded">
                  <div className="flex-1 flex items-center justify-between">
                    <div className="text-sm font-medium">Cashu Debug Information</div>
                    {cashuDebugExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <CashuDebugInfo />
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </CardContent>
      </Card>
    </SettingsSection>
  );
}