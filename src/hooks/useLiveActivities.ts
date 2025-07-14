import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import type { NostrEvent } from '@nostrify/nostrify';

// NIP-53 Live Event (kind:30311)
export interface LiveEvent extends NostrEvent {
  kind: 30311;
  id: string;
  pubkey: string;
  created_at: number;
  content: string;
  tags: string[][];
  sig: string;
  // Parsed metadata
  identifier?: string;
  title?: string;
  summary?: string;
  image?: string;
  hashtags?: string[];
  streamingUrl?: string;
  recordingUrl?: string;
  starts?: number;
  ends?: number;
  status?: 'planned' | 'live' | 'ended';
  currentParticipants?: number;
  totalParticipants?: number;
  participants?: Array<{
    pubkey: string;
    relay?: string;
    role: string;
    proof?: string;
  }>;
  relays?: string[];
  pinnedMessages?: string[];
}

// NIP-53 Live Chat Message (kind:1311)
export interface LiveChatMessage extends NostrEvent {
  kind: 1311;
  liveEventAddress?: string;
  parentMessage?: string;
}

// Helper functions for parsing NIP-53 events
function parseLiveEvent(event: NostrEvent): LiveEvent | null {
  if (event.kind !== 30311) return null;

  const liveEvent = event as LiveEvent;
  const tags = event.tags || [];

  // Parse basic metadata
  liveEvent.identifier = tags.find(t => t[0] === 'd')?.[1];
  liveEvent.title = tags.find(t => t[0] === 'title')?.[1];
  liveEvent.summary = tags.find(t => t[0] === 'summary')?.[1];
  liveEvent.image = tags.find(t => t[0] === 'image')?.[1];
  liveEvent.streamingUrl = tags.find(t => t[0] === 'streaming')?.[1];
  liveEvent.recordingUrl = tags.find(t => t[0] === 'recording')?.[1];
  liveEvent.status = tags.find(t => t[0] === 'status')?.[1] as LiveEvent['status'];

  // Parse timestamps
  const startsTag = tags.find(t => t[0] === 'starts')?.[1];
  const endsTag = tags.find(t => t[0] === 'ends')?.[1];
  liveEvent.starts = startsTag ? parseInt(startsTag) : undefined;
  liveEvent.ends = endsTag ? parseInt(endsTag) : undefined;

  // Parse participant counts
  const currentParticipantsTag = tags.find(t => t[0] === 'current_participants')?.[1];
  const totalParticipantsTag = tags.find(t => t[0] === 'total_participants')?.[1];
  liveEvent.currentParticipants = currentParticipantsTag ? parseInt(currentParticipantsTag) : undefined;
  liveEvent.totalParticipants = totalParticipantsTag ? parseInt(totalParticipantsTag) : undefined;

  // Parse hashtags
  liveEvent.hashtags = tags.filter(t => t[0] === 't').map(t => t[1]).filter(Boolean);

  // Parse participants
  liveEvent.participants = tags
    .filter(t => t[0] === 'p')
    .map(t => ({
      pubkey: t[1],
      relay: t[2] || undefined,
      role: t[3] || 'Participant',
      proof: t[4] || undefined,
    }));

  // Parse relays
  const relaysTag = tags.find(t => t[0] === 'relays');
  liveEvent.relays = relaysTag ? relaysTag.slice(1) : [];

  // Parse pinned messages
  liveEvent.pinnedMessages = tags.filter(t => t[0] === 'pinned').map(t => t[1]);

  return liveEvent;
}

function parseLiveChatMessage(event: NostrEvent): LiveChatMessage | null {
  if (event.kind !== 1311) return null;

  const chatMessage = event as LiveChatMessage;
  const tags = event.tags || [];

  // Parse live event reference
  const aTag = tags.find(t => t[0] === 'a');
  chatMessage.liveEventAddress = aTag?.[1];

  // Parse parent message reference
  const eTag = tags.find(t => t[0] === 'e');
  chatMessage.parentMessage = eTag?.[1];

  return chatMessage;
}

