# Testing Considerations: Hook Refactoring for Better Testability

## Overview

The current video-related hooks (`useVideoReactions`, `useVideoUrl`, `useVideoUrlFallback`) exhibit complex async patterns that make them difficult to test effectively. This document outlines strategies for refactoring these hooks to improve testability while maintaining production functionality.

## Current Testing Challenges

### 1. Async Operation Complexity
- **Issue**: Hooks use `Promise.allSettled`, `Promise.race`, and `AbortSignal.timeout` in complex combinations
- **Impact**: Difficult to mock and control timing in test environments
- **Current State**: Tests fail because async operations don't complete properly in mocked environments

### 2. Tight Coupling to Browser APIs
- **Issue**: Direct usage of `fetch` and `AbortSignal.timeout` without abstraction
- **Impact**: Hard to mock these APIs consistently across different test scenarios
- **Current State**: Mock implementations don't behave identically to browser APIs

### 3. React Query Integration
- **Issue**: Complex async logic embedded within React Query's `queryFn`
- **Impact**: React Query's internal state management conflicts with test expectations
- **Current State**: `isPending` stays `true` indefinitely in tests despite operations appearing to start

## Proposed Refactoring Strategies

### Strategy 1: Extract Async Logic into Separate Functions

#### Current Pattern (Problematic)
```typescript
// Inside useVideoUrl hook
const { data, isPending } = useQuery({
  queryKey: ['video-url', videoId],
  queryFn: async (context) => {
    const signal = AbortSignal.any([
      context.signal,
      AbortSignal.timeout(1500)
    ]);

    const responses = await Promise.allSettled(
      servers.map(server =>
        fetch(`${server}/video/${videoId}`, { signal })
      )
    );

    // Complex processing logic...
  }
});
```

#### Refactored Pattern (Testable)
```typescript
// Extract async logic to separate function
async function fetchVideoFromServers(
  videoId: string,
  servers: string[],
  signal: AbortSignal,
  fetchFn: typeof fetch = fetch,
  timeoutFn: typeof AbortSignal.timeout = AbortSignal.timeout
): Promise<VideoUrlResult> {
  const timeoutSignal = timeoutFn(1500);
  const combinedSignal = AbortSignal.any([signal, timeoutSignal]);

  const responses = await Promise.allSettled(
    servers.map(server =>
      fetchFn(`${server}/video/${videoId}`, { signal: combinedSignal })
    )
  );

  // Processing logic...
  return processResponses(responses);
}

// Hook becomes simpler
export function useVideoUrl(videoId: string) {
  const { data, isPending } = useQuery({
    queryKey: ['video-url', videoId],
    queryFn: (context) => fetchVideoFromServers(videoId, SERVERS, context.signal)
  });

  return { data, isPending };
}
```

#### Benefits
- **Testability**: `fetchVideoFromServers` can be tested independently
- **Mocking**: Easy to inject mock `fetchFn` and `timeoutFn`
- **Separation**: Business logic separated from React concerns

### Strategy 2: Dependency Injection for Browser APIs

#### Current Pattern (Problematic)
```typescript
// Hard to mock AbortSignal.timeout and fetch
const signal = AbortSignal.any([
  context.signal,
  AbortSignal.timeout(1500)  // Can't easily mock
]);

const response = await fetch(url, { signal });  // Can't easily mock
```

#### Refactored Pattern (Testable)
```typescript
// Define interface for dependencies
interface AsyncDependencies {
  fetch: typeof fetch;
  createTimeoutSignal: (ms: number) => AbortSignal;
  combineSignals: (signals: AbortSignal[]) => AbortSignal;
}

// Default implementation
const defaultDeps: AsyncDependencies = {
  fetch,
  createTimeoutSignal: (ms) => AbortSignal.timeout(ms),
  combineSignals: (signals) => AbortSignal.any(signals)
};

// Hook accepts dependencies
export function useVideoUrl(
  videoId: string,
  deps: AsyncDependencies = defaultDeps
) {
  const { data, isPending } = useQuery({
    queryKey: ['video-url', videoId],
    queryFn: async (context) => {
      const timeoutSignal = deps.createTimeoutSignal(1500);
      const combinedSignal = deps.combineSignals([context.signal, timeoutSignal]);

      const response = await deps.fetch(`${SERVER}/video/${videoId}`, {
        signal: combinedSignal
      });

      return response.json();
    }
  });

  return { data, isPending };
}
```

