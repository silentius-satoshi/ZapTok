import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useVideoUrl } from './useVideoUrl';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useVideoUrl', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return video URLs when servers are available', async () => {
    const hash = 'test-hash-123';
    
    // Mock successful responses from multiple servers
    mockFetch.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useVideoUrl(hash), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      primaryUrl: 'https://blossom.primal.net/test-hash-123',
      fallbackUrls: [
        'https://cdn.satellite.earth/test-hash-123',
        'https://files.nostr.band/test-hash-123'
      ],
      lastChecked: expect.any(Number),
    });

    // Verify correct server URLs were tested
    expect(mockFetch).toHaveBeenCalledWith(
      'https://blossom.primal.net/test-hash-123',
      { method: 'HEAD', signal: expect.any(AbortSignal) }
    );
  });

  it('should be disabled when hash is empty', () => {
    const { result } = renderHook(() => useVideoUrl(''), {
      wrapper,
    });

    // When disabled, React Query initializes with isPending: true but doesn't execute
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle network errors gracefully', async () => {
    const hash = 'network-error-hash';
    
    // Mock network errors on all server calls
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useVideoUrl(hash), {
      wrapper,
    });

    // First ensure the query starts
    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    }, { timeout: 5000 }); // Increased timeout for retries

    expect(result.current.error).toEqual(
      new Error('No working video servers found')
    );
  });
});
