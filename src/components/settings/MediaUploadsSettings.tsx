import { Link } from 'lucide-react';
import { SettingsSection } from "./SettingsSection";

export function MediaUploadsSettings() {
  return (
    <SettingsSection title="Media Uploads">
      {/* Media Server Section */}
      <div className="space-y-4">
        <div>
          <h4 className="text-gray-400 font-medium mb-4">Media Server</h4>

          {/* Connected Server */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            <span className="text-gray-500">https://blossom.primal.net</span>
          </div>

          {/* Switch Media Server */}
          <div className="space-y-3">
            <p className="text-gray-500">Switch media server</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="enter blossom server url..."
                  disabled
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 placeholder-gray-600 cursor-not-allowed opacity-60"
                />
                <Link className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" />
              </div>
            </div>

            <button
              disabled
              className="text-gray-500 hover:text-gray-500 p-0 h-auto cursor-not-allowed opacity-60"
            >
              restore default media server
            </button>
          </div>
        </div>

        {/* Media Mirrors Section */}
        <div>
          <h4 className="text-gray-400 font-medium mb-4">Media Mirrors</h4>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enable-media-mirrors"
                disabled
                className="w-4 h-4 bg-gray-800 border border-gray-600 rounded cursor-not-allowed opacity-60"
              />
              <label htmlFor="enable-media-mirrors" className="text-gray-500 cursor-not-allowed">
                Enable media mirrors
              </label>
            </div>

            <p className="text-gray-500 text-sm">
              You can enable one or more media mirror servers. When enabled, your uploads to the primary media server will be automatically copied to the mirror(s).
            </p>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
