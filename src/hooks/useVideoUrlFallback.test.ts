import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVideoUrlFallback } from './useVideoUrlFallback';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useVideoUrlFallback', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return original URL if it works', async () => {
    // Mock successful response for original URL
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const { result } = renderHook(() => 
      useVideoUrlFallback({
        originalUrl: 'https://example.com/video.mp4',
        hash: 'abc123',
        title: 'Test Video'
      })
    );

    // Initially should return the original URL while testing
    expect(result.current.isTestingUrls).toBe(true);
    expect(result.current.workingUrl).toBe('https://example.com/video.mp4');

    // Wait for URL testing to complete
    await waitFor(() => {
      expect(result.current.isTestingUrls).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.workingUrl).toBe('https://example.com/video.mp4');
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/video.mp4', {
      method: 'HEAD',
      signal: expect.any(AbortSignal),
    });
  });

  it('should try fallback servers if original URL fails', async () => {
    // Mock failed response for original URL
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      // Mock successful response for first fallback
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

    const { result } = renderHook(() => 
      useVideoUrlFallback({
        originalUrl: 'https://example.com/video.mp4',
        hash: 'abc123',
        title: 'Test Video'
      })
    );

    await waitFor(() => {
      expect(result.current.isTestingUrls).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.workingUrl).toBe('https://blossom.band/abc123');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should return null if all URLs fail', async () => {
    // Mock all requests to fail
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => 
      useVideoUrlFallback({
        originalUrl: 'https://example.com/video.mp4',
        hash: 'abc123',
        title: 'Test Video'
      })
    );

    await waitFor(() => {
      expect(result.current.isTestingUrls).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.workingUrl).toBeNull();
    // Should have tried original URL + 5 fallback servers (6 total)
    expect(mockFetch).toHaveBeenCalledTimes(6);
  });

  it('should handle missing hash gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const { result } = renderHook(() => 
      useVideoUrlFallback({
        originalUrl: 'https://example.com/video.mp4',
        hash: '', // Empty hash
        title: 'Test Video'
      })
    );

    await waitFor(() => {
      expect(result.current.isTestingUrls).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.workingUrl).toBe('https://example.com/video.mp4');
    // Should only try original URL since no hash for fallbacks
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
