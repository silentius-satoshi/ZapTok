import { useState } from 'react';
import { Wallet, Zap, Coins, Eye, EyeOff, Database } from 'lucide-react';
import { useCashuStore } from '@/stores/cashuStore';
import { useSignerAnalysis } from '@/hooks/useSignerAnalysis';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { DebugSection } from '@/components/debug/DebugSection';
import { DebugInfoPanel } from '@/components/debug/DebugInfoPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatBalance } from '@/lib/cashu';
import { validateP2PKKeypair, deriveP2PKPubkey } from '@/lib/p2pk';

/**
 * Consolidated Cashu wallet debugging
 * Includes Cashu, Lightning, and P2PK advanced analysis
 */
export function CashuWalletDebug() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showP2PKDetails, setShowP2PKDetails] = useState(false);
  const [showRawProofs, setShowRawProofs] = useState(false);
  const { user } = useCurrentUser();
  const cashuStore = useCashuStore();
  const signerAnalysis = useSignerAnalysis();
  const isMobile = useIsMobile();

  // Calculate proof statistics
  const allProofs = cashuStore.proofs || [];
  const regularProofs = allProofs.filter(proof => !proof.secret?.startsWith('["P2PK",'));
  const p2pkProofs = allProofs.filter(proof => proof.secret?.startsWith('["P2PK",'));
  const totalBalance = allProofs.reduce((sum, proof) => sum + proof.amount, 0);

  // P2PK Analysis (Advanced)
  const senderP2PKPubkey = user && cashuStore.privkey ? deriveP2PKPubkey(cashuStore.privkey) : null;
  const isValidP2PK = user && cashuStore.privkey ? validateP2PKKeypair(cashuStore.privkey, senderP2PKPubkey || '') : false;

  // P2PK Proof Analysis
  const p2pkAnalysis = p2pkProofs.map((proof, index) => {
    const result: any = {
      index: index + 1,
      amount: proof.amount,
      id: proof.id.slice(0, 8) + '...',
      secret: '[P2PK Secret]',
    };

    try {
      if (proof.secret?.startsWith('["P2PK",')) {
        const secretArray = JSON.parse(proof.secret);
        if (secretArray.length >= 2) {
          result.p2pkData = {
            type: secretArray[0],
            pubkey: secretArray[1]?.slice(0, 8) + '...',
            conditions: secretArray.slice(2),
          };
        }
      }
    } catch (error) {
      result.parseError = 'Failed to parse P2PK secret';
    }

    return result;
  });

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
    p2pkAnalysis: user && cashuStore.privkey ? {
      isValidKeypair: isValidP2PK,
      senderPubkey: senderP2PKPubkey?.slice(0, 16) + '...',
      p2pkProofCount: p2pkProofs.length,
      regularProofCount: regularProofs.length,
    } : null,
    proofStatistics: {
      total: allProofs.length,
      totalValue: allProofs.reduce((sum, proof) => sum + proof.amount, 0),
      averageAmount: allProofs.length > 0 ? allProofs.reduce((sum, proof) => sum + proof.amount, 0) / allProofs.length : 0,
      amountDistribution: allProofs.reduce((dist, proof) => {
        dist[proof.amount] = (dist[proof.amount] || 0) + 1;
        return dist;
      }, {} as Record<number, number>),
    },
  };

  return (
    <DebugSection
      title="Cashu Wallet"
      icon={<Wallet className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
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

        {/* Advanced P2PK Analysis */}
        {user && cashuStore.privkey && (
          <div className="space-y-2">
            <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
              <Database className="inline h-4 w-4 mr-2" />
              P2PK Key Analysis
            </h4>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant={isValidP2PK ? 'default' : 'destructive'}>
                Keypair: {isValidP2PK ? 'Valid' : 'Invalid'}
              </Badge>
              <Badge variant="outline">
                P2PK Proofs: {p2pkProofs.length}
              </Badge>
              <Badge variant="outline">
                Regular Proofs: {regularProofs.length}
              </Badge>
            </div>

            {senderP2PKPubkey && (
              <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <div className="font-mono break-all">
                  Sender P2PK: {senderP2PKPubkey.slice(0, 32)}...
                </div>
              </div>
            )}

            {/* P2PK Proof Details */}
            {p2pkProofs.length > 0 && (
              <Collapsible open={showP2PKDetails} onOpenChange={setShowP2PKDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    {showP2PKDetails ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide P2PK Proof Details
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show P2PK Proof Details ({p2pkProofs.length})
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {p2pkAnalysis.map((proof, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Proof #{proof.index}</span>
                          <Badge variant="outline">{proof.amount} sats</Badge>
                        </div>
                        <div className={`text-xs text-muted-foreground font-mono ${isMobile ? 'text-xs' : ''}`}>
                          ID: {proof.id}
                        </div>
                        {proof.p2pkData && (
                          <div className={`text-xs ${isMobile ? 'text-xs' : ''}`}>
                            <div>Type: {proof.p2pkData.type}</div>
                            <div>Pubkey: {proof.p2pkData.pubkey}</div>
                            {proof.p2pkData.conditions.length > 0 && (
                              <div>Conditions: {proof.p2pkData.conditions.join(', ')}</div>
                            )}
                          </div>
                        )}
                        {proof.parseError && (
                          <div className="text-xs text-destructive">{proof.parseError}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Raw Proofs Display */}
        {allProofs.length > 0 && (
          <Collapsible open={showRawProofs} onOpenChange={setShowRawProofs}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                {showRawProofs ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Raw Proofs
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Raw Proofs ({allProofs.length})
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="text-xs font-mono bg-muted p-3 rounded-lg max-h-60 overflow-y-auto break-all">
                {JSON.stringify(allProofs, null, 2)}
              </div>
            </CollapsibleContent>
          </Collapsible>
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