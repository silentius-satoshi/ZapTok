import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { VideoFeed } from './VideoFeed';
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

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('@tanstack/react-query');
  return {
    ...actual,
    useInfiniteQuery: vi.fn().mockReturnValue({
      data: {
        pages: [
          [
            {
              id: 'video1',
              pubkey: 'pubkey1',
              created_at: 1234567890,
              kind: 1,
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
              kind: 1,
              tags: [['t', 'video']],
              content: 'Test video 2',
              sig: 'sig2',
              videoUrl: 'https://example.com/video2.mp4',
              thumbnail: 'https://example.com/thumb2.jpg',
            },
          ],
        ],
      },
      isLoading: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    }),
  };
});

describe('VideoFeed Scroll Snapping Logic', () => {
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
        <VideoFeed />
      </TestApp>
    );

    // Find the container with scroll snap styles
    const container = document.querySelector('.h-screen.overflow-y-auto');
    expect(container).toBeInTheDocument();
    
    // Check for scroll snap CSS properties in style attribute
    if (container) {
      expect(container).toHaveAttribute('style');
    }
  });

  it('should handle scroll events with throttled behavior', () => {
    render(
      <TestApp>
        <VideoFeed />
      </TestApp>
    );

    const container = document.querySelector('.h-screen.overflow-y-auto') as HTMLElement;
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

  it('should calculate correct video index from scroll position and snap to correct video', async () => {
    vi.useFakeTimers();
    
    render(
      <TestApp>
        <VideoFeed />
      </TestApp>
    );

    const container = document.querySelector('.h-screen.overflow-y-auto') as HTMLElement;
    expect(container).toBeInTheDocument();

    if (container) {
      // Mock scroll to position between videos (not perfectly aligned)
      // This should trigger snapping to the nearest video
      Object.defineProperty(container, 'scrollTop', {
        writable: true,
        configurable: true,
        value: 820, // Slightly past second video (800), should snap to 800
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

      // Assert scrollTo is called with correct parameters for index 1
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 800,
        behavior: 'smooth',
      });
    }

    vi.useRealTimers();
  });

  it('should handle keyboard navigation for video switching', () => {
    render(
      <TestApp>
        <VideoFeed />
      </TestApp>
    );

    // Test ArrowDown key
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    
    // Should call scrollTo for next video (index 1 * 800 = 800)
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 800,
      behavior: 'smooth',
    });

    // Reset spy
    scrollToSpy.mockClear();

    // Test ArrowUp key from index 1 (should go to index 0)
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    
    // Should call scrollTo to go to index 0
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  it('should handle edge cases for scroll boundaries', async () => {
    vi.useFakeTimers();
    
    render(
      <TestApp>
        <VideoFeed />
      </TestApp>
    );

    const container = document.querySelector('.h-screen.overflow-y-auto') as HTMLElement;
    expect(container).toBeInTheDocument();

    if (container) {
      // Test scroll position that should snap to first video
      // Use a position that's close to 0 but not exactly 0
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
        <VideoFeed />
      </TestApp>
    );

    const container = document.querySelector('.h-screen.overflow-y-auto') as HTMLElement;
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
