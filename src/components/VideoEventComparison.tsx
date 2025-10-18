import { useState, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DebugSection } from '@/components/debug/DebugSection';
import { FileVideo } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface VideoEventDetails {
  event: NostrEvent;
  kind: number;
  createdAt: Date;
  hasTitle: boolean;
  hasPublishedAt: boolean;
  hasImeta: boolean;
  hasTTags: boolean;
  tags: string[][];
  contentLength: number;
  relaysCounted: number;
}

export function VideoEventComparison() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<VideoEventDetails[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyzeEvent = async (event: NostrEvent, relaysCounted: number): Promise<VideoEventDetails> => {
    const hasTitle = event.tags.some(([name]) => name === 'title');
    const hasPublishedAt = event.tags.some(([name]) => name === 'published_at');
    const hasImeta = event.tags.some(([name]) => name === 'imeta');
    const hasTTags = event.tags.some(([name]) => name === 't');

    return {
      event,
      kind: event.kind,
      createdAt: new Date(event.created_at * 1000),
      hasTitle,
      hasPublishedAt,
      hasImeta,
      hasTTags,
      tags: event.tags,
      contentLength: event.content?.length || 0,
      relaysCounted
    };
  };

  const fetchVideoEvents = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setEvents([]);

    try {
      console.log('🔍 Fetching video events from relay.nostr.band...');
      
      // Query relay.nostr.band specifically (it had 6 videos in previous check)
      const relay = nostr.relay('wss://relay.nostr.band');
      const signal = AbortSignal.timeout(10000);
      
      const videoEvents = await relay.query(
        [{
          kinds: [21, 22],
          authors: [user.pubkey],
          limit: 10 // Get last 10 videos
        }],
        { signal }
      );

      console.log(`✅ Found ${videoEvents.length} video events`);

      // Sort by created_at DESC (most recent first)
      const sortedEvents = videoEvents.sort((a, b) => b.created_at - a.created_at);

      // Analyze all events
      const analyzed = await Promise.all(
        sortedEvents.map(event => analyzeEvent(event, 1))
      );

      setEvents(analyzed);

    } catch (err) {
      console.error('❌ Error fetching video events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchVideoEvents();
    }
  }, [user?.pubkey]);

  const getTagValue = (tags: string[][], tagName: string): string => {
    return tags.find(([name]) => name === tagName)?.[1] || 'N/A';
  };

  const getImetaFields = (tags: string[][]): string[] => {
    const imetaTag = tags.find(([name]) => name === 'imeta');
    if (!imetaTag) return [];
    return imetaTag.slice(1).map(field => field.split(' ')[0]); // Extract field names like "url", "m", "x", etc.
  };

  // Generate data for copy functionality
  const debugData = events.length > 0 ? {
    timestamp: new Date().toISOString(),
    totalEvents: events.length,
    summary: {
      withImeta: events.filter(e => e.hasImeta).length,
      withPublishedAt: events.filter(e => e.hasPublishedAt).length,
      withTitle: events.filter(e => e.hasTitle).length,
    },
    events: events.map(e => ({
      id: e.event.id,
      kind: e.kind,
      createdAt: e.createdAt.toISOString(),
      hasTitle: e.hasTitle,
      hasPublishedAt: e.hasPublishedAt,
      hasImeta: e.hasImeta,
      hasTTags: e.hasTTags,
    }))
  } : null;

  if (!user) {
    return (
      <DebugSection
        title="Video Event Comparison"
        icon={<FileVideo className="h-4 w-4" />}
        isExpanded={isExpanded}
        onExpandedChange={setIsExpanded}
        copyData={null}
      >
        <div className={`text-muted-foreground text-center py-4 ${isMobile ? 'text-sm' : ''}`}>
          Video event comparison requires user login
        </div>
      </DebugSection>
    );
  }

  return (
    <DebugSection
      title="Video Event Comparison"
      icon={<FileVideo className="h-4 w-4" />}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      copyData={debugData}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchVideoEvents}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          {events.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Found {events.length} video events
            </span>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading video events...
          </div>
        )}

        {!isLoading && events.length === 0 && !error && (
          <div className="text-center py-8 text-muted-foreground">
            No video events found
          </div>
        )}

        <div className="space-y-6">
          {events.map((details, index) => (
            <div key={details.event.id}>
              <Card className={index === 0 ? 'border-2 border-blue-500' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          Video #{events.length - index}
                        </CardTitle>
                        {index === 0 && (
                          <Badge variant="default">Most Recent</Badge>
                        )}
                        <Badge variant="outline">Kind {details.kind}</Badge>
                      </div>
                      <CardDescription className="text-xs font-mono">
                        {details.createdAt.toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Event ID */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Event ID</p>
                    <p className="text-xs font-mono break-all">{details.event.id}</p>
                  </div>

                  {/* Required Tags Check */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">NIP-71 Required Tags</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={details.hasTitle ? 'default' : 'destructive'}>
                        title: {details.hasTitle ? '✓' : '✗'}
                      </Badge>
                      <Badge variant={details.hasPublishedAt ? 'default' : 'destructive'}>
                        published_at: {details.hasPublishedAt ? '✓' : '✗'}
                      </Badge>
                      <Badge variant={details.hasImeta ? 'default' : 'destructive'}>
                        imeta: {details.hasImeta ? '✓' : '✗'}
                      </Badge>
                      <Badge variant={details.hasTTags ? 'default' : 'secondary'}>
                        t tags: {details.hasTTags ? '✓' : '✗'}
                      </Badge>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Title</p>
                    <p className="text-sm">{getTagValue(details.tags, 'title')}</p>
                  </div>

                  {/* Content Length */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Content Length</p>
                    <p className="text-sm">{details.contentLength} characters</p>
                  </div>

                  {/* Imeta Fields */}
                  {details.hasImeta && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Imeta Fields</p>
                      <div className="flex flex-wrap gap-1">
                        {getImetaFields(details.tags).map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hashtags */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Hashtags (t tags)</p>
                    <div className="flex flex-wrap gap-1">
                      {details.tags
                        .filter(([name]) => name === 't')
                        .map(([_, value], i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            #{value}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  {/* Full Tag Count */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Total Tags</p>
                    <p className="text-sm">{details.tags.length} tags</p>
                  </div>
                </CardContent>
              </Card>
              {index < events.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
        </div>

        {events.length > 1 && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                <strong>Most Recent Event:</strong> Kind {events[0]?.kind}, {events[0]?.tags.length} tags
              </p>
              <p>
                <strong>Comparison:</strong> {events.filter(e => e.hasImeta).length}/{events.length} events have imeta tags
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                💡 All video events should have: title tag, published_at tag, imeta tag with video URL, and hashtags (t tags) for discoverability in the global feed.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DebugSection>
  );
}
