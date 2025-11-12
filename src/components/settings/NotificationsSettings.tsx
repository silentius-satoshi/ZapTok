import { SettingsSection } from "./SettingsSection";
import { PushNotifications } from "@/components/PushNotifications";

export function NotificationsSettings() {
  return (
    <SettingsSection title="Notifications">
      <div className="space-y-6">
        {/* Push Notifications - Active functionality */}
        <PushNotifications />
      </div>
    </SettingsSection>
  );
}
