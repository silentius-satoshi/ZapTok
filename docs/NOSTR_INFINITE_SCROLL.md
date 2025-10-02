# Nostr Infinite Scroll Implementation Guide

This guide covers implementing infinite scroll patterns for Nostr event feeds, including performance optimizations and best practices.

## Overview

Infinite scroll in Nostr applications requires careful handling of event pagination, deduplication, and performance optimization due to the decentralized nature of the protocol.

## Core Concepts

### Event Pagination Strategies

Nostr uses time-based pagination with `since` and `until` parameters:

```typescript
interface NostrFilter {
  kinds?: number[];
  authors?: string[];
  since?: number;    // Unix timestamp - events newer than this
  until?: number;    // Unix timestamp - events older than this
  limit?: number;    // Maximum events to return
}
```

### Pagination Patterns

1. **Backward Pagination** (Most common): Load older events as user scrolls
2. **Forward Pagination**: Load newer events (for real-time updates)
3. **Bidirectional**: Support both directions

## Implementation Patterns

### 1. Basic Infinite Scroll Hook

```typescript
function useInfiniteNostrFeed(
  baseFilters: Omit<NostrFilter, 'until' | 'limit'>,
  pageSize: number = 20
) {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['nostr-feed', baseFilters],
    queryFn: async ({ pageParam, signal }) => {
      const filters: NostrFilter[] = [{
        ...baseFilters,
        limit: pageSize,
        until: pageParam, // pageParam is the timestamp cursor
      }];

      const events = await nostr.query(filters, { signal });
      
      // Sort by created_at descending (newest first)
      const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);
      
      return {
        events: sortedEvents,
        nextCursor: sortedEvents.length > 0 
          ? sortedEvents[sortedEvents.length - 1].created_at 
          : null,
      };
    },
    initialPageParam: undefined, // Start from "now"
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30000, // Cache for 30 seconds
  });
}
```

### 2. Event Deduplication

Handle duplicate events that may come from multiple relays:

```typescript
function useInfiniteNostrFeed(baseFilters: NostrFilter, pageSize: number = 20) {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['nostr-feed', baseFilters],
    queryFn: async ({ pageParam, signal }) => {
      const filters: NostrFilter[] = [{
        ...baseFilters,
        limit: pageSize * 2, // Request more to account for deduplication
        until: pageParam,
      }];

      const events = await nostr.query(filters, { signal });
      const deduplicated = deduplicateEvents(events);
      
      // Take only the requested page size after deduplication
      const pageEvents = deduplicated
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, pageSize);
      
      return {
        events: pageEvents,
        nextCursor: pageEvents.length > 0 
          ? pageEvents[pageEvents.length - 1].created_at 
          : null,
      };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

function deduplicateEvents(events: NostrEvent[]): NostrEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}
```

### 3. UI Component with Intersection Observer

```tsx
function InfiniteNostrFeed({ 
  filters, 
  renderEvent,
  emptyState,
  className 
}: {
  filters: Omit<NostrFilter, 'until' | 'limit'>;
  renderEvent: (event: NostrEvent) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteNostrFeed(filters);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px', // Start loading 100px before reaching the end
  });

  // Fetch next page when scroll trigger is visible
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single array
  const allEvents = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.events);
  }, [data?.pages]);

  if (isLoading) {
    return <FeedSkeleton className={className} />;
  }

  if (error) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-red-500">Failed to load feed</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (allEvents.length === 0) {
    return emptyState || (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        No events found
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {allEvents.map((event, index) => (
          <div key={`${event.id}-${index}`}>
            {renderEvent(event)}
          </div>
        ))}
      </div>

      {/* Loading trigger */}
      <div ref={ref} className="py-4">
        {isFetchingNextPage && (
          <div className="flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}
        
        {!hasNextPage && allEvents.length > 0 && (
          <div className="text-center text-gray-500">
            End of feed
          </div>
        )}
      </div>
    </div>
  );
}
```

## Advanced Patterns

