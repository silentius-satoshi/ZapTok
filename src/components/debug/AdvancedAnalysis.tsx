import { useState } from 'react';
import { Database, Eye, EyeOff } from 'lucide-react';
import { useCashuStore } from '@/stores/cashuStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { DebugSection } from '@/components/debug/DebugSection';
import { DebugInfoPanel } from '@/components/debug/DebugInfoPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { validateP2PKKeypair, deriveP2PKPubkey } from '@/lib/p2pk';

/**
 * Advanced analysis section with detailed P2PK and comprehensive data
 * Includes functionality from CashuDebugInfo that was previously scattered
 */
export function AdvancedAnalysis() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showP2PKDetails, setShowP2PKDetails] = useState(false);
  const [showRawProofs, setShowRawProofs] = useState(false);
  const { user } = useCurrentUser();
  const cashuStore = useCashuStore();
  const isMobile = useIsMobile();

  if (!user || !cashuStore.privkey) {
    return (
      <DebugSection
        title="Advanced Analysis"
        icon={<Database className="h-4 w-4" />}
        isExpanded={isExpanded}
        onExpandedChange={setIsExpanded}
        copyData={null}
      >
        <div className={`text-muted-foreground text-center py-4 ${isMobile ? 'text-sm' : ''}`}>
          Advanced analysis requires user login with Cashu wallet
        </div>
      </DebugSection>
    );
  }

  // P2PK Analysis
  const senderP2PKPubkey = deriveP2PKPubkey(cashuStore.privkey);
  const isValidP2PK = validateP2PKKeypair(cashuStore.privkey, senderP2PKPubkey);

  // Proof Analysis
  const allProofs = cashuStore.proofs || [];
  const regularProofs = allProofs.filter(proof => !proof.secret?.startsWith('["P2PK",'));
  const p2pkProofs = allProofs.filter(proof => proof.secret?.startsWith('["P2PK",'));

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

  const advancedData = {
    p2pkAnalysis: {
      isValidKeypair: isValidP2PK,
      senderPubkey: senderP2PKPubkey?.slice(0, 16) + '...',
      p2pkProofCount: p2pkProofs.length,
      regularProofCount: regularProofs.length,
    },
    proofStatistics: {
      total: allProofs.length,
      totalValue: allProofs.reduce((sum, proof) => sum + proof.amount, 0),
      averageAmount: allProofs.length > 0 ? allProofs.reduce((sum, proof) => sum + proof.amount, 0) / allProofs.length : 0,
      amountDistribution: allProofs.reduce((dist, proof) => {
        dist[proof.amount] = (dist[proof.amount] || 0) + 1;
        return dist;
      }, {} as Record<number, number>),
    },
    // Don't include raw proofs in copy data for privacy
  };

  return (
    <DebugSection
      title="Advanced Analysis"
      icon={<Database className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      copyData={advancedData}
    >
      <div className="space-y-4">
        {/* P2PK Key Validation */}
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
            P2PK Key Analysis
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isValidP2PK ? 'default' : 'destructive'}>
              Keypair: {isValidP2PK ? 'Valid' : 'Invalid'}
            </Badge>
            {senderP2PKPubkey && (
              <Badge variant="outline" className="font-mono text-xs">
                {senderP2PKPubkey.slice(0, 16)}...
              </Badge>
            )}
          </div>
        </div>

        {/* Proof Statistics */}
        <div className="space-y-2">
          <h4 className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
            Proof Statistics
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Regular Proofs
              </div>
              <div className="font-mono">{regularProofs.length}</div>
            </div>
            <div className="space-y-1">
              <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                P2PK Proofs
              </div>
              <div className="font-mono">{p2pkProofs.length}</div>
            </div>
          </div>
        </div>

        {/* P2PK Proof Details */}
        {p2pkProofs.length > 0 && (
          <Collapsible open={showP2PKDetails} onOpenChange={setShowP2PKDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className={isMobile ? 'text-sm' : ''}>P2PK Proof Details</span>
                {showP2PKDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {p2pkAnalysis.map((analysis, index) => (
                <div key={index} className="border rounded-md p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      Proof #{analysis.index}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {analysis.amount} sats
                    </Badge>
                  </div>
                  <div className={`text-muted-foreground font-mono ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    ID: {analysis.id}
                  </div>
                  {analysis.p2pkData && (
                    <div className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      Pubkey: {analysis.p2pkData.pubkey}
                    </div>
                  )}
                  {analysis.parseError && (
                    <div className="text-destructive text-xs">
                      {analysis.parseError}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Raw Proof Data Toggle */}
        <Collapsible open={showRawProofs} onOpenChange={setShowRawProofs}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className={`text-destructive ${isMobile ? 'text-sm' : ''}`}>
                ⚠️ Show Raw Proof Data (Sensitive)
              </span>
              {showRawProofs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <DebugInfoPanel 
              title="⚠️ Raw Proof Data - Handle with Care" 
              data={{ proofs: allProofs }}
              defaultExpanded={false}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Summary Analysis */}
        <DebugInfoPanel 
          title="Advanced Analysis Summary" 
          data={advancedData} 
          defaultExpanded={false}
        />
      </div>
    </DebugSection>
  );
}