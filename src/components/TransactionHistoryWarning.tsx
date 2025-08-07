import { useState, useEffect } from 'react';
import { AlertTriangle, Info, Settings, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RelayManagementDialog } from '@/components/RelayManagementDialog';
import { useAppContext } from '@/hooks/useAppContext';
import { useCashuHistory } from '@/hooks/useCashuHistory';
import { useNostr } from '@nostrify/react';

interface TransactionHistoryWarningProps {
  className?: string;
  trigger?: React.ReactNode;
  compact?: boolean;
}

export function TransactionHistoryWarning({ className, trigger, compact = false }: TransactionHistoryWarningProps) {
  const { config } = useAppContext();
  const { transactions, refetch } = useCashuHistory();
  const { nostr } = useNostr();
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [relayStats, setRelayStats] = useState<Record<string, number>>({});

  // Known popular relays that might have transaction history
  const popularRelays = [
    'wss://relay.chorus.community',
    'wss://relay.nostr.band',
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://ditto.pub/relay',
  ];

  // Check which relays are currently configured
  const configuredRelays = config.relayUrls || [];
  const missingPopularRelays = popularRelays.filter(relay => !configuredRelays.includes(relay));

  // Detect potential issues with transaction history
  const hasOnlyReceiveTransactions = transactions.length > 0 && 
    transactions.every(t => ['receive', 'nutzap_receive', 'mint'].includes(t.type));
  
  const hasOnlySendTransactions = transactions.length > 0 && 
    transactions.every(t => ['send', 'nutzap_send', 'melt'].includes(t.type));
  
  const hasVeryFewTransactions = transactions.length > 0 && transactions.length < 3;
  const hasNoTransactions = transactions.length === 0;

  // Check relay coverage
  useEffect(() => {
    async function checkRelayCoverage() {
      if (!nostr) return;
      
      const stats: Record<string, number> = {};
      
      // Test a quick query on each configured relay to see response time/availability
      await Promise.allSettled(
        configuredRelays.map(async (relayUrl) => {
          try {
            const start = Date.now();
            await nostr.query([{ kinds: [7375], limit: 1 }], { 
              signal: AbortSignal.timeout(3000) 
            });
            stats[relayUrl] = Date.now() - start;
          } catch (error) {
            stats[relayUrl] = -1; // Indicates error
          }
        })
      );
      
      setRelayStats(stats);
      setLastCheck(new Date());
    }

    checkRelayCoverage();
  }, [configuredRelays, nostr]);

  // Determine what type of warning to show
  const shouldShowWarning = hasNoTransactions || 
    hasOnlyReceiveTransactions || 
    hasOnlySendTransactions || 
    hasVeryFewTransactions ||
    missingPopularRelays.length > 0;

  if (!shouldShowWarning) {
    return null;
  }

  const getWarningLevel = () => {
    if (hasNoTransactions) return 'destructive';
    if (hasOnlyReceiveTransactions || hasOnlySendTransactions) return 'default';
    return 'default';
  };

  const getWarningTitle = () => {
    if (hasNoTransactions) return 'No Transaction History Found';
    if (hasOnlyReceiveTransactions) return 'Missing Sent Transaction History';
    if (hasOnlySendTransactions) return 'Missing Received Transaction History';
    if (hasVeryFewTransactions) return 'Limited Transaction History';
    return 'Incomplete Transaction History';
  };

  const getWarningDescription = () => {
    if (hasNoTransactions) {
      return 'Your transaction history appears to be empty. This might be because your transactions are stored on different Nostr relays.';
    }
    if (hasOnlyReceiveTransactions) {
      return 'You have received transactions but no sent transactions are showing. Your sent transactions might be on different relays.';
    }
    if (hasOnlySendTransactions) {
      return 'You have sent transactions but no received transactions are showing. Your received transactions might be on different relays.';
    }
    if (hasVeryFewTransactions) {
      return 'You have very few transactions showing. You might have more transaction history on other relays.';
    }
    return 'Your transaction history might be incomplete.';
  };

  const warningContent = (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-sm mb-1">{getWarningTitle()}</h4>
        <p className="text-sm text-muted-foreground">{getWarningDescription()}</p>
        <Badge variant="outline" className="text-xs mt-2">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh History
        </Button>
        
        <RelayManagementDialog
          trigger={
            <Button size="sm" variant="outline" className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Manage Relays
            </Button>
          }
        />
        
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="ghost" className="flex items-center gap-1 text-xs">
              <Info className="h-3 w-3" />
              {isExpanded ? 'Hide' : 'Show'} Details
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Relay Configuration Help
                </CardTitle>
                <CardDescription className="text-xs">
                  Transaction history is stored across different Nostr relays. Adding more relays can help you find missing transactions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Currently Connected Relays:</h4>
                  <div className="space-y-1">
                    {configuredRelays.map((relay) => (
                      <div key={relay} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{relay}</span>
                        <Badge 
                          variant={relayStats[relay] === -1 ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {relayStats[relay] === -1 
                            ? 'Error' 
                            : relayStats[relay] 
                              ? `${relayStats[relay]}ms`
                              : 'Checking...'
                          }
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {missingPopularRelays.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Popular Relays Not Connected:</h4>
                    <div className="space-y-1">
                      {missingPopularRelays.map((relay) => (
                        <div key={relay} className="text-xs font-mono text-muted-foreground">
                          {relay}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Consider adding these relays to your configuration to find more transaction history.
                    </p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Why does this happen?</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Different Nostr apps use different default relays</li>
                    <li>Transaction history is stored where you were connected when the transaction occurred</li>
                    <li>Some apps like Chorus use specific relays for transaction storage</li>
                    <li>Adding more relays increases the chance of finding all your history</li>
                  </ul>
                </div>

                {lastCheck && (
                  <div className="text-xs text-muted-foreground">
                    Last checked: {lastCheck.toLocaleTimeString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );

  // Compact mode with popover dropdown
  if (compact && trigger) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          {warningContent}
        </PopoverContent>
      </Popover>
    );
  }

  // Regular mode with full alert
  return (
    <div className={className}>
      <Alert variant={getWarningLevel()}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          {getWarningTitle()}
          <Badge variant="outline" className="text-xs">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </Badge>
        </AlertTitle>
        <AlertDescription className="mt-2">
          {warningContent}
        </AlertDescription>
      </Alert>
    </div>
  );
}
