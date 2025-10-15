import { describe, it, expect } from 'vitest';
import { validateVideoEvent, hasVideoContent, normalizeVideoUrl } from '../../lib/validateVideoEvent';
import type { NostrEvent } from '@nostrify/nostrify';

describe('validateVideoEvent', () => {
  const createMockEvent = (overrides: Partial<NostrEvent> = {}): NostrEvent => ({
    id: 'test-id',
    pubkey: 'test-pubkey',
    created_at: Date.now(),
    kind: 1,
    tags: [],
    content: '',
    sig: 'test-sig',
    ...overrides,
  });

  it('should validate event with hash tag', () => {
    const event = createMockEvent({
      tags: [['x', 'abc123hash'], ['title', 'Test Video']],
      content: 'Check out this video!'
    });

    const result = validateVideoEvent(event);
    
    expect(result).toBeTruthy();
    expect(result?.hash).toBe('abc123hash');
    expect(result?.title).toBe('Test Video');
    expect(result?.videoUrl).toBe('https://blossom.band/abc123hash');
  });

  it('should validate event with url tag', () => {
    const event = createMockEvent({
      tags: [['url', 'https://example.com/video.mp4'], ['thumb', 'https://example.com/thumb.jpg']],
      content: 'Video content'
    });

    const result = validateVideoEvent(event);
    
    expect(result).toBeTruthy();
    expect(result?.videoUrl).toBe('https://example.com/video.mp4');
    expect(result?.thumbnail).toBe('https://example.com/thumb.jpg');
  });

  it('should validate event with video content URL', () => {
    const event = createMockEvent({
      content: 'Check this out: https://example.com/awesome-video.mp4'
    });

    const result = validateVideoEvent(event);
    
    expect(result).toBeTruthy();
    expect(result?.videoUrl).toBe('https://example.com/awesome-video.mp4');
  });

  it('should validate event with video tag', () => {
    const event = createMockEvent({
      tags: [['t', 'video'], ['url', 'https://example.com/video.webm']],
      content: 'My latest video'
    });

    const result = validateVideoEvent(event);
    
    expect(result).toBeTruthy();
    expect(result?.videoUrl).toBe('https://example.com/video.webm');
  });

  it('should parse duration from tags', () => {
    const event = createMockEvent({
      tags: [['x', 'hash123'], ['duration', '120'], ['title', 'Two Minute Video']],
      content: 'Short video'
    });

    const result = validateVideoEvent(event);
    
    expect(result).toBeTruthy();
    expect(result?.duration).toBe(120);
  });

  it('should generate title from content if not provided', () => {
    const event = createMockEvent({
      tags: [['x', 'hash123']],
      content: 'Amazing skateboard tricks\nWatch me do a kickflip!'
    });

    const result = validateVideoEvent(event);
    
    expect(result).toBeTruthy();
    expect(result?.title).toBe('Amazing skateboard tricks');
  });

  it('should return null for non-video events', () => {
    const event = createMockEvent({
      content: 'Just a regular text post with no video content'
    });

    const result = validateVideoEvent(event);
    
    expect(result).toBeNull();
  });

  it('should return null if no URL or hash available', () => {
    const event = createMockEvent({
      tags: [['t', 'video']],
      content: 'Video post but no actual video URL'
    });

    const result = validateVideoEvent(event);
    
    expect(result).toBeNull();
  });
});

describe('hasVideoContent', () => {
  const createMockEvent = (overrides: Partial<NostrEvent> = {}): NostrEvent => ({
    id: 'test-id',
    pubkey: 'test-pubkey',
    created_at: Date.now(),
    kind: 1,
    tags: [],
    content: '',
    sig: 'test-sig',
    ...overrides,
  });

  it('should detect hash tag', () => {
    const event = createMockEvent({
      tags: [['x', 'hash123']]
    });

    expect(hasVideoContent(event)).toBe(true);
  });

  it('should detect url tag', () => {
    const event = createMockEvent({
      tags: [['url', 'https://example.com/video.mp4']]
    });

    expect(hasVideoContent(event)).toBe(true);
  });

  it('should detect video tag', () => {
    const event = createMockEvent({
      tags: [['t', 'video']]
    });

    expect(hasVideoContent(event)).toBe(true);
  });

  it('should detect video content in text', () => {
    const event = createMockEvent({
      content: 'Check out my video: https://example.com/cool.mp4'
    });

    expect(hasVideoContent(event)).toBe(true);
  });

  it('should detect YouTube content', () => {
    const event = createMockEvent({
      content: 'https://youtube.com/watch?v=abc123'
    });

    expect(hasVideoContent(event)).toBe(true);
  });

  it('should return false for non-video content', () => {
    const event = createMockEvent({
      content: 'Just a regular text post'
    });

    expect(hasVideoContent(event)).toBe(false);
  });
});

describe('normalizeVideoUrl', () => {
  it('normalizes URLs by removing query parameters', () => {
    const url = 'https://example.com/video.mp4?t=123&autoplay=1';
    const normalized = normalizeVideoUrl(url);
    expect(normalized).toBe('https://example.com/video.mp4');
  });

  it('normalizes URLs by removing fragments', () => {
    const url = 'https://example.com/video.mp4#t=30';
    const normalized = normalizeVideoUrl(url);
    expect(normalized).toBe('https://example.com/video.mp4');
  });

  it('normalizes URLs by removing both query params and fragments', () => {
    const url = 'https://example.com/video.mp4?quality=720p#t=30';
    const normalized = normalizeVideoUrl(url);
    expect(normalized).toBe('https://example.com/video.mp4');
  });

  it('preserves the base URL structure', () => {
    const url = 'https://cdn.example.com/path/to/video.mp4';
    const normalized = normalizeVideoUrl(url);
    expect(normalized).toBe('https://cdn.example.com/path/to/video.mp4');
  });

  it('handles invalid URLs gracefully', () => {
    const invalidUrl = 'not-a-url';
    const normalized = normalizeVideoUrl(invalidUrl);
    expect(normalized).toBe('not-a-url');
  });

  it('handles URLs without query params or fragments', () => {
    const url = 'https://example.com/video.mp4';
    const normalized = normalizeVideoUrl(url);
    expect(normalized).toBe('https://example.com/video.mp4');
  });
});
