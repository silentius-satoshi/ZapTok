import { SettingsSection } from "./SettingsSection";
import { PWAActions } from "@/components/PWAActions";
import { LoginDebugInfo } from "@/components/LoginDebugInfo";

export function DeveloperSettings() {
  return (
    <SettingsSection title="Developer">
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">PWA & Service Worker</h3>
          <PWAActions />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Authentication Debug</h3>
          <LoginDebugInfo />
        </div>
      </div>
    </SettingsSection>
  );
}
