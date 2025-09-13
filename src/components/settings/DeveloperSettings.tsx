import { SettingsSection } from "./SettingsSection";
import { LoginDebugInfo } from "@/components/LoginDebugInfo";
import { CashuStoreDebug } from "@/components/CashuStoreDebug";
import { WalletDebugInfo } from "@/components/WalletDebugInfo";
import { useIsMobile } from "@/hooks/useIsMobile";

export function DeveloperSettings() {
  const isMobile = useIsMobile();

  return (
    <SettingsSection 
      title="Developer" 
      className={`${isMobile ? 'space-y-3 p-4' : 'space-y-4 p-6'}`}
    >
      <div className={`space-y-6 ${isMobile ? 'space-y-4' : ''}`}>
        <div className="space-y-4">
          <h3 className={`font-medium text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Authentication Debug</h3>
          <div className={isMobile ? 'text-sm' : ''}>
            <LoginDebugInfo />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className={`font-medium text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Cashu Store Debug</h3>
          <div className={isMobile ? 'text-sm' : ''}>
            <CashuStoreDebug />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className={`font-medium text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Wallet Debug</h3>
          <div className={isMobile ? 'text-sm' : ''}>
            <WalletDebugInfo />
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
