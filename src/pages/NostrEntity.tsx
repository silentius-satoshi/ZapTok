import { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { validateVideoEvent } from '@/lib/validateVideoEvent';
import { VideoCard } from '@/components/VideoCard';
import { VideoActionButtons } from '@/components/VideoActionButtons';
import { isYouTubeUrl } from '@/lib/youtubeEmbed';

export function NostrEntity() {
  const { nip19Id: identifier } = useParams<{ nip19Id: string }>();
  const [entityData, setEntityData] = useState<{
    type: string;
    data: unknown;
    raw: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { nostr } = useNostr();
  const navigate = useNavigate();

  // Fetch event data if it's a note or nevent
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['nostr-entity-event', entityData?.type, entityData?.data],
    queryFn: async (c) => {
      if (!entityData) return null;
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      if (entityData.type === 'note') {
        const eventId = entityData.data as string;
        const events = await nostr.query([{ ids: [eventId], limit: 1 }], { signal });
        return events[0] || null;
      } else if (entityData.type === 'nevent') {
        const { id } = entityData.data as { id: string; author?: string; kind?: number };
        const events = await nostr.query([{ ids: [id], limit: 1 }], { signal });
        return events[0] || null;
      }
      
      return null;
    },
    enabled: !!entityData && (entityData.type === 'note' || entityData.type === 'nevent'),
  });

  useSeoMeta({
    title: 'Nostr Entity - ZapTok',
    description: 'View details for Nostr entities including profiles, events, and addresses.',
  });

  useEffect(() => {
    if (!identifier) {
      setError('No identifier provided');
      return;
    }

    try {
      const decoded = nip19.decode(identifier);
      setEntityData({
        type: decoded.type,
        data: decoded.data,
        raw: identifier
      });
    } catch (err) {
      setError('Invalid NIP-19 identifier');
      console.error('Error decoding NIP-19:', err);
    }
  }, [identifier]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      duration: 2000,
    });
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!entityData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if the event is a video event (kind 21, 22, or legacy video events)
  const isVideoEvent = eventData && (
    eventData.kind === 21 || 
    eventData.kind === 22 || 
    validateVideoEvent(eventData) !== null
  );

  // If it's a video event, display it with VideoCard in a full-screen viewer
  if (isVideoEvent && eventData) {
    const videoEvent = validateVideoEvent(eventData);
    if (videoEvent) {
      const isYouTube = videoEvent.videoUrl ? isYouTubeUrl(videoEvent.videoUrl) : false;
      
      return (
        <div className="fixed inset-0 z-50 bg-black overflow-hidden">
          {/* Close Button */}
          <button
            onClick={() => navigate('/global')}
            className="fixed top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            aria-label="Close video"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Single Video Viewer */}
          <div className="h-screen flex items-center justify-center">
            <div className="flex w-full items-end h-full gap-6 max-w-2xl">
              <div className="flex-1 h-full rounded-3xl border-2 border-gray-800 overflow-hidden bg-black shadow-2xl relative">
                <VideoCard 
                  event={videoEvent}
                  isActive={true}
                  onNext={() => {}}
                  onPrevious={() => {}}
                  showVerificationBadge={true}
                />
                {/* Action Buttons - Positioned higher for YouTube to avoid player controls */}
                <div className={`absolute right-1 z-10 ${isYouTube ? 'bottom-20' : 'bottom-4'}`}>
                  <VideoActionButtons event={videoEvent} />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Redirect profiles to the profile page
  if (entityData.type === 'npub' || entityData.type === 'nprofile') {
    const pubkey = entityData.type === 'npub'
      ? entityData.data as string
      : (entityData.data as { pubkey: string }).pubkey;
    return <Navigate to={`/profile/${pubkey}`} replace />;
  }

  const renderEntityData = () => {
    switch (entityData.type) {
      case 'note': {
        const noteId = entityData.data as string;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Note ID:</div>
              <div className="font-mono text-sm bg-muted p-2 rounded break-all">
                {noteId}
              </div>
            </div>
          </div>
        );
      }

      case 'nevent': {
        const eventData = entityData.data as {
          id: string;
          relays?: string[];
          author?: string;
          kind?: number;
        };
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Event ID:</div>
              <div className="font-mono text-sm bg-muted p-2 rounded break-all">
                {eventData.id}
              </div>
            </div>
            {eventData.author && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Author:</div>
                <div className="font-mono text-sm bg-muted p-2 rounded break-all">
                  {eventData.author}
                </div>
              </div>
            )}
            {eventData.kind && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Kind:</div>
                <Badge variant="secondary">{eventData.kind}</Badge>
              </div>
            )}
            {eventData.relays && eventData.relays.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Relays:</div>
                <div className="space-y-1">
                  {eventData.relays.map((relay, index) => (
                    <div key={index} className="font-mono text-sm bg-muted p-2 rounded break-all">
                      {relay}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'naddr': {
        const addrData = entityData.data as {
          identifier: string;
          pubkey: string;
          kind: number;
          relays?: string[];
        };
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Identifier:</div>
              <div className="font-mono text-sm bg-muted p-2 rounded break-all">
                {addrData.identifier}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Author:</div>
              <div className="font-mono text-sm bg-muted p-2 rounded break-all">
                {addrData.pubkey}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Kind:</div>
              <Badge variant="secondary">{addrData.kind}</Badge>
            </div>
            {addrData.relays && addrData.relays.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Relays:</div>
                <div className="space-y-1">
                  {addrData.relays.map((relay, index) => (
                    <div key={index} className="font-mono text-sm bg-muted p-2 rounded break-all">
                      {relay}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Raw Data:</div>
            <div className="font-mono text-sm bg-muted p-2 rounded break-all">
              {JSON.stringify(entityData.data, null, 2)}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Nostr {entityData.type.toUpperCase()}
              <Badge variant="outline">{entityData.type}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(entityData.raw)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`nostr:${entityData.raw}`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Copy URI
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderEntityData()}
        </CardContent>
      </Card>
    </div>
  );
}