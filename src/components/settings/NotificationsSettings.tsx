import { SettingsSection } from "./SettingsSection";

export function NotificationsSettings() {
  return (
    <SettingsSection title="Notifications">
      <div className="space-y-6">
        {/* Show notifications for */}
        <div>
          <label className="text-white mb-4 block">Show notifications for:</label>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 opacity-60">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-2xl">👤</span>
              <span className="text-gray-500">New Followers</span>
            </div>

            <div className="flex items-center space-x-3 opacity-60">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-2xl">⚡</span>
              <span className="text-gray-500">Zaps</span>
            </div>

            <div className="flex items-center space-x-3 opacity-60">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-2xl">💖</span>
              <span className="text-gray-500">Reactions</span>
            </div>

            <div className="flex items-center space-x-3 opacity-60">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-2xl">🔄</span>
              <span className="text-gray-500">Reposts</span>
            </div>

            <div className="flex items-center space-x-3 opacity-60">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-2xl">💬</span>
              <span className="text-gray-500">Replies</span>
            </div>

            <div className="flex items-center space-x-3 opacity-60">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-2xl">🏷️</span>
              <span className="text-gray-500">Mentions</span>
            </div>
          </div>
        </div>

        {/* Notification preferences */}
        <div>
          <label className="text-white mb-4 block">Notification preferences:</label>
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
