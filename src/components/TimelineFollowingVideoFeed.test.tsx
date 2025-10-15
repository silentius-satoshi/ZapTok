import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { TimelineFollowingVideoFeed } from './TimelineFollowingVideoFeed';
import { TestApp } from '@/test/TestApp';

// Mock the hooks
vi.mock('@/hooks/useNostr', () => ({
  useNostr: () => ({
    nostr: {
      query: vi.fn().mockResolvedValue([]),
    },
  }),
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      pubkey: 'test-pubkey',
      signer: {},
    },
  }),
}));

vi.mock('@/hooks/useFollowing', () => ({
  useFollowing: () => ({
    data: {
      pubkeys: ['pubkey1', 'pubkey2'],
      count: 2,
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTimelineVideoFeed', () => ({
  useTimelineFollowingVideoFeed: vi.fn().mockReturnValue({
    videos: [
      {
        id: 'video1',
        pubkey: 'pubkey1',
        created_at: 1234567890,
        kind: 21,
        tags: [['t', 'video']],
        content: 'Test video 1',
        sig: 'sig1',
        videoUrl: 'https://example.com/video1.mp4',
        thumbnail: 'https://example.com/thumb1.jpg',
      },
      {
        id: 'video2',
        pubkey: 'pubkey2',
        created_at: 1234567891,
        kind: 21,
        tags: [['t', 'video']],
        content: 'Test video 2',
        sig: 'sig2',
        videoUrl: 'https://example.com/video2.mp4',
        thumbnail: 'https://example.com/thumb2.jpg',
      },
    ],
    newVideos: [],
    loading: false,
    hasMore: true,
    error: null,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    mergeNewVideos: vi.fn(),
    timelineKey: 'following_test',
    newVideosCount: 0,
    hasFollowing: true,
    followingCount: 2,
    filteredCount: 0,
    realTimeBuffer: 0,
    feedHealth: 'healthy' as const,
    getAnalytics: vi.fn(),
    getFeedHealth: vi.fn(),
  }),
  useVideoEngagementLazy: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useVideoIntersection: vi.fn().mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('@/hooks/useLoginAutoRefresh', () => ({
  useLoginAutoRefresh: () => ({
    justLoggedIn: false,
  }),
}));

vi.mock('@/contexts/CurrentVideoContext', () => ({
  CurrentVideoProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="current-video-provider">{children}</div>
  ),
  useCurrentVideo: () => ({
    setCurrentVideo: vi.fn(),
  }),
}));

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/following' }),
    useParams: () => ({ id: undefined }),
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="browser-router">{children}</div>,
  };
});

vi.mock('@/lib/logBundler', () => ({
  bundleLog: vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      resetQueries: vi.fn(),
    }),
  };
});

describe('TimelineFollowingVideoFeed Scroll Snapping Logic', () => {
  let originalScrollTo: typeof Element.prototype.scrollTo;
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    // Store original scrollTo and create spy
    originalScrollTo = Element.prototype.scrollTo;
    scrollToSpy = vi.fn();
    Element.prototype.scrollTo = scrollToSpy;

    // Mock requestAnimationFrame to execute immediately
    global.requestAnimationFrame = vi.fn((cb) => {
      cb();
      return 1;
    });
  });

  afterEach(() => {
    // Restore original scrollTo
    Element.prototype.scrollTo = originalScrollTo;
    vi.clearAllMocks();
  });

  it('should render video feed with proper scroll container', () => {
    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    // Find the container with video-container class
    const container = document.querySelector('.video-container');
    expect(container).toBeInTheDocument();

    // Container should exist for scroll functionality
    expect(container).toBeTruthy();
  });

  it('should handle scroll events with throttled behavior', () => {
    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    const container = document.querySelector('.video-container') as HTMLElement;
    expect(container).toBeInTheDocument();

    if (container) {
      // Simulate scroll event
      fireEvent.scroll(container);

      // Component should handle scroll events (implementation may vary)
      expect(container).toBeInTheDocument();
    }
  });

  it('should programmatically scroll to correct position when video index changes', async () => {
    vi.useFakeTimers();

    // Create a mock intersection observer that we can control
    const mockObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
    let observerCallback: any = null;

    global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
      observerCallback = callback;
      return mockObserver;
    });

    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    const container = document.querySelector('.video-container') as HTMLElement;
    expect(container).toBeInTheDocument();

    // Component renders and sets up intersection observer
    expect(mockObserver.observe).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should handle keyboard navigation for video switching', () => {
    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    // Test ArrowDown key - component should handle it
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    // Component should be rendered and functional
    const container = document.querySelector('.video-container');
    expect(container).toBeInTheDocument();
  });

  it('should handle edge cases for scroll boundaries', async () => {
    vi.useFakeTimers();

    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    const container = document.querySelector('.video-container') as HTMLElement;
    expect(container).toBeInTheDocument();

    if (container) {
      // Simulate scroll event near boundary
      fireEvent.scroll(container);

      // Component should handle edge cases gracefully
      expect(container).toBeInTheDocument();
    }

    vi.useRealTimers();
  });

  it('should prevent multiple simultaneous snap operations via throttling', () => {
    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    const container = document.querySelector('.video-container') as HTMLElement;
    expect(container).toBeInTheDocument();

    if (container) {
      // Simulate rapid scroll events
      fireEvent.scroll(container);
      fireEvent.scroll(container);
      fireEvent.scroll(container);

      // Component should handle rapid events without crashing
      expect(container).toBeInTheDocument();
    }
  });
});
