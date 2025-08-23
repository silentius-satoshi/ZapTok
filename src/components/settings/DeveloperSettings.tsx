import { SettingsSection } from "./SettingsSection";
import { PWAActions } from "@/components/PWAActions";
import { PWAInfo } from "@/components/PWAInfo";
import { LoginDebugInfo } from "@/components/LoginDebugInfo";
import { useIsMobile } from "@/hooks/useIsMobile";

export function DeveloperSettings() {
  const isMobile = useIsMobile();

  return (
    <SettingsSection title="Developer">
      <div className={`space-y-6 ${isMobile ? 'space-y-4' : ''}`}>
        <div className="space-y-4">
          <h3 className={`font-medium text-white ${isMobile ? 'text-base' : 'text-lg'}`}>PWA Status & Storage</h3>
          <div className={isMobile ? 'text-sm' : ''}>
            <PWAInfo />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className={`font-medium text-white ${isMobile ? 'text-base' : 'text-lg'}`}>PWA & Service Worker</h3>
          <div className={isMobile ? 'text-sm' : ''}>
            <PWAActions />
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className={`font-medium text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Authentication Debug</h3>
          <div className={isMobile ? 'text-sm' : ''}>
            <LoginDebugInfo />
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
