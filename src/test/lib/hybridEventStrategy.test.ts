import { describe, it, expect } from 'vitest';
import { createHybridVideoEvent, createNip71VideoEvent, createDualVideoEvents } from '../../lib/hybridEventStrategy';
import type { HybridVideoEventData } from '../../lib/hybridEventStrategy';

describe('Hybrid Event Strategy', () => {
  const mockVideoData: HybridVideoEventData = {
    title: "Test Video",
    description: "A test video for hybrid events",
    videoUrl: "https://example.com/video.mp4",
    hash: "abcd1234567890",
    width: 1920,
    height: 1080,
    duration: 120,
    size: 50000000,
    type: "video/mp4"
  };

  describe('createHybridVideoEvent', () => {
    it('should create a kind 1 event with rich metadata', () => {
      const event = createHybridVideoEvent(mockVideoData);

      expect(event.kind).toBe(1);
      expect(event.content).toContain("Test Video");
      expect(event.content).toContain("A test video for hybrid events");
      expect(event.content).toContain("https://example.com/video.mp4");

      // Check for imeta tag (NIP-92 style)
      const imetaTag = event.tags?.find(tag => tag[0] === 'imeta');
      expect(imetaTag).toBeTruthy();
      expect(imetaTag?.[1]).toContain('url https://example.com/video.mp4');
      expect(imetaTag?.[2]).toBe('m video/mp4');
      expect(imetaTag?.[3]).toBe('x abcd1234567890');
      expect(imetaTag?.[5]).toBe('dim 1920x1080');

      // Check for summary tag (NIP-71 style)
      const summaryTag = event.tags?.find(tag => tag[0] === 'summary');
      expect(summaryTag?.[1]).toBe("A test video for hybrid events");

      // Check for title tag
      const titleTag = event.tags?.find(tag => tag[0] === 'title');
      expect(titleTag?.[1]).toBe("Test Video");
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalData: HybridVideoEventData = {
        title: "Minimal Video",
        description: "A minimal test video",
        videoUrl: "https://example.com/minimal.mp4",
        hash: "minimal123"
      };

      const event = createHybridVideoEvent(minimalData);

      expect(event.kind).toBe(1);
      expect(event.content).toContain("Minimal Video");
      expect(event.content).toContain("https://example.com/minimal.mp4");

      const imetaTag = event.tags?.find(tag => tag[0] === 'imeta');
      expect(imetaTag).toBeTruthy();
      expect(imetaTag?.[1]).toContain('url https://example.com/minimal.mp4');
      expect(imetaTag?.[2]).toBe('x minimal123');
    });
  });

  describe('createNip71VideoEvent', () => {
    it('should create a kind 21 event with NIP-71 tags', () => {
      const uniqueId = 'test-video-123';
      const event = createNip71VideoEvent(mockVideoData, uniqueId);

      expect(event.kind).toBe(21); // Long-form video (>60s)
      expect(event.content).toBe("A test video for hybrid events");

      // Check for NIP-71 tags
      const titleTag = event.tags?.find(tag => tag[0] === 'title');
      expect(titleTag?.[1]).toBe("Test Video");

      const urlTag = event.tags?.find(tag => tag[0] === 'url');
      expect(urlTag?.[1]).toBe("https://example.com/video.mp4");

      const dTag = event.tags?.find(tag => tag[0] === 'd');
      expect(dTag?.[1]).toBe(uniqueId);

      const mimeTag = event.tags?.find(tag => tag[0] === 'm');
      expect(mimeTag?.[1]).toBe("video/mp4");
    });
  });

  describe('createDualVideoEvents', () => {
    it('should create both hybrid and NIP-71 events', () => {
      const result = createDualVideoEvents(mockVideoData);

      expect(result.hybridEvent).toBeTruthy();
      expect(result.nip71Event).toBeTruthy();
      
      const { hybridEvent, nip71Event } = result;

      expect(hybridEvent.kind).toBe(1);
      expect(nip71Event.kind).toBe(21); // Long-form video

      // Hybrid event should have imeta tag
      const imetaTag = hybridEvent.tags?.find(tag => tag[0] === 'imeta');
      expect(imetaTag).toBeTruthy();

      // NIP-71 event should have url tag
      const urlTag = nip71Event.tags?.find(tag => tag[0] === 'url');
      expect(urlTag?.[1]).toBe("https://example.com/video.mp4");
    });
  });

  describe('Cross-client compatibility', () => {
    it('should ensure hybrid events are readable by basic clients', () => {
      const event = createHybridVideoEvent(mockVideoData);

      // Basic clients can read the content as regular text
      expect(event.content).toContain("Test Video");
      expect(event.content).toContain("https://example.com/video.mp4");
      
      // Advanced clients can parse the imeta tag for rich metadata
      const imetaTag = event.tags?.find(tag => tag[0] === 'imeta');
      expect(imetaTag).toBeTruthy();
      
      // The event is a standard kind 1 note
      expect(event.kind).toBe(1);
    });

    it('should provide fallback content for clients without NIP-71 support', () => {
      const event = createHybridVideoEvent(mockVideoData);

      // Content should be human-readable even without special video support
      expect(event.content).toMatch(/Test Video/);
      expect(event.content).toMatch(/https:\/\/example\.com\/video\.mp4/);
      expect(event.content).toMatch(/A test video for hybrid events/);
    });
  });
});
