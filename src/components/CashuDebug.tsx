import { useCashuStore } from '@/stores/cashuStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CashuDebug() {
  const cashuStore = useCashuStore();
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Cashu Debug Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold">Wallets ({cashuStore.wallets.length}):</h4>
            <pre className="bg-muted text-muted-foreground p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(cashuStore.wallets.map(w => ({
                id: w.id,
                name: w.name,
                mints: w.mints,
                balance: w.balance,
                proofsCount: w.proofs?.length || 0,
                proofs: w.proofs
              })), null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold">Mints ({cashuStore.mints.length}):</h4>
            <pre className="bg-muted text-muted-foreground p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(cashuStore.mints.map(m => ({
                url: m.url,
                isActive: m.isActive,
                keysetsCount: m.keysets?.length || 0,
                keysets: m.keysets?.map(k => ({ id: k.id, unit: k.unit })) || []
              })), null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold">All Proofs ({cashuStore.proofs.length}):</h4>
            <pre className="bg-muted text-muted-foreground p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(cashuStore.proofs.map(p => ({
                id: p.id,
                amount: p.amount,
                secret: p.secret.substring(0, 10) + '...'
              })), null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold">Active Mint URL:</h4>
            <p>{cashuStore.activeMintUrl || 'None'}</p>
          </div>
          
          <div>
            <h4 className="font-semibold">Proof Event Map ({cashuStore.proofEventMap.size}):</h4>
            <pre className="bg-muted text-muted-foreground p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(Array.from(cashuStore.proofEventMap.entries()).map(([secret, eventId]) => ({
                secret: secret.substring(0, 10) + '...',
                eventId
              })), null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
