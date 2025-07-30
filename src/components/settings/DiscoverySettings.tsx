import { SettingsSection } from "./SettingsSection";

export function DiscoverySettings() {
  return (
    <SettingsSection 
      title="Discovery"
      description="Configure how you discover new content and users on the network."
    >
      <div className="space-y-6">
        {/* Content Discovery */}
        <div>
          <h4 className="text-white font-medium mb-4">Content Discovery</h4>
          <div className="space-y-4 opacity-60">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Enable trending hashtags</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Show popular videos</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Personalized recommendations</span>
            </div>
          </div>
        </div>

        {/* User Discovery */}
        <div>
          <h4 className="text-white font-medium mb-4">User Discovery</h4>
          <div className="space-y-4 opacity-60">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Suggest users to follow</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Show users based on mutual connections</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Display creator profiles in search</span>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div>
          <h4 className="text-white font-medium mb-4">Search & Filters</h4>
          <div className="space-y-4 opacity-60">
            <div>
              <label className="text-gray-500 mb-2 block">Default search scope</label>
              <select
                disabled
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
              >
                <option>Global network</option>
                <option>Following only</option>
                <option>Current relay</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Enable content warnings filter</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
              />
              <span className="text-gray-500">Show search suggestions</span>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
