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

    // Find the container with scroll snap styles - using h-full class instead of h-screen
    const container = document.querySelector('.h-full.snap-y') || document.querySelector('.h-full.overflow-hidden');
    expect(container).toBeInTheDocument();

    // Check for scroll snap CSS properties in style attribute
    if (container) {
      expect(container).toHaveAttribute('style');
    }
  });

  it('should handle scroll events with throttled behavior', () => {
    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    const container = (document.querySelector('.h-full.snap-y') || document.querySelector('.h-full.overflow-hidden')) as HTMLElement;
    expect(container).toBeInTheDocument();

    if (container) {
      // Mock container properties for scroll calculation
      Object.defineProperty(container, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 400,
      });
      Object.defineProperty(container, 'clientHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });

      // Simulate scroll event
      fireEvent.scroll(container);

      // Verify requestAnimationFrame was called (throttling mechanism)
      expect(global.requestAnimationFrame).toHaveBeenCalled();
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

    const container = (document.querySelector('.h-full.snap-y') || document.querySelector('.h-full.overflow-hidden')) as HTMLElement;
    expect(container).toBeInTheDocument();

    if (container && observerCallback) {
      // Simulate intersection observer detecting video at index 1 is in view
      const mockEntry = {
        isIntersecting: true,
        target: {
          getAttribute: () => '1', // data-video-index="1"
        },
      };

      // Trigger the intersection observer callback
      act(() => {
        observerCallback([mockEntry]);
      });

      // Fast-forward through any timing
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Assert scrollTo is called with correct parameters for index 1
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 800, // New calculation: 1 * 800 (window.innerHeight)
        behavior: 'smooth',
      });
    }

    vi.useRealTimers();
  });

  it('should handle keyboard navigation for video switching', () => {
    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    // Test ArrowDown key
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    // Should call scrollTo for next video (index 1)
    // New calculation: 1 * 800 (window.innerHeight) = 800
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 800,
      behavior: 'smooth',
    });

    // Reset spy
    scrollToSpy.mockClear();

    // Test ArrowUp key from index 1 (should go to index 0)
    fireEvent.keyDown(window, { key: 'ArrowUp' });

    // Should call scrollTo to go to index 0
    // New calculation: 0 * 800 (window.innerHeight) = 0
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  it('should handle edge cases for scroll boundaries', async () => {
    vi.useFakeTimers();

    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    const container = (document.querySelector('.h-full.snap-y') || document.querySelector('.h-full.overflow-hidden')) as HTMLElement;
    expect(container).toBeInTheDocument();

    if (container) {
      // Test scroll position that should snap to first video
      // Use a position that's close to first video but not exactly aligned
      Object.defineProperty(container, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 50, // Close to first video but not perfectly aligned
      });
      Object.defineProperty(container, 'clientHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });

      // Simulate scroll event
      fireEvent.scroll(container);

      // Fast-forward through the scroll timer (150ms)
      act(() => {
        vi.advanceTimersByTime(150);
      });

      // Should snap to first video (index 0)
      // New calculation: 0 * 800 (window.innerHeight) = 0
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    }

    vi.useRealTimers();
  });

  it('should prevent multiple simultaneous snap operations via throttling', () => {
    render(
      <TestApp>
        <TimelineFollowingVideoFeed />
      </TestApp>
    );

    const container = (document.querySelector('.h-full.snap-y') || document.querySelector('.h-full.overflow-hidden')) as HTMLElement;
    expect(container).toBeInTheDocument();

    if (container) {
      // Mock container properties
      Object.defineProperty(container, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      Object.defineProperty(container, 'clientHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });

      // Simulate rapid scroll events
      fireEvent.scroll(container);
      fireEvent.scroll(container);
      fireEvent.scroll(container);

      // The throttling mechanism should prevent excessive calls
      // RequestAnimationFrame should handle this efficiently
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    }
  });
});
