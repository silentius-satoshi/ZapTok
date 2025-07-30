import { SettingsSection } from "./SettingsSection";

export function FeedsSettings() {
  return (
    <SettingsSection>
      <div className="space-y-8">
        {/* Following Feed Section */}
        <div>
          <h4 className="text-white font-medium mb-4">Following Feed</h4>
          <div className="space-y-4 opacity-60">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Show reposts in following feed</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Show replies in following feed</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Show reactions in following feed</span>
            </div>
          </div>
        </div>

        {/* Global Feed Section */}
        <div>
          <h4 className="text-white font-medium mb-4">Global Feed</h4>
          <div className="space-y-4 opacity-60">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Enable global feed discovery</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Filter explicit content in global feed</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Show trending content</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Limit global feed to specific hashtags</span>
            </div>
          </div>
        </div>

        {/* Feed Preferences */}
        <div>
          <h4 className="text-white font-medium mb-4">Feed Preferences</h4>
          <div className="space-y-4 opacity-60">
            <div>
              <label className="text-gray-500 mb-2 block">Default feed on app launch</label>
              <select
                disabled
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
              >
                <option>Following Feed</option>
                <option>Global Feed</option>
              </select>
            </div>
            
            <div>
              <label className="text-gray-500 mb-2 block">Feed refresh interval</label>
              <select
                disabled
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
              >
                <option>30 seconds</option>
                <option>1 minute</option>
                <option>5 minutes</option>
                <option>Manual only</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
