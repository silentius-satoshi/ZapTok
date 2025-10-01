import { SettingsSection } from './SettingsSection';
import { AdvancedRelaySettings } from './AdvancedRelaySettings';
import { RelaySetList } from './RelaySetList';
import { AddNewRelaySet } from './AddNewRelaySet';
import { FavoriteRelayList } from './FavoriteRelayList';
import { AddNewRelay } from './AddNewRelay';
import { useIsMobile } from '@/hooks/useIsMobile';

export function NetworkSettings() {
  const isMobile = useIsMobile();

  return (
    <SettingsSection className={`space-y-6 ${isMobile ? 'px-4 pt-4 pb-4' : 'px-6 pt-6 pb-6'}`}>
      {/* Favorite Relays Section */}
      <div className="space-y-6">
        {/* Relay Sets Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Relay Sets</h3>
            <p className="text-sm text-gray-400 mb-4">
              Organize your favorite relays into named collections for easy reference.
            </p>
          </div>
          
          <RelaySetList />
          <AddNewRelaySet />
        </div>

        {/* Individual Favorite Relays Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">My Favorite Relays</h3>
            <p className="text-sm text-gray-400 mb-4">
              Star individual relays you want to remember or reference later.
            </p>
          </div>
          
          <FavoriteRelayList />
          <AddNewRelay />
        </div>
      </div>

      {/* Advanced Relay Management */}
      <div className={`${isMobile ? 'px-4 pb-4' : 'px-6 pb-6'}`}>
        <AdvancedRelaySettings />
      </div>
    </SettingsSection>
  );
}