### 1. Virtual Scrolling for Performance

For feeds with thousands of events:

```typescript
import { FixedSizeList as List } from 'react-window';

function VirtualizedNostrFeed({ filters }: { filters: NostrFilter }) {
  const { data, fetchNextPage, hasNextPage } = useInfiniteNostrFeed(filters);
  const allEvents = data?.pages.flatMap(page => page.events) || [];

  const Row = ({ index, style }: { index: number; style: CSSProperties }) => {
    const event = allEvents[index];
    
    // Trigger next page load when nearing the end
    if (index === allEvents.length - 5 && hasNextPage) {
      fetchNextPage();
    }

    if (!event) {
      return <div style={style}><Skeleton /></div>;
    }

    return (
      <div style={style}>
        <EventCard event={event} />
      </div>
    );
  };

  return (
    <List
      height={600}
      itemCount={allEvents.length + (hasNextPage ? 1 : 0)}
      itemSize={200}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

### 2. Real-time Updates

Combine infinite scroll with real-time subscription:

```typescript
function useInfiniteNostrFeedWithRealtime(
  baseFilters: NostrFilter,
  pageSize: number = 20
) {
  const infiniteQuery = useInfiniteNostrFeed(baseFilters, pageSize);
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  // Subscribe to real-time events
  useEffect(() => {
    const subscription = nostr.req([{
      ...baseFilters,
      since: Math.floor(Date.now() / 1000), // Only new events
    }]);

    subscription.on('event', (event: NostrEvent) => {
      queryClient.setQueryData(
        ['nostr-feed', baseFilters],
        (oldData: InfiniteData<any>) => {
          if (!oldData?.pages[0]) return oldData;

          // Add new event to the first page
          const firstPage = oldData.pages[0];
          const updatedFirstPage = {
            ...firstPage,
            events: [event, ...firstPage.events],
          };

          return {
            ...oldData,
            pages: [updatedFirstPage, ...oldData.pages.slice(1)],
          };
        }
      );
    });

    return () => subscription.close();
  }, [baseFilters, nostr, queryClient]);

  return infiniteQuery;
}
```

### 3. Filter-based Feed Switching

Handle dynamic filter changes:

```typescript
function useFilteredInfiniteFeed(
  baseFilters: NostrFilter,
  activeFilter: string
) {
  const enhancedFilters = useMemo(() => {
    switch (activeFilter) {
      case 'following':
        return { ...baseFilters, authors: followingList };
      case 'trending':
        return { ...baseFilters, '#t': ['trending'] };
      case 'recent':
        return { ...baseFilters, since: getRecentTimestamp() };
      default:
        return baseFilters;
    }
  }, [baseFilters, activeFilter]);

  return useInfiniteNostrFeed(enhancedFilters);
}

function FilteredFeed() {
  const [activeFilter, setActiveFilter] = useState('recent');
  const { data, fetchNextPage, hasNextPage } = useFilteredInfiniteFeed(
    { kinds: [1] },
    activeFilter
  );

  return (
    <div>
      <FilterTabs 
        active={activeFilter} 
        onChange={setActiveFilter}
        options={['recent', 'following', 'trending']}
      />
      
      <InfiniteEventList 
        data={data}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
      />
    </div>
  );
}
```

## Performance Optimizations

### 1. Event Validation and Filtering

```typescript
function validateAndFilterEvents(events: NostrEvent[]): NostrEvent[] {
  return events.filter(event => {
    // Basic validation
    if (!event.id || !event.pubkey || !event.created_at) return false;
    
    // Content filtering
    if (event.content && event.content.length > 10000) return false;
    
    // Spam detection
    if (isSpamEvent(event)) return false;
    
    return true;
  });
}