#### Test Implementation
```typescript
describe('useVideoUrl', () => {
  it('handles timeout correctly', async () => {
    const mockDeps: AsyncDependencies = {
      fetch: vi.fn().mockRejectedValue(new Error('Timeout')),
      createTimeoutSignal: vi.fn().mockReturnValue(new AbortController().signal),
      combineSignals: vi.fn().mockReturnValue(new AbortController().signal)
    };

    // Test with injected dependencies
    const { result } = renderHook(() => useVideoUrl('test-id', mockDeps));

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});
```

### Strategy 3: Simplify Async Flow for Test Scenarios

#### Current Pattern (Problematic)
```typescript
// Complex Promise.allSettled with race conditions
const results = await Promise.allSettled([
  fetch(server1),
  fetch(server2),
  fetch(server3)
]);

// Complex processing of mixed success/failure results
const successful = results
  .filter((result): result is PromiseFulfilledResult<Response> =>
    result.status === 'fulfilled' && result.value.ok
  )
  .map(result => result.value);
```

#### Refactored Pattern (Testable)
```typescript
// Break down into simpler, sequential operations
async function tryFetchFromServer(
  server: string,
  videoId: string,
  signal: AbortSignal,
  fetchFn: typeof fetch
): Promise<VideoUrlResult | null> {
  try {
    const response = await fetchFn(`${server}/video/${videoId}`, { signal });
    if (!response.ok) return null;

    const data = await response.json();
    return { url: data.url, server };
  } catch {
    return null;
  }
}

// Simplified hook logic
export function useVideoUrl(videoId: string) {
  const [result, setResult] = useState<VideoUrlResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const fetchVideo = async () => {
      for (const server of SERVERS) {
        if (isCancelled) return;

        const result = await tryFetchFromServer(server, videoId, AbortSignal.timeout(1000));
        if (result) {
          if (!isCancelled) {
            setResult(result);
            setIsLoading(false);
          }
          return;
        }
      }

      if (!isCancelled) {
        setIsLoading(false);
      }
    };

    fetchVideo();

    return () => { isCancelled = true; };
  }, [videoId]);

  return { data: result, isPending: isLoading };
}
```

## Implementation Roadmap

### Phase 1: Extract Core Functions
1. Create `videoFetchUtils.ts` with extracted async functions
2. Define clear interfaces for dependencies
3. Write comprehensive unit tests for extracted functions

### Phase 2: Refactor Hooks
1. Update hooks to use extracted functions
2. Implement dependency injection pattern
3. Maintain backward compatibility with existing API

### Phase 3: Test Infrastructure
1. Create mock implementations for all dependencies
2. Update existing tests to use new patterns
3. Add integration tests for end-to-end flows

### Phase 4: Migration
1. Update components using these hooks
2. Remove old test files
3. Update documentation

## Benefits of Refactoring

### Testability Improvements
- **Unit Testing**: Individual functions can be tested in isolation
- **Mock Control**: Easy to inject controlled dependencies
- **Deterministic Tests**: No more timing-dependent failures
- **Coverage**: Better test coverage of edge cases

### Code Quality Benefits
- **Separation of Concerns**: Async logic separated from React logic
- **Reusability**: Core functions can be reused across hooks
- **Maintainability**: Easier to modify and extend functionality
- **Debugging**: Simpler to isolate and fix issues

### Development Experience
- **Faster Tests**: Tests run faster without complex async setups
- **Reliable CI/CD**: More stable test suite for continuous integration
- **Developer Confidence**: Better test coverage reduces regression risk

## Migration Strategy

### Backward Compatibility
- Keep existing hook APIs unchanged
- Add optional dependency injection parameters
- Support both old and new patterns during transition

### Gradual Rollout
1. Start with `useVideoUrl` (simplest case)
2. Move to `useVideoUrlFallback` (moderate complexity)
3. Finish with `useVideoReactions` (most complex)
4. Update tests incrementally

### Risk Mitigation
- Comprehensive test coverage before refactoring
- Feature flags for gradual rollout
- Rollback plan if issues arise
- Pair programming for complex changes

## Success Metrics

### Test Quality Metrics
- **Test Execution Time**: Reduce from current ~30s to <10s
- **Test Reliability**: Achieve 100% pass rate in CI/CD
- **Test Coverage**: Maintain or improve current coverage levels
- **Flaky Test Rate**: Reduce to 0%

### Code Quality Metrics
- **Cyclomatic Complexity**: Reduce in hook functions
- **Function Length**: Keep functions under 20 lines
- **Dependency Count**: Minimize external dependencies in tests
- **Mock Complexity**: Simplify mock setup requirements

## Conclusion

Refactoring these hooks for better testability will significantly improve the development experience and code reliability. The proposed strategies provide a clear path forward while maintaining production functionality and backward compatibility.

The key is to start small with the simplest hook, prove the approach works, then scale to the more complex cases. This will ensure a smooth transition with minimal risk to the existing codebase.