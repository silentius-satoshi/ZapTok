import { SettingsSection } from './SettingsSection';
import { BlossomServerListSettings } from './BlossomServerListSettings';

export function BlossomSettings() {
  return (
    <SettingsSection title="Blossom Media Storage">
      <div className="space-y-6">
        <BlossomServerListSettings />
      </div>
    </SettingsSection>
  );
}
