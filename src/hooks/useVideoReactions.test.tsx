import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useVideoReactions } from './useVideoReactions';
import type { NostrEvent } from '@nostrify/nostrify';

// Mock useNostr hook
const mockQuery = vi.fn();
vi.mock('@nostrify/react', () => ({
  useNostr: () => ({
    nostr: {
      query: mockQuery,
    },
  }),
}));

// Mock AbortSignal.timeout
global.AbortSignal.timeout = vi.fn((timeout: number) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
});

describe('useVideoReactions', () => {
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

  it('should return correct reaction counts and totals', async () => {
    const videoId = 'test-video-id';
    
    // Mock events with reactions and zaps
    const mockEvents: NostrEvent[] = [
      // Reaction events (kind 7)
      {
        id: 'reaction1',
        kind: 7,
        pubkey: 'user1',
        content: '+',
        created_at: 1000,
        tags: [['e', videoId]],
        sig: 'sig1',
      },
      {
        id: 'reaction2',
        kind: 7,
        pubkey: 'user2',
        content: '❤️',
        created_at: 1001,
        tags: [['e', videoId]],
        sig: 'sig2',
      },
      // Zap events (kind 9735)
      {
        id: 'zap1',
        kind: 9735,
        pubkey: 'zapper1',
        content: '',
        created_at: 1004,
        tags: [
          ['e', videoId],
          ['bolt11', 'lnbc1000n1p0xlxxx...'], // 1000 millisats = 1 sat
        ],
        sig: 'zapsig1',
      },
    ];

    mockQuery.mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useVideoReactions(videoId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      likes: 2, // Both reaction emojis are valid likes
      zaps: 1, // 1 zap event
      userReactions: expect.any(Map),
      totalSats: 1, // 1 sat
    });

    // Verify query was called with correct parameters
    expect(mockQuery).toHaveBeenCalledWith(
      [
        {
          kinds: [7, 9735],
          '#e': [videoId],
          limit: 500,
        },
      ],
      { signal: expect.any(AbortSignal) }
    );
  });

  it('should return default values when videoId is empty', () => {
    const { result } = renderHook(() => useVideoReactions(''), {
      wrapper,
    });

    // When disabled, React Query initializes with isPending: true but doesn't execute
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Should not call nostr.query
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should handle empty events array', async () => {
    const videoId = 'test-video-id';
    mockQuery.mockResolvedValue([]);

    const { result } = renderHook(() => useVideoReactions(videoId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      likes: 0,
      zaps: 0,
      userReactions: new Map(),
      totalSats: 0,
    });
  });

  it('should deduplicate reactions by user (keep latest)', async () => {
    const videoId = 'test-video-id';
    
    // Mock events with duplicate reactions from same user
    const mockEvents: NostrEvent[] = [
      {
        id: 'reaction1',
        kind: 7,
        pubkey: 'user1',
        content: '+',
        created_at: 1000,
        tags: [['e', videoId]],
        sig: 'sig1',
      },
      {
        id: 'reaction2',
        kind: 7,
        pubkey: 'user1', // Same user
        content: '❤️',
        created_at: 1001, // Later timestamp
        tags: [['e', videoId]],
        sig: 'sig2',
      },
    ];

    mockQuery.mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useVideoReactions(videoId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      likes: 1, // Only 1 unique user (user1's latest reaction)
      zaps: 0,
      userReactions: expect.any(Map),
      totalSats: 0,
    });

    // Verify the Map contains the latest reaction from user1
    const userReactions = result.current.data!.userReactions;
    expect(userReactions.get('user1')?.content).toBe('❤️'); // Latest reaction
  });

  it('should parse zap amounts correctly from bolt11 tags', async () => {
    const videoId = 'test-video-id';
    
    // Mock zap events with different amounts
    const mockEvents: NostrEvent[] = [
      {
        id: 'zap1',
        kind: 9735,
        pubkey: 'zapper1',
        content: '',
        created_at: 1000,
        tags: [
          ['e', videoId],
          ['bolt11', 'lnbc10000n1p0xlxxx...'], // 10000 millisats = 10 sats
        ],
        sig: 'zapsig1',
      },
      {
        id: 'zap2',
        kind: 9735,
        pubkey: 'zapper2',
        content: '',
        created_at: 1001,
        tags: [
          ['e', videoId],
          ['bolt11', 'lnbc1500n1p0xlxxx...'], // 1500 millisats = 1 sat (rounded down)
        ],
        sig: 'zapsig2',
      },
    ];

    mockQuery.mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useVideoReactions(videoId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      likes: 0,
      zaps: 2,
      userReactions: expect.any(Map),
      totalSats: 11, // 10 + 1 sats
    });
  });
});