export function useLiveActivities() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  // Query live events
  const useLiveEvents = (options?: { 
    status?: 'planned' | 'live' | 'ended';
    authors?: string[];
    hashtags?: string[];
    limit?: number;
  }) => {
    return useQuery({
      queryKey: ['live-events', options],
      queryFn: async (c) => {
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
        
        const filters = [{
          kinds: [30311],
          limit: options?.limit || 50,
          ...(options?.authors?.length && { authors: options.authors }),
          ...(options?.hashtags?.length && { '#t': options.hashtags }),
        }];

        const events = await nostr.query(filters, { signal });
        
        // Parse and filter events
        const liveEvents = events
          .map(parseLiveEvent)
          .filter((event): event is LiveEvent => event !== null);

        // Filter by status if specified
        if (options?.status) {
          return liveEvents.filter(event => event.status === options.status);
        }

        // Sort by creation time (newest first)
        return liveEvents.sort((a, b) => b.created_at - a.created_at);
      },
      staleTime: 30 * 1000, // 30 seconds for live data
      refetchInterval: 60 * 1000, // Refetch every minute for live updates
    });
  };

  // Query specific live event
  const useLiveEvent = (naddr: string) => {
    return useQuery({
      queryKey: ['live-event', naddr],
      queryFn: async (c) => {
        if (!naddr) return null;

        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
        
        // Parse naddr to get filter parameters
        // For now, we'll use a simple approach - in production you'd decode the naddr
        const events = await nostr.query([{
          kinds: [30311],
          limit: 1,
        }], { signal });

        const event = events[0];
        return event ? parseLiveEvent(event) : null;
      },
      enabled: !!naddr,
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 30 * 1000, // Refetch every 30 seconds for live updates
    });
  };

  // Query live chat messages for an event
  const useLiveChatMessages = (liveEventAddress: string) => {
    return useQuery({
      queryKey: ['live-chat', liveEventAddress],
      queryFn: async (c) => {
        if (!liveEventAddress) return [];

        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
        
        const events = await nostr.query([{
          kinds: [1311],
          '#a': [liveEventAddress],
          limit: 100,
        }], { signal });

        const chatMessages = events
          .map(parseLiveChatMessage)
          .filter((msg): msg is LiveChatMessage => msg !== null);

        // Sort by creation time (newest first)
        return chatMessages.sort((a, b) => b.created_at - a.created_at);
      },
      enabled: !!liveEventAddress,
      staleTime: 10 * 1000, // 10 seconds for chat
      refetchInterval: 5 * 1000, // Refetch every 5 seconds for live chat
    });
  };

  // Create live event
  const useCreateLiveEvent = () => {
    return useMutation({
      mutationFn: async (data: {
        identifier: string;
        title: string;
        summary?: string;
        image?: string;
        hashtags?: string[];
        streamingUrl?: string;
        starts?: number;
        ends?: number;
        status?: 'planned' | 'live' | 'ended';
      }) => {
        if (!user) throw new Error('User not logged in');

        const tags: string[][] = [
          ['d', data.identifier],
          ['title', data.title],
        ];

        if (data.summary) tags.push(['summary', data.summary]);
        if (data.image) tags.push(['image', data.image]);
        if (data.streamingUrl) tags.push(['streaming', data.streamingUrl]);
        if (data.starts) tags.push(['starts', data.starts.toString()]);
        if (data.ends) tags.push(['ends', data.ends.toString()]);
        if (data.status) tags.push(['status', data.status]);

        // Add hashtags
        if (data.hashtags?.length) {
          data.hashtags.forEach(tag => tags.push(['t', tag]));
        }

        // Add user as host
        tags.push(['p', user.pubkey, '', 'Host']);

        return new Promise<void>((resolve, reject) => {
          publishEvent(
            {
              kind: 30311,
              content: '',
              tags,
            },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['live-events'] });
                resolve();
              },
              onError: reject,
            }
          );
        });
      },
    });
  };

  // Update live event
  const useUpdateLiveEvent = () => {
    return useMutation({
      mutationFn: async (data: {
        identifier: string;
        title?: string;
        summary?: string;
        image?: string;
        hashtags?: string[];
        streamingUrl?: string;
        recordingUrl?: string;
        starts?: number;
        ends?: number;
        status?: 'planned' | 'live' | 'ended';
        currentParticipants?: number;
        totalParticipants?: number;
        participants?: Array<{
          pubkey: string;
          relay?: string;
          role: string;
          proof?: string;
        }>;
        pinnedMessages?: string[];
      }) => {
        if (!user) throw new Error('User not logged in');

        const tags: string[][] = [
          ['d', data.identifier],
        ];

        if (data.title) tags.push(['title', data.title]);
        if (data.summary) tags.push(['summary', data.summary]);
        if (data.image) tags.push(['image', data.image]);
        if (data.streamingUrl) tags.push(['streaming', data.streamingUrl]);
        if (data.recordingUrl) tags.push(['recording', data.recordingUrl]);
        if (data.starts) tags.push(['starts', data.starts.toString()]);
        if (data.ends) tags.push(['ends', data.ends.toString()]);
        if (data.status) tags.push(['status', data.status]);
        if (data.currentParticipants !== undefined) {
          tags.push(['current_participants', data.currentParticipants.toString()]);
        }
        if (data.totalParticipants !== undefined) {
          tags.push(['total_participants', data.totalParticipants.toString()]);
        }

        // Add hashtags
        if (data.hashtags?.length) {
          data.hashtags.forEach(tag => tags.push(['t', tag]));
        }

        // Add participants
        if (data.participants?.length) {
          data.participants.forEach(p => {
            const pTag = ['p', p.pubkey];
            if (p.relay) pTag.push(p.relay);
            else pTag.push('');
            pTag.push(p.role);
            if (p.proof) pTag.push(p.proof);
            tags.push(pTag);
          });
        }

        // Add pinned messages
        if (data.pinnedMessages?.length) {
          data.pinnedMessages.forEach(msgId => tags.push(['pinned', msgId]));
        }

        return new Promise<void>((resolve, reject) => {
          publishEvent(
            {
              kind: 30311,
              content: '',
              tags,
            },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['live-events'] });
                queryClient.invalidateQueries({ queryKey: ['live-event'] });
                resolve();
              },
              onError: reject,
            }
          );
        });
      },
    });
  };

  // Send live chat message
  const useSendChatMessage = () => {
    return useMutation({
      mutationFn: async (data: {
        liveEventAddress: string;
        content: string;
        parentMessage?: string;
      }) => {
        if (!user) throw new Error('User not logged in');

        const tags: string[][] = [
          ['a', data.liveEventAddress, '', 'root'],
        ];

        if (data.parentMessage) {
          tags.push(['e', data.parentMessage]);
        }

        return new Promise<void>((resolve, reject) => {
          publishEvent(
            {
              kind: 1311,
              content: data.content,
              tags,
            },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ 
                  queryKey: ['live-chat', data.liveEventAddress] 
                });
                resolve();
              },
              onError: reject,
            }
          );
        });
      },
    });
  };

  return {
    useLiveEvents,
    useLiveEvent,
    useLiveChatMessages,
    useCreateLiveEvent,
    useUpdateLiveEvent,
    useSendChatMessage,
  };
}
