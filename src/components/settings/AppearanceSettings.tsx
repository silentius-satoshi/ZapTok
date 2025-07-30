import { SettingsSection } from "./SettingsSection";

export function AppearanceSettings() {
  return (
    <SettingsSection>
      <div className="space-y-6">
        {/* Select a theme */}
        <div>
          <label className="text-white mb-4 block">Select a theme</label>
          <div className="flex justify-between gap-2">
            {/* Bitcoin Orange */}
            <div className="relative opacity-60 flex-1">
              <div className="w-full aspect-square bg-black rounded-lg border-2 border-gray-700 flex items-center justify-center cursor-not-allowed">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-orange-500"></div>
              </div>
              <p className="text-gray-500 text-center mt-2 text-sm">bitcoin orange</p>
            </div>

            {/* Nostr Purple */}
            <div className="relative opacity-60 flex-1">
              <div className="w-full aspect-square bg-gray-200 rounded-lg border-2 border-gray-400 flex items-center justify-center cursor-not-allowed">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 via-red-500 to-purple-600"></div>
              </div>
              <p className="text-gray-500 text-center mt-2 text-sm">nostr purple</p>
            </div>

            {/* ZapTok Gradient - Selected */}
            <div className="relative opacity-60 flex-1">
              <div className="w-full aspect-square bg-black rounded-lg border-2 border-green-500 flex items-center justify-center cursor-not-allowed">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600"></div>
                <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-500 text-center mt-2 text-sm">zaptok gradient</p>
            </div>

            {/* Privacy Blue */}
            <div className="relative opacity-60 flex-1">
              <div className="w-full aspect-square bg-gray-200 rounded-lg border-2 border-gray-400 flex items-center justify-center cursor-not-allowed">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-cyan-500 to-purple-600"></div>
              </div>
              <p className="text-gray-500 text-center mt-2 text-sm">privacy blue</p>
            </div>
          </div>
        </div>

        {/* Show Animations */}
        <div className="flex items-center space-x-3 opacity-60">
          <input
            type="checkbox"
            defaultChecked
            disabled
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
          />
          <span className="text-gray-500">Show Animations</span>
        </div>

        {/* Automatically set Dark or Light mode */}
        <div className="flex items-center space-x-3 opacity-60">
          <input
            type="checkbox"
            disabled
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 cursor-not-allowed"
          />
          <span className="text-gray-500">Automatically set Dark or Light mode based on your system settings</span>
        </div>
      </div>
    </SettingsSection>
  );
}
