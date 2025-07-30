import { SettingsSection } from "./SettingsSection";

export function ZapsSettings() {
  return (
    <SettingsSection title="Zaps">
      <div className="space-y-6">
        {/* Set default zap amount */}
        <div>
          <label className="text-white mb-4 block">Set default zap amount:</label>
          <input
            type="number"
            defaultValue="1"
            disabled
            className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed opacity-60"
          />
        </div>

        {/* Set custom zap amount presets */}
        <div>
          <label className="text-white mb-4 block">Set custom zap amount presets:</label>
          <div className="space-y-3">
            {/* Zap preset items */}
            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
              <span className="text-2xl">⚡</span>
              <span className="text-gray-500 w-8">1</span>
              <span className="text-gray-500 flex-1">Here's a zap for ya</span>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
              <span className="text-2xl">🚀</span>
              <span className="text-gray-500 w-8">5</span>
              <span className="text-gray-500 flex-1"></span>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
              <span className="text-2xl">☕</span>
              <span className="text-gray-500 w-8">10</span>
              <span className="text-gray-500 flex-1">Coffee on me ☕</span>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
              <span className="text-2xl">🍻</span>
              <span className="text-gray-500 w-8">15</span>
              <span className="text-gray-500 flex-1">Cheers 🍻</span>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
              <span className="text-2xl">🍌</span>
              <span className="text-gray-500 w-8">20</span>
              <span className="text-gray-500 flex-1">#V4V ⚡</span>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700 opacity-60">
              <span className="text-2xl">🧑‍💼</span>
              <span className="text-gray-500 w-8">25</span>
              <span className="text-gray-500 flex-1"></span>
            </div>
          </div>
        </div>

        {/* Restore Default Feeds button */}
        <button
          disabled
          className="text-gray-500 hover:text-gray-500 p-0 h-auto cursor-not-allowed opacity-60"
        >
          Restore Default Feeds
        </button>
      </div>
    </SettingsSection>
  );
}
