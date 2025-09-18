/**
 * Test to verify that imeta tags are created correctly by hybridEventStrategy
 */

import { describe, it, expect } from 'vitest';
import { createHybridVideoEvent, type HybridVideoEventData } from '../lib/hybridEventStrategy';

describe('Imeta Tag Creation', () => {
  it('should create correctly formatted imeta tags', () => {
    const mockVideoData: HybridVideoEventData = {
      title: 'Test Video',
      description: 'A test video for debugging',
      videoUrl: 'https://blossom.band/abc123def456.webm',
      hash: 'abc123def456',
      size: 1234567,
      type: 'video/webm',
      width: 2160,
      height: 3840,
    };
    
    const event = createHybridVideoEvent(mockVideoData, {
      includeImeta: true,
      includeNip71Tags: true,
    });

    // Find the imeta tag
    const imetaTag = event.tags?.find(tag => tag[0] === 'imeta');
    expect(imetaTag).toBeDefined();

    // Verify the structure
    expect(imetaTag).toEqual([
      'imeta',
      'url https://blossom.band/abc123def456.webm',
      'm video/webm',
      'x abc123def456',
      'size 1234567',
      'dim 2160x3840'
    ]);
  });

  it('should create the same format as our working test case', () => {
    const mockVideoData: HybridVideoEventData = {
      title: 'Test Video',
      description: 'A test video',
      videoUrl: 'https://blossom.band/abc123def456',
      hash: 'abc123def456',
      size: 1234567,
      type: 'video/webm',
      width: 2160,
      height: 3840,
    };

    const event = createHybridVideoEvent(mockVideoData);
    const imetaTag = event.tags?.find(tag => tag[0] === 'imeta');

    // This should match our working test case from video-url-encoding-debug.test.ts
    expect(imetaTag).toEqual([
      'imeta',
      'url https://blossom.band/abc123def456',
      'm video/webm',
      'x abc123def456',
      'size 1234567',
      'dim 2160x3840'
    ]);
  });
});
