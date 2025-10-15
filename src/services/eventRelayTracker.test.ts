import { describe, it, expect, beforeEach } from 'vitest';
import { eventRelayTracker } from '@/services/eventRelayTracker';
import type { Event as NostrEvent } from 'nostr-tools';

describe('EventRelayTracker', () => {
  const mockEvent: NostrEvent = {
    id: 'event123',
    pubkey: 'pubkey123',
    created_at: 1000000,
    kind: 1,
    tags: [],
    content: 'test event',
    sig: 'signature',
  };

  beforeEach(() => {
    eventRelayTracker.clear();
  });

  it('should track which relay returned an event', () => {
    const relayUrl = 'wss://relay.example.com';
    
    eventRelayTracker.trackEvent(mockEvent, relayUrl);
    
    const hints = eventRelayTracker.getRelayHints(mockEvent.id);
    expect(hints).toContain(relayUrl);
    expect(hints).toHaveLength(1);
  });

  it('should track multiple relays for the same event', () => {
    const relay1 = 'wss://relay1.example.com';
    const relay2 = 'wss://relay2.example.com';
    
    eventRelayTracker.trackEvent(mockEvent, relay1);
    eventRelayTracker.trackEvent(mockEvent, relay2);
    
    const hints = eventRelayTracker.getRelayHints(mockEvent.id);
    expect(hints).toContain(relay1);
    expect(hints).toContain(relay2);
    expect(hints).toHaveLength(2);
  });

  it('should not duplicate relay entries for the same event', () => {
    const relayUrl = 'wss://relay.example.com';
    
    eventRelayTracker.trackEvent(mockEvent, relayUrl);
    eventRelayTracker.trackEvent(mockEvent, relayUrl);
    eventRelayTracker.trackEvent(mockEvent, relayUrl);
    
    const hints = eventRelayTracker.getRelayHints(mockEvent.id);
    expect(hints).toHaveLength(1);
  });

  it('should return empty array for unknown event', () => {
    const hints = eventRelayTracker.getRelayHints('unknown-event-id');
    expect(hints).toEqual([]);
  });

  it('should get optimal relays for multiple events', () => {
    const event1: NostrEvent = { ...mockEvent, id: 'event1' };
    const event2: NostrEvent = { ...mockEvent, id: 'event2' };
    const event3: NostrEvent = { ...mockEvent, id: 'event3' };

    const relay1 = 'wss://relay1.example.com';
    const relay2 = 'wss://relay2.example.com';
    const relay3 = 'wss://relay3.example.com';

    // relay1 has all 3 events
    eventRelayTracker.trackEvent(event1, relay1);
    eventRelayTracker.trackEvent(event2, relay1);
    eventRelayTracker.trackEvent(event3, relay1);

    // relay2 has 2 events
    eventRelayTracker.trackEvent(event1, relay2);
    eventRelayTracker.trackEvent(event2, relay2);

    // relay3 has 1 event
    eventRelayTracker.trackEvent(event1, relay3);

    const optimal = eventRelayTracker.getOptimalRelays(['event1', 'event2', 'event3']);

    // Should be sorted by frequency (relay1 first, relay2 second, relay3 third)
    expect(optimal[0]).toBe(relay1);
    expect(optimal[1]).toBe(relay2);
    expect(optimal[2]).toBe(relay3);
  });

  it('should provide stats about tracked events', () => {
    const event1: NostrEvent = { ...mockEvent, id: 'event1' };
    const event2: NostrEvent = { ...mockEvent, id: 'event2' };

    eventRelayTracker.trackEvent(event1, 'wss://relay1.example.com');
    eventRelayTracker.trackEvent(event1, 'wss://relay2.example.com');
    eventRelayTracker.trackEvent(event2, 'wss://relay1.example.com');

    const stats = eventRelayTracker.getStats();
    expect(stats.totalEvents).toBe(2);
    expect(stats.totalRelays).toBe(2);
  });

  it('should clear all tracked data', () => {
    eventRelayTracker.trackEvent(mockEvent, 'wss://relay.example.com');
    
    expect(eventRelayTracker.getRelayHints(mockEvent.id)).toHaveLength(1);
    
    eventRelayTracker.clear();
    
    expect(eventRelayTracker.getRelayHints(mockEvent.id)).toHaveLength(0);
    expect(eventRelayTracker.getStats().totalEvents).toBe(0);
  });
});