function isSpamEvent(event: NostrEvent): boolean {
  // Implement spam detection logic
  const spamKeywords = ['spam', 'scam', 'crypto-giveaway'];
  return spamKeywords.some(keyword => 
    event.content.toLowerCase().includes(keyword)
  );
}
```

### 2. Optimistic Updates

```typescript
function useOptimisticEventUpdate() {
  const queryClient = useQueryClient();

  const addEventOptimistically = (
    queryKey: QueryKey,
    newEvent: NostrEvent
  ) => {
    queryClient.setQueryData(queryKey, (oldData: InfiniteData<any>) => {
      if (!oldData?.pages[0]) return oldData;

      const firstPage = oldData.pages[0];
      return {
        ...oldData,
        pages: [
          {
            ...firstPage,
            events: [newEvent, ...firstPage.events],
          },
          ...oldData.pages.slice(1),
        ],
      };
    });
  };

  return { addEventOptimistically };
}
```

### 3. Background Prefetching

```typescript
function usePrefetchNextPage(
  baseFilters: NostrFilter,
  currentPage: number
) {
  const queryClient = useQueryClient();
  const { nostr } = useNostr();

  useEffect(() => {
    // Prefetch next page in background
    const prefetchTimer = setTimeout(() => {
      queryClient.prefetchInfiniteQuery({
        queryKey: ['nostr-feed', baseFilters],
        queryFn: async ({ pageParam }) => {
          const events = await nostr.query([{
            ...baseFilters,
            until: pageParam,
            limit: 20,
          }]);
          
          return {
            events: events.sort((a, b) => b.created_at - a.created_at),
            nextCursor: events[events.length - 1]?.created_at,
          };
        },
      });
    }, 1000);

    return () => clearTimeout(prefetchTimer);
  }, [currentPage, baseFilters, queryClient, nostr]);
}
```

## Error Handling and Retry Logic

```typescript
function useRobustInfiniteFeed(baseFilters: NostrFilter) {
  return useInfiniteQuery({
    queryKey: ['nostr-feed', baseFilters],
    queryFn: async ({ pageParam, signal }) => {
      const maxRetries = 3;
      let lastError: Error;

      for (let i = 0; i < maxRetries; i++) {
        try {
          const events = await nostr.query([{
            ...baseFilters,
            until: pageParam,
            limit: 20,
          }], { signal });

          return {
            events: events.sort((a, b) => b.created_at - a.created_at),
            nextCursor: events[events.length - 1]?.created_at,
          };
        } catch (error) {
          lastError = error as Error;
          
          if (error.name === 'AbortError') throw error;
          
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, i) * 1000)
          );
        }
      }

      throw lastError;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: false, // Handle retries manually
  });
}
```

## Best Practices

### 1. Memory Management

- **Limit pages in memory**: Remove old pages when many are loaded
- **Clear unused data**: Clean up data when filters change
- **Optimize re-renders**: Use React.memo for event components

### 2. User Experience

- **Loading states**: Show skeletons while loading
- **Error boundaries**: Handle and display errors gracefully
- **Scroll restoration**: Maintain scroll position on navigation
- **Pull-to-refresh**: Add pull-to-refresh on mobile

### 3. Accessibility

- **Focus management**: Handle focus for new content
- **Screen reader support**: Announce new content loading
- **Keyboard navigation**: Support keyboard scrolling
- **Reduced motion**: Respect user motion preferences

### 4. Testing

```typescript
// Mock infinite scroll hook for testing
const mockUseInfiniteNostrFeed = jest.fn().mockReturnValue({
  data: {
    pages: [
      { 
        events: [mockEvent1, mockEvent2], 
        nextCursor: 1640000000 
      }
    ]
  },
  fetchNextPage: jest.fn(),
  hasNextPage: true,
  isFetchingNextPage: false,
  isLoading: false,
  error: null,
});

test('renders events correctly', () => {
  render(<InfiniteNostrFeed filters={{ kinds: [1] }} />);
  expect(screen.getByText(mockEvent1.content)).toBeInTheDocument();
});
```

This guide provides a comprehensive foundation for implementing performant infinite scroll in Nostr applications. Adapt these patterns based on your specific use case and performance requirements.