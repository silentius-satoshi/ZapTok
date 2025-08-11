import { SettingsSection } from "./SettingsSection";
import { PushNotifications } from "@/components/PushNotifications";

export function NotificationsSettings() {
  return (
    <SettingsSection title="Notifications">
      <div className="space-y-6">
        {/* Push Notifications - Active functionality */}
        <PushNotifications />

        {/* Legacy notification preferences - Coming soon */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Additional Preferences</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Advanced notification filtering options coming soon
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3 opacity-60">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Ignore notes with more than 10 mentions</span>
            </div>

            <div className="flex items-center space-x-3 opacity-60">
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Only show DM notifications from users I follow</span>
            </div>

            <div className="flex items-center space-x-3 opacity-60">
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Only show reactions from users I follow</span>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
