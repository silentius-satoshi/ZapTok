import { describe, it, expect } from 'vitest';
import { createVideoEvent, createNip71VideoEvent, createDualVideoEvents } from '../../lib/videoEventStrategy';
import type { VideoEventData } from '../../lib/videoEventStrategy';

describe('Video Event Strategy', () => {
  const mockVideoData: VideoEventData = {
    title: "Test Video",
    description: "A test video for events",
    videoUrl: "https://example.com/video.mp4",
    hash: "abcd1234567890",
    width: 1920,
    height: 1080,
    duration: 120,
    size: 50000000,
    type: "video/mp4"
  };

  describe('createVideoEvent', () => {
    it('should create a kind 21/22 event with rich metadata', () => {
      const event = createVideoEvent(mockVideoData);

      expect([21, 22]).toContain(event.kind);
      expect(event.content).toContain("Test Video");
      expect(event.content).toContain("A test video for events");

      // Check for imeta tag (NIP-92 style)
      const imetaTag = event.tags?.find(tag => tag[0] === 'imeta');
      expect(imetaTag).toBeTruthy();
      expect(imetaTag?.[1]).toContain('url https://example.com/video.mp4');
      expect(imetaTag?.[2]).toBe('m video/mp4');
      expect(imetaTag?.[3]).toBe('x abcd1234567890');
      expect(imetaTag?.[5]).toBe('dim 1920x1080');

      // Check for summary tag (NIP-71 style)
      const summaryTag = event.tags?.find(tag => tag[0] === 'summary');
      expect(summaryTag?.[1]).toBe("A test video for events");

      // Check for title tag
      const titleTag = event.tags?.find(tag => tag[0] === 'title');
      expect(titleTag?.[1]).toBe("Test Video");
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalData: VideoEventData = {
        title: "Minimal Video",
        description: "A minimal test video",
        videoUrl: "https://example.com/minimal.mp4",
        hash: "minimal123"
      };

      const event = createVideoEvent(minimalData);

      expect([21, 22]).toContain(event.kind);
      expect(event.content).toContain("Minimal Video");

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
      expect(event.content).toBe("A test video for events");

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
    it('should create both video and NIP-71 events', () => {
      const result = createDualVideoEvents(mockVideoData);

      expect(result.videoEvent).toBeTruthy();
      expect(result.nip71Event).toBeTruthy();
      
      const { videoEvent, nip71Event } = result;

      expect([21, 22]).toContain(videoEvent.kind);
      expect(nip71Event.kind).toBe(21); // Long-form video

      // Video event should have imeta tag
      const imetaTag = videoEvent.tags?.find(tag => tag[0] === 'imeta');
      expect(imetaTag).toBeTruthy();

      // NIP-71 event should have url tag
      const urlTag = nip71Event.tags?.find(tag => tag[0] === 'url');
      expect(urlTag?.[1]).toBe("https://example.com/video.mp4");
    });
  });

  describe('NIP-71 compliance', () => {
    it('should ensure video events use proper kind numbers', () => {
      const event = createVideoEvent(mockVideoData);

      // Video events use kind 21 (landscape/long) or 22 (portrait/short)
      expect([21, 22]).toContain(event.kind);
      expect(event.content).toContain("Test Video");
      
      // Advanced clients can parse the imeta tag for rich metadata
      const imetaTag = event.tags?.find(tag => tag[0] === 'imeta');
      expect(imetaTag).toBeTruthy();
    });

    it('should provide clean content without auto-generated text', () => {
      const event = createVideoEvent(mockVideoData);

      // Content should only contain user-provided title and description
      expect(event.content).toMatch(/Test Video/);
      expect(event.content).toMatch(/A test video for events/);
      // Should NOT contain emojis or auto-generated text
      expect(event.content).not.toMatch(/🎬/);
      expect(event.content).not.toMatch(/📹 Watch:/);
      expect(event.content).not.toMatch(/⏱️ Duration:/);
    });
  });
});
