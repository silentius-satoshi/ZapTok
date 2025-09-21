import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCashuStore } from '@/stores/cashuStore';
import { formatBalance } from '@/lib/cashu';

/**
 * Debug component for Cashu store state
 * STUB IMPLEMENTATION - Basic debug info display
 */
export function CashuStoreDebug() {
  const cashuStore = useCashuStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cashu Store Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Active Mint:</strong> {cashuStore.activeMintUrl || 'None'}
          </div>
          <div>
            <strong>Total Proofs:</strong> {cashuStore.proofs.length}
          </div>
          <div>
            <strong>Total Balance:</strong> {formatBalance(
              cashuStore.getTotalBalance()
            )}
          </div>
          <div>
            <strong>Mints:</strong>
            <ul className="list-disc list-inside ml-2">
              {cashuStore.mints.map((mint, index) => (
                <li key={index}>{typeof mint === 'string' ? mint : mint.url || String(mint)}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}