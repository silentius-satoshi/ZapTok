import { AddNewRelay } from './AddNewRelay';
import { AddNewRelaySet } from './AddNewRelaySet';
import { FavoriteRelayList } from './FavoriteRelayList';
import { RelaySetList } from './RelaySetList';

export function FavoriteRelaysSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Relay Sets</h3>
        <div className="space-y-4">
          <RelaySetList />
          <AddNewRelaySet />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Favorite Relays</h3>
        <div className="space-y-4">
          <FavoriteRelayList />
          <AddNewRelay />
        </div>
      </div>
    </div>
  );
}