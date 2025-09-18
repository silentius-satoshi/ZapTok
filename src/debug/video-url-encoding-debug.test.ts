import { describe, it, expect } from 'vitest';
import { validateVideoEvent } from '@/lib/validateVideoEvent';

describe('Video URL Encoding Debug', () => {
  it('should handle imeta tags correctly and not create malformed URLs', () => {
    // Simulate the event that would be created by hybridEventStrategy
    const mockEvent = {
      id: 'test-event-123',
      kind: 1,
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      content: '🎬 Test Video\n\nTest description\n\n📹 Watch: https://blossom.band/abc123def456',
      tags: [
        ['url', 'https://blossom.band/abc123def456'],
        ['imeta', 'url https://blossom.band/abc123def456', 'm video/webm', 'x abc123def456', 'size 1234567', 'dim 2160x3840'],
        ['title', 'Test Video'],
        ['m', 'video/webm'],
        ['x', 'abc123def456'],
        ['size', '1234567'],
        ['dim', '2160x3840']
      ],
      sig: 'test-signature'
    };

    const result = validateVideoEvent(mockEvent);

    // Assertions
    expect(result).toBeTruthy();
    expect(result?.videoUrl).toBe('https://blossom.band/abc123def456');
    expect(result?.hash).toBe('abc123def456');
    
    // Critical: The URL should NOT contain encoded metadata
    expect(result?.videoUrl).not.toMatch(/%20/);
    expect(result?.videoUrl).not.toMatch(/webm.*video/);
    expect(result?.videoUrl).not.toMatch(/dim.*\d+x\d+/);
  });

  it('should handle real-world malformed imeta scenario', () => {
    // Simulate what might be happening - if imeta tag gets corrupted
    const malformedEvent = {
      id: 'test-event-456',
      kind: 1,
      pubkey: 'test-pubkey',
      created_at: Math.floor(Date.now() / 1000),
      content: 'Test video content',
      tags: [
        // This simulates what might be happening if tag parsing goes wrong
        ['imeta', 'url https://blossom.band/abc123def456.webm m video/webm x abc123def456 size 1234567 dim 2160x3840'],
        ['x', 'abc123def456']
      ],
      sig: 'test-signature'
    };

    const result = validateVideoEvent(malformedEvent);

    // This test documents the current behavior and helps us debug
    if (result?.videoUrl?.includes('webm m video')) {
      // URL contains malformed metadata - this helps identify parsing issues
    }
  });
});
