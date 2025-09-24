import { useState } from 'react';
import { Wallet, Zap, Coins } from 'lucide-react';
import { useCashuStore } from '@/stores/cashuStore';
import { useSignerAnalysis } from '@/hooks/useSignerAnalysis';
import { useIsMobile } from '@/hooks/useIsMobile';
import { DebugSection } from '@/components/debug/DebugSection';
import { DebugInfoPanel } from '@/components/debug/DebugInfoPanel';
import { Badge } from '@/components/ui/badge';
import { formatBalance } from '@/lib/cashu';

/**
 * Consolidated wallet and payments debugging
 * Merges CashuStoreDebug with payment-related info from LightningDebugInfo
 */
export function WalletPaymentsDebug() {
  const [isExpanded, setIsExpanded] = useState(false);
  const cashuStore = useCashuStore();
  const signerAnalysis = useSignerAnalysis();
  const isMobile = useIsMobile();

  // Calculate proof statistics
  const allProofs = cashuStore.proofs || [];
  const regularProofs = allProofs.filter(proof => !proof.secret?.startsWith('["P2PK",'));
  const p2pkProofs = allProofs.filter(proof => proof.secret?.startsWith('["P2PK",'));
  const totalBalance = allProofs.reduce((sum, proof) => sum + proof.amount, 0);

  const debugData = {
    cashuStore: {
      activeMintUrl: cashuStore.activeMintUrl,
      balance: totalBalance,
      proofCount: allProofs.length,
      regularProofs: regularProofs.length,
      p2pkProofs: p2pkProofs.length,
      privkey: cashuStore.privkey ? '[HIDDEN]' : null,
    },
    paymentCapabilities: {
      cashuCompatible: signerAnalysis.compatibility.cashu,
      lightningCompatible: signerAnalysis.compatibility.lightning,
      webLNAvailable: signerAnalysis.capabilities.webln,
      encryptionAvailable: signerAnalysis.capabilities.nip44,
    },
    signerType: signerAnalysis.signerType,
  };

  return (
    <DebugSection
      title="Wallet & Payments"
      icon={<Wallet className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      copyData={debugData}
    >
      <div className="space-y-4">
        {/* Cashu Wallet Status */}
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
            Cashu Wallet Status
          </h4>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant={cashuStore.activeMintUrl ? 'default' : 'outline'}>
              {cashuStore.activeMintUrl ? 'Connected' : 'No Active Mint'}
            </Badge>
            <Badge variant={allProofs.length > 0 ? 'default' : 'outline'}>
              {allProofs.length} Proofs
            </Badge>
            <Badge variant={totalBalance > 0 ? 'default' : 'outline'}>
              {formatBalance(totalBalance)}
            </Badge>
          </div>

          {cashuStore.activeMintUrl && (
            <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
              <div className="font-mono break-all">
                Mint: {cashuStore.activeMintUrl}
              </div>
            </div>
          )}
        </div>

        {/* Proof Breakdown */}
        {allProofs.length > 0 && (
          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
              Proof Analysis
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  Regular Proofs
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  <span>{regularProofs.length}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  P2PK Proofs
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>{p2pkProofs.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Compatibility */}
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
            Payment Capabilities
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant={signerAnalysis.compatibility.cashu ? 'default' : 'outline'}>
              Cashu: {signerAnalysis.compatibility.cashu ? 'Compatible' : 'Incompatible'}
            </Badge>
            <Badge variant={signerAnalysis.compatibility.lightning ? 'default' : 'outline'}>
              Lightning: {signerAnalysis.compatibility.lightning ? 'Available' : 'Unavailable'}
            </Badge>
            <Badge variant={signerAnalysis.capabilities.webln ? 'default' : 'outline'}>
              WebLN: {signerAnalysis.capabilities.webln ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </div>

        {/* WebLN Details */}
        {signerAnalysis.capabilities.webln && signerAnalysis.details.webLNProvider && (
          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
              WebLN Provider
            </h4>
            <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {signerAnalysis.details.webLNProvider}
            </div>
          </div>
        )}

        {/* Raw Debug Data */}
        <DebugInfoPanel 
          title="Raw Wallet Data" 
          data={debugData} 
          defaultExpanded={false}
        />
      </div>
    </DebugSection>
  );
}