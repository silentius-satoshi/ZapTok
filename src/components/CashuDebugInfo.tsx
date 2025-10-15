import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Bug, Zap, Gift, Coins } from 'lucide-react';
import { useCashuStore } from '@/stores/cashuStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { validateP2PKKeypair, deriveP2PKPubkey } from '@/lib/p2pk';
import { formatBalance } from '@/lib/cashu';

export function CashuDebugInfo() {
  const { user } = useCurrentUser();
  const cashuStore = useCashuStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isP2PKAnalysisExpanded, setIsP2PKAnalysisExpanded] = useState(false);
  const [isProofAnalysisExpanded, setIsProofAnalysisExpanded] = useState(false);

  if (!user || !cashuStore.privkey) {
    return null;
  }

  // P2PK Analysis
  const senderP2PKPubkey = deriveP2PKPubkey(cashuStore.privkey);
  const isValidP2PK = validateP2PKKeypair(cashuStore.privkey, senderP2PKPubkey);

  // Proof Analysis
  const allProofs = cashuStore.proofs || [];
  const regularProofs = allProofs.filter(proof => {
    try {
      return !proof.secret?.startsWith('["P2PK",');
    } catch {
      return true;
    }
  });

  const p2pkProofs = allProofs.filter(proof => {
    try {
      return proof.secret?.startsWith('["P2PK",');
    } catch {
      return false;
    }
  });

    // P2PK Proof Analysis
    const analysis = p2pkProofs.map((proof, index) => {
      const result: any = {
        index: index + 1,
        amount: proof.amount,
        id: proof.id,
        canAccess: false,
        lockedToPubkey: 'unknown',
        error: null
      };

      try {
        const [type, data] = JSON.parse(proof.secret);
        if (type === 'P2PK' && data.data) {
          result.lockedToPubkey = data.data;
          result.canAccess = data.data === senderP2PKPubkey;
          
          if (data.data !== senderP2PKPubkey) {
            result.error = 'PUBKEY_MISMATCH';
          }
        }
      } catch {
        result.error = 'PARSE_ERROR';
      }

      return result;
  });

  const accessibleP2PKAmount = analysis
    .filter(p => p.canAccess)
    .reduce((sum, p) => sum + p.amount, 0);

  const inaccessibleP2PKAmount = analysis
    .filter(p => !p.canAccess)
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <span>Cashu Debug Information</span>
            </div>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 mt-4">
          {/* P2PK Key Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                P2PK Key Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Private Key:</span>
                  <span className="font-mono text-xs">
                    {cashuStore.privkey.substring(0, 20)}...{cashuStore.privkey.substring(cashuStore.privkey.length - 10)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Derived Public Key:</span>
                  <span className="font-mono text-xs">{senderP2PKPubkey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Key Pair Valid:</span>
                  <Badge variant={isValidP2PK ? "default" : "destructive"} className="text-xs">
                    {isValidP2PK ? "Valid" : "Invalid"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="text-xs">
                    {senderP2PKPubkey.startsWith('02') ? 'Compressed (even)' : 
                     senderP2PKPubkey.startsWith('03') ? 'Compressed (odd)' : 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proof Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Coins className="h-4 w-4 text-green-500" />
                Proof Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Proofs:</span>
                    <span className="font-medium">{allProofs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Regular Proofs:</span>
                    <span className="font-medium">{regularProofs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P2PK Proofs:</span>
                    <span className="font-medium">{p2pkProofs.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Regular Amount:</span>
                    <span className="font-medium">
                      {formatBalance(regularProofs.reduce((sum, p) => sum + p.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P2PK Accessible:</span>
                    <span className="font-medium text-green-600">
                      {formatBalance(accessibleP2PKAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P2PK Inaccessible:</span>
                    <span className="font-medium text-red-600">
                      {formatBalance(inaccessibleP2PKAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* P2PK Proof Details */}
          {p2pkProofs.length > 0 && (
            <Collapsible open={isP2PKAnalysisExpanded} onOpenChange={setIsP2PKAnalysisExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-500" />
                    <span>P2PK Proof Details ({p2pkProofs.length})</span>
                  </div>
                  {isP2PKAnalysisExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-3">
                <Card>
                  <CardContent className="p-3">
                    <div className="space-y-3">
                      {analysis.map((proof, index) => (
                        <div key={index} className="border rounded-md p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                Proof #{proof.index} - {formatBalance(proof.amount)}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                ID: {proof.id}
                              </div>
                            </div>
                            <Badge 
                              variant={proof.canAccess ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              {proof.canAccess ? "Accessible" : "Locked"}
                            </Badge>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Locked to:</span>
                              <span className="font-mono break-all max-w-[200px]">
                                {proof.lockedToPubkey}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Our pubkey:</span>
                              <span className="font-mono break-all max-w-[200px]">
                                {senderP2PKPubkey}
                              </span>
                            </div>
                            {proof.error && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Error:</span>
                                <span className="text-red-600 font-medium">
                                  {proof.error === 'PUBKEY_MISMATCH' ? 'Pubkey Mismatch' : 'Parse Error'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Lightning Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                Lightning Payment Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="text-muted-foreground space-y-1">
                <p>• <strong>Regular proofs</strong> can be spent directly in Lightning payments</p>
                <p>• <strong>Accessible P2PK proofs</strong> will be unlocked automatically before Lightning payments</p>
                <p>• <strong>Inaccessible P2PK proofs</strong> cannot be used and will cause payment failures</p>
              </div>
              
              {inaccessibleP2PKAmount > 0 && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="text-red-800 dark:text-red-200 text-xs font-medium">
                    ⚠️ Warning: {formatBalance(inaccessibleP2PKAmount)} in inaccessible P2PK proofs
                  </div>
                  <div className="text-red-700 dark:text-red-300 text-xs mt-1">
                    These funds cannot be spent without the correct private key.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}