import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DebugSection } from '@/components/debug/DebugSection';
import { Loader2, Search, CheckCircle2, XCircle, AlertCircle, Video } from 'lucide-react';

interface RelayResults {
  [relayUrl: string]: {
    status: 'checking' | 'found' | 'empty' | 'error';
    count: number;
    error?: string;
  };
}

export function VideoStorageDebug() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<RelayResults | null>(null);

  const RELAYS_TO_CHECK = [
    'wss://relay.chorus.community',
    'wss://relay.nostr.band',
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://nos.lol',
    'wss://relay.snort.social',
    'wss://nostr.wine',
    'wss://purplepag.es',
  ];

  const checkVideoStorage = async () => {
    if (!user) return;

    setIsChecking(true);
    const relayResults: RelayResults = {};

    // Initialize all relays as checking
    RELAYS_TO_CHECK.forEach(relay => {
      relayResults[relay] = { status: 'checking', count: 0 };
    });
    setResults({ ...relayResults });

    // Check each relay individually
    for (const relayUrl of RELAYS_TO_CHECK) {
      try {
        console.log(`[VideoDebug] Checking ${relayUrl}...`);
        
        const relay = nostr.relay(relayUrl);
        const events = await relay.query(
          [
            {
              kinds: [21, 22], // NIP-71 video events
              authors: [user.pubkey],
              limit: 50
            }
          ],
          { signal: AbortSignal.timeout(8000) }
        );

        relayResults[relayUrl] = {
          status: events.length > 0 ? 'found' : 'empty',
          count: events.length
        };

        console.log(`[VideoDebug] ${relayUrl}: ${events.length} events`);
      } catch (error) {
        console.error(`[VideoDebug] ${relayUrl} error:`, error);
        relayResults[relayUrl] = {
          status: 'error',
          count: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Update UI after each relay check
      setResults({ ...relayResults });
    }

    setIsChecking(false);
  };

  const totalVideos = results ? Object.values(results).reduce((sum, r) => sum + r.count, 0) : 0;
  const relaysWithVideos = results ? Object.values(results).filter(r => r.status === 'found').length : 0;

  // Generate data for copy functionality
  const debugData = results ? {
    timestamp: new Date().toISOString(),
    totalVideos,
    relaysWithVideos,
    totalRelaysChecked: RELAYS_TO_CHECK.length,
    results
  } : null;

  if (!user) {
    return (
      <DebugSection
        title="Video Storage Debug"
        icon={<Video className="h-4 w-4" />}
        isExpanded={isExpanded}
        onExpandedChange={setIsExpanded}
        copyData={null}
      >
        <div className={`text-muted-foreground text-center py-4 ${isMobile ? 'text-sm' : ''}`}>
          Video storage debugging requires user login
        </div>
      </DebugSection>
    );
  }

  return (
    <DebugSection
      title="Video Storage Debug"
      icon={<Video className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      copyData={debugData}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={checkVideoStorage}
            disabled={isChecking}
            className="gap-2"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Check Video Storage
              </>
            )}
          </Button>

          {results && !isChecking && (
            <div className="text-sm text-muted-foreground">
              {totalVideos} videos found across {relaysWithVideos}/{RELAYS_TO_CHECK.length} relays
            </div>
          )}
        </div>

        {results && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Relay Results:</div>
            {RELAYS_TO_CHECK.map(relayUrl => {
              const result = results[relayUrl];
              const relayName = relayUrl.replace('wss://', '').replace('/', '');

              return (
                <div
                  key={relayUrl}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {result.status === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {result.status === 'found' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {result.status === 'empty' && (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    {result.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}

                    <span className="text-sm font-mono">{relayName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {result.status === 'found' && (
                      <Badge variant="default">{result.count} videos</Badge>
                    )}
                    {result.status === 'empty' && (
                      <Badge variant="secondary">Empty</Badge>
                    )}
                    {result.status === 'error' && (
                      <Badge variant="destructive">Error</Badge>
                    )}
                    {result.status === 'checking' && (
                      <Badge variant="outline">Checking...</Badge>
                    )}
                  </div>
                </div>
              );
            })}

            {!isChecking && totalVideos === 0 && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium text-destructive">
                  ❌ No videos found on any relay
                </p>
                <p className="text-sm text-muted-foreground">
                  Possible reasons:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>You haven't uploaded any videos yet</li>
                  <li>Your videos were published to different relays not in this list</li>
                  <li>Recently published videos haven't propagated yet (wait 1-2 minutes)</li>
                </ul>
              </div>
            )}

            {!isChecking && totalVideos > 0 && relaysWithVideos < RELAYS_TO_CHECK.length / 2 && (
              <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-2">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-500">
                  ⚠️ Limited relay coverage
                </p>
                <p className="text-sm text-muted-foreground">
                  Your videos are only on {relaysWithVideos} of {RELAYS_TO_CHECK.length} checked relays. 
                  This may limit discoverability. Consider publishing to more relays for better reach.
                </p>
              </div>
            )}

            {!isChecking && totalVideos > 0 && relaysWithVideos >= RELAYS_TO_CHECK.length / 2 && (
              <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
                <p className="text-sm font-medium text-green-600 dark:text-green-500">
                  ✅ Good relay coverage
                </p>
                <p className="text-sm text-muted-foreground">
                  Your videos are replicated across {relaysWithVideos} relays. This provides good 
                  discoverability and redundancy.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DebugSection>
  );
}
