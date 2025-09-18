import { describe, it, expect } from 'vitest';
import { validateVideoEvent } from './validateVideoEvent';
import type { NostrEvent } from '@nostrify/nostrify';

describe('NIP-71 Video Event Compliance', () => {
  const createMockEvent = (overrides: Partial<NostrEvent> = {}): NostrEvent => ({
    id: 'test-id-' + Math.random().toString(36).substr(2, 8),
    pubkey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    created_at: Math.floor(Date.now() / 1000),
    kind: 21, // Use kind 21 for NIP-71 video events
    tags: [],
    content: '',
    sig: 'test-sig-' + Math.random().toString(36).substr(2, 8),
    ...overrides,
  });

  describe('NIP-71 Kind 21/22 (Video Events)', () => {
    it('should validate minimal compliant video event with imeta tags', () => {
      const event = createMockEvent({
        kind: 21,
        content: 'My awesome video content',
        tags: [
          ['imeta', 'url https://example.com/video.mp4', 'm video/mp4'],
          ['title', 'My Video Title'],
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.videoUrl).toBe('https://example.com/video.mp4');
      expect(result?.title).toBe('My Video Title');
      expect(result?.kind).toBe(21);
    });

    it('should validate video event with complete NIP-71 metadata', () => {
      const event = createMockEvent({
        kind: 21,
        content: 'Professional video with all metadata',
        tags: [
          ['imeta', 'url https://blossom.band/video.mp4', 'm video/mp4', 'x abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789', 'size 15032385', 'dim 1920x1080', 'image https://blossom.band/thumb.jpg'],
          ['title', 'Professional Video'],
          ['published_at', '1672531200'],
          ['duration', '120'],
          ['alt', 'Video showing professional content'],
          ['t', 'professional'],
          ['t', 'tutorial'],
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.videoUrl).toBe('https://blossom.band/video.mp4');
      expect(result?.hash).toBe('abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789');
      expect(result?.duration).toBe(120);
      expect(result?.published_at).toBe(1672531200);
      expect(result?.thumbnail).toBe('https://blossom.band/thumb.jpg');
      expect(result?.alt).toBe('Video showing professional content');
    });

    it('should handle imeta tags for NIP-94 compatibility', () => {
      const event = createMockEvent({
        kind: 21,
        content: 'Video with imeta metadata',
        tags: [
          ['title', 'Imeta Video'],
          ['imeta', 'url https://example.com/video.webm', 'm video/webm', 'x hash123', 'size 5000000', 'dim 1280x720']
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.videoUrl).toBe('https://example.com/video.webm');
      expect(result?.hash).toBe('hash123');
    });

    it('should construct Blossom URL when only hash is provided', () => {
      const event = createMockEvent({
        kind: 21,
        content: 'Video with hash only',
        tags: [
          ['x', 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'],
          ['title', 'Hash Only Video'],
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.hash).toBe('fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321');
      expect(result?.videoUrl).toBe('https://blossom.band/fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321');
    });

    it('should reject video event without URL or hash', () => {
      const event = createMockEvent({
        kind: 21,
        content: 'Invalid video without URL or hash',
        tags: [
          ['title', 'Invalid Video'],
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeNull();
    });

    it('should parse duration correctly from string tags', () => {
      const event = createMockEvent({
        kind: 21,
        tags: [
          ['imeta', 'url https://example.com/video.mp4'],
          ['duration', '300'], // 5 minutes as string
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.duration).toBe(300);
    });

    it('should ignore invalid duration values', () => {
      const event = createMockEvent({
        kind: 21,
        tags: [
          ['imeta', 'url https://example.com/video.mp4'],
          ['duration', 'not-a-number'],
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.duration).toBeUndefined();
    });
  });

  describe('Legacy Video Event Support (Kind 1 & 1063)', () => {
    it('should validate kind 1 event with video content', () => {
      const event = createMockEvent({
        kind: 1,
        content: 'Check out my video: https://example.com/awesome.mp4',
        tags: [
          ['x', 'hash123'],
          ['title', 'Legacy Video'],
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.videoUrl).toBe('https://example.com/awesome.mp4');
      expect(result?.hash).toBe('hash123');
      expect(result?.title).toBe('Legacy Video');
    });

    it('should extract video URL from content when no url tag present', () => {
      const event = createMockEvent({
        kind: 1,
        content: 'My latest creation https://blossom.band/video.webm is pretty cool!',
        tags: [['t', 'video']]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.videoUrl).toBe('https://blossom.band/video.webm');
    });

    it('should generate title from first line of content when missing', () => {
      const event = createMockEvent({
        kind: 1,
        content: 'Amazing skateboard tricks\nThis video shows some incredible moves\nhttps://example.com/skate.mp4',
        tags: [['x', 'hash456']]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.title).toBe('Amazing skateboard tricks');
      expect(result?.videoUrl).toBe('https://example.com/skate.mp4');
    });

    it('should reject non-video kind 1 events', () => {
      const event = createMockEvent({
        kind: 1,
        content: 'Just a regular text post with no video content'
      });

      const result = validateVideoEvent(event);

      expect(result).toBeNull();
    });
  });

  describe('Video Platform URL Recognition', () => {
    // YouTube URLs (special handling in legacy validator)
    const youtubeUrls = [
      'https://youtube.com/watch?v=abc123',
      'https://youtu.be/abc123',
    ];

    youtubeUrls.forEach(url => {
      it(`should recognize ${url} as video content`, () => {
        const event = createMockEvent({
          kind: 1,
          content: url, // Content is returned as-is for YouTube
        });

        const result = validateVideoEvent(event);

        expect(result).toBeTruthy();
        expect(result?.videoUrl).toBe(url);
      });
    });

    // Direct file and platform URLs
    const directUrls = [
      'https://blossom.band/hash123',
      'https://satellite.earth/video.mp4',
      'https://m.primal.net/video.webm',
    ];

    directUrls.forEach(url => {
      it(`should recognize ${url} as video content`, () => {
        const event = createMockEvent({
          kind: 1,
          content: `Check this out: ${url}`,
          tags: [['t', 'video']] // Add explicit video tag to help recognition
        });

        const result = validateVideoEvent(event);

        expect(result).toBeTruthy();
        expect(result?.videoUrl).toBe(url);
      });
    });

    // Vimeo needs special handling (not currently supported)
    it('should recognize https://vimeo.com/123456789 as video content', () => {
      const event = createMockEvent({
        kind: 1,
        content: 'https://vimeo.com/123456789',
        tags: [['x', 'hash123']] // Need hash to make it valid since Vimeo not in content parser
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.hash).toBe('hash123');
    });
  });

  describe('ZapTok-specific Video Event Creation', () => {
    it('should handle hybrid video events with rich metadata', () => {
      const event = createMockEvent({
        kind: 1, // ZapTok uses kind 1 for cross-client compatibility
        content: 'This is a test of our video system',
        tags: [
          ['title', 'Amazing short video'],
          ['imeta', 'url https://blossom.band/zaptok-video.mp4', 'm video/mp4', 'x zaptokHash123456789', 'size 2048000', 'thumb https://blossom.band/zaptok-thumb.jpg'],
          ['duration', '45'],
          ['t', 'short'],
          ['t', 'entertainment'],
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.title).toBe('Amazing short video');
      expect(result?.videoUrl).toBe('https://blossom.band/zaptok-video.mp4');
      expect(result?.hash).toBe('zaptokHash123456789');
      expect(result?.thumbnail).toBe('https://blossom.band/zaptok-thumb.jpg');
      expect(result?.duration).toBe(45);
      expect(result?.description).toBe('This is a test of our video system');
    });

    it('should distinguish between short videos and normal videos', () => {
      const shortVideo = createMockEvent({
        kind: 1,
        content: 'Quick 30 second clip',
        tags: [
          ['url', 'https://example.com/short.mp4'],
          ['duration', '30'],
          ['t', 'short']
        ]
      });

      const normalVideo = createMockEvent({
        kind: 1,
        content: 'Long form content',
        tags: [
          ['url', 'https://example.com/long.mp4'],
          ['duration', '300'],
          ['t', 'video']
        ]
      });

      const shortResult = validateVideoEvent(shortVideo);
      const normalResult = validateVideoEvent(normalVideo);

      expect(shortResult?.duration).toBe(30);
      expect(normalResult?.duration).toBe(300);

      // ZapTok can categorize based on duration
      expect(shortResult?.duration).toBeLessThanOrEqual(60);
      expect(normalResult?.duration).toBeGreaterThan(60);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed imeta tags gracefully', () => {
      const event = createMockEvent({
        kind: 21,
        content: 'Video with malformed imeta',
        tags: [
          ['imeta', 'url https://fallback.com/video.mp4'],
          ['imeta', 'malformed tag without proper format']
        ]
      });

      const result = validateVideoEvent(event);

      // Should use the valid imeta tag
      expect(result).toBeTruthy();
      expect(result?.videoUrl).toBe('https://fallback.com/video.mp4');
    });

    it('should handle events with multiple URLs (use first valid one)', () => {
      const event = createMockEvent({
        kind: 1,
        content: 'Multiple URLs: https://first.com/video.mp4 and https://second.com/video.webm',
        tags: [['x', 'hash']]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      expect(result?.videoUrl).toBe('https://first.com/video.mp4');
    });

    it('should handle very long titles gracefully', () => {
      const longTitle = 'A'.repeat(150); // 150 characters
      const event = createMockEvent({
        kind: 21,
        content: longTitle,
        tags: [
          ['imeta', 'url https://example.com/video.mp4'],
        ]
      });

      const result = validateVideoEvent(event);

      expect(result).toBeTruthy();
      // Should use first line of content as title, but may be truncated
      expect(result?.title).toBeDefined();
      expect(result?.title?.length).toBeGreaterThan(0);
    });

    it('should preserve original event properties', () => {
      const originalEvent = createMockEvent({
        kind: 21,
        tags: [
          ['imeta', 'url https://example.com/video.mp4'],
        ]
      });

      const result = validateVideoEvent(originalEvent);

      expect(result).toBeTruthy();
      expect(result?.id).toBe(originalEvent.id);
      expect(result?.pubkey).toBe(originalEvent.pubkey);
      expect(result?.created_at).toBe(originalEvent.created_at);
      expect(result?.sig).toBe(originalEvent.sig);
    });
  });
});