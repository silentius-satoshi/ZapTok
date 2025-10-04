# Option A vs Option B: Refactoring Scope Analysis

> **Date**: October 3, 2025  
> **Purpose**: Detailed comparison of implementation effort between component-level (Option A) and hook-level (Option B) integration

---

## TL;DR: Refactoring Scope

| Aspect | Option A (Component-Level) | Option B (Hook-Level) |
|--------|---------------------------|----------------------|
| **Files to Create** | 1 file | 1 file |
| **Files to Modify** | 3 files | 1 file |
| **Lines Changed** | ~120 lines | ~30 lines |
| **Test Updates** | 2 test files | 0 test files |
| **Risk Level** | 🟡 Medium | 🟢 Low |
| **Time Estimate** | 2-3 hours | 45 minutes |
| **Breaking Changes** | Yes (hook signature) | No |

---

## Option A: Component-Level Integration (Jumble's Pattern)

### What Gets Refactored

#### 1. **Create New Hook: `useFollowingFavoriteRelays.ts`** ✅ SAME AS OPTION B

```typescript
// /src/hooks/useFollowingFavoriteRelays.ts (NEW - 20 lines)
import { useQuery } from '@tanstack/react-query';
import { FollowingFavoriteRelaysService } from '@/services/followingFavoriteRelays.service';

export function useFollowingFavoriteRelays(
  pubkey: string | undefined,
  followings: string[]
) {
  return useQuery({
    queryKey: ['following-favorite-relays', pubkey, followings.join(',')],
    queryFn: async () => {
      if (!pubkey || followings.length === 0) return [];
      const service = FollowingFavoriteRelaysService.getInstance();
      return await service.fetchFollowingFavoriteRelays(pubkey, followings);
    },
    enabled: !!pubkey && followings.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
```

#### 2. **Refactor `useOptimizedFollowingVideoFeed`** ⚠️ BREAKING CHANGE

**Current Signature** (343 lines in FollowingVideoFeed.tsx depend on this):
```typescript
export function useOptimizedFollowingVideoFeed(options: {
  pageSize?: number;
  maxAuthors?: number;
  cacheDuration?: number;
} = {})
```

**New Signature** (Option A - accepts relay URLs):
```typescript
export function useOptimizedFollowingVideoFeed(
  relays: string[],  // ⚠️ NEW REQUIRED PARAMETER
  options: {
    pageSize?: number;
    maxAuthors?: number;
    cacheDuration?: number;
  } = {}
)
```

**Changes Required** (~40 lines):
```diff
export function useOptimizedFollowingVideoFeed(
+ relays: string[],  // Component now passes optimized relays
  options: {
    pageSize?: number;
    maxAuthors?: number;
    cacheDuration?: number;
  } = {}
) {
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
- const { simplePool, simplePoolRelays } = useSimplePool();
+ const { simplePool } = useSimplePool();
  const { getOptimalRelaysForQuery } = useNostrConnectionState();

  const {
    pageSize = 15,
    maxAuthors = 50,
    cacheDuration = 3 * 60 * 1000,
  } = options;

  return useInfiniteQuery({
-   queryKey: ['optimized-following-feed', following.data?.pubkeys?.slice(0, maxAuthors), { pageSize }],
+   queryKey: ['optimized-following-feed', relays, following.data?.pubkeys?.slice(0, maxAuthors), { pageSize }],
    queryFn: async ({ pageParam, signal }): Promise<OptimizedFeedPage> => {
      // ... existing logic ...
      
-     return simplePool.querySync(simplePoolRelays, filter);
+     return simplePool.querySync(relays, filter);  // Use passed relays
    },
  });
}
```

#### 3. **Update `FollowingVideoFeed.tsx` Component** ⚠️ MAJOR REFACTOR

**Current Code** (lines 1-60):
```typescript
export const FollowingVideoFeed = forwardRef<FollowingVideoFeedRef>((props, ref) => {
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
  // ... other hooks ...

  // Direct hook call
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useOptimizedFollowingVideoFeed({
    pageSize: 15,
    maxAuthors: 50,
    cacheDuration: 3 * 60 * 1000,
  });
  
  // ... rest of component (280+ lines) ...
});
```

**New Code** (Option A - ~60 lines changed):
```typescript
export const FollowingVideoFeed = forwardRef<FollowingVideoFeedRef>((props, ref) => {
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
+ const { simplePoolRelays } = useSimplePool();
+ const [optimizedRelays, setOptimizedRelays] = useState<string[]>(simplePoolRelays);
  // ... other hooks ...

+ // Fetch and set optimized relays (NEW - ~30 lines)
+ const { data: favoriteRelays, isLoading: isLoadingRelays } = useFollowingFavoriteRelays(
+   user?.pubkey,
+   following.data?.pubkeys || []
+ );
+ 
+ useEffect(() => {
+   if (!favoriteRelays || favoriteRelays.length === 0) {
+     setOptimizedRelays(simplePoolRelays); // Fallback
+     return;
+   }
+   
+   // Use top 5 relays by popularity
+   const relays = favoriteRelays.map(([url]) => url).slice(0, 5);
+   setOptimizedRelays(relays);
+   
+   bundleLog('relayOptimization', `🎯 Using ${relays.length} optimized relays for following feed`);
+ }, [favoriteRelays, simplePoolRelays]);

  // Modified hook call - now passes relays
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
- } = useOptimizedFollowingVideoFeed({
+ } = useOptimizedFollowingVideoFeed(optimizedRelays, {  // ⚠️ NEW PARAMETER
    pageSize: 15,
    maxAuthors: 50,
    cacheDuration: 3 * 60 * 1000,
  });
  
+ // Update loading state to include relay fetching
+ const isComponentLoading = isLoading || isLoadingRelays;
  
  // ... rest of component (280+ lines) ...
- if (isLoading) {
+ if (isComponentLoading) {
    return <LoadingState />;
  }
});
```

#### 4. **Update `FollowingVideoFeed.test.tsx`** ⚠️ TEST REFACTOR

**Current Mock** (line 35):
```typescript
useOptimizedFollowingVideoFeed: vi.fn().mockReturnValue({
  data: mockData,
  // ...
}),
```

**New Mock** (Option A):
```typescript
// Need to add new mock
useFollowingFavoriteRelays: vi.fn().mockReturnValue({
  data: [
    ['wss://relay1.example.com', ['pubkey1', 'pubkey2']],
    ['wss://relay2.example.com', ['pubkey3']],
  ],
  isLoading: false,
}),

// Update existing mock to accept relays parameter
useOptimizedFollowingVideoFeed: vi.fn().mockImplementation((relays, options) => ({
  data: mockData,
  // ...
})),
```

#### 5. **Update Any Other Components Using the Hook** ⚠️ POTENTIAL CASCADE

If `useOptimizedFollowingVideoFeed` is used elsewhere (need to check):
```bash
# Search for all usages
grep -r "useOptimizedFollowingVideoFeed" src/
```

Each usage would need the same refactoring pattern.

---

## Option B: Hook-Level Integration (Recommended)

### What Gets Refactored

#### 1. **Create New Hook: `useFollowingFavoriteRelays.ts`** ✅ SAME AS OPTION A

```typescript
// /src/hooks/useFollowingFavoriteRelays.ts (NEW - 20 lines)
// ... IDENTICAL to Option A ...
```

#### 2. **Update `useOptimizedFollowingVideoFeed` INTERNALLY** ✅ NO BREAKING CHANGES

**Changes Required** (~10 lines inside the hook):
```diff
export function useOptimizedFollowingVideoFeed(options: {
  pageSize?: number;
  maxAuthors?: number;
  cacheDuration?: number;
} = {}) {  // ✅ Signature stays the same - NO breaking changes
  const { user } = useCurrentUser();
  const following = useFollowing(user?.pubkey || '');
  const { simplePool, simplePoolRelays } = useSimplePool();
  const { getOptimalRelaysForQuery } = useNostrConnectionState();

+ // ✅ Add: Fetch favorite relays
+ const { data: favoriteRelays } = useFollowingFavoriteRelays(
+   user?.pubkey,
+   following.data?.pubkeys || []
+ );
+ 
+ // ✅ Add: Use optimized relays (top 5 by popularity)
+ const optimizedRelays = useMemo(() => {
+   if (!favoriteRelays || favoriteRelays.length === 0) {
+     return simplePoolRelays; // Fallback to default
+   }
+   return favoriteRelays.map(([url]) => url).slice(0, 5);
+ }, [favoriteRelays, simplePoolRelays]);

  const {
    pageSize = 15,
    maxAuthors = 50,
    cacheDuration = 3 * 60 * 1000,
  } = options;

  return useInfiniteQuery({
-   queryKey: ['optimized-following-feed', following.data?.pubkeys?.slice(0, maxAuthors), { pageSize }],
+   queryKey: ['optimized-following-feed', optimizedRelays, following.data?.pubkeys?.slice(0, maxAuthors), { pageSize }],
    queryFn: async ({ pageParam, signal }): Promise<OptimizedFeedPage> => {
      // ... existing logic ...
      
-     return simplePool.querySync(simplePoolRelays, filter);
+     return simplePool.querySync(optimizedRelays, filter);  // ✅ Use optimized relays
    },
  });
}
```

#### 3. **No Component Changes** ✅

```typescript
// FollowingVideoFeed.tsx - STAYS EXACTLY THE SAME
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  error,
} = useOptimizedFollowingVideoFeed({  // ✅ Same call, new behavior
  pageSize: 15,
  maxAuthors: 50,
  cacheDuration: 3 * 60 * 1000,
});
```

#### 4. **No Test Changes** ✅

Existing test mocks continue to work without modification.

---

## Flexibility Comparison

### What Flexibility Does Option A Provide?

**Jumble's Use Case**:
```typescript
// Different feed types can use different relay strategies
export function FollowingFeed() {
  const relays = await client.generateSubRequestsForPubkeys(followings, pubkey);
  return <NormalFeed subRequests={relays} />;
}

export function GlobalFeed() {
  const relays = BIG_RELAY_URLS; // Different strategy
  return <NormalFeed subRequests={relays} />;
}

export function RelayFeed({ relayUrl }) {
  const relays = [relayUrl]; // Different strategy
  return <NormalFeed subRequests={relays} />;
}
```

**ZapTok's Current Architecture**:
```typescript
// Already have separate hooks for different strategies
useOptimizedFollowingVideoFeed()  // For following feed
useOptimizedGlobalVideoFeed()     // For global feed  
// Could add: useOptimizedRelayVideoFeed(relayUrl)
```

**Analysis**: ✅ **ZapTok already has this flexibility** via separate hook functions. We don't need component-level control.

### What Flexibility Would We Gain with Option A?

1. **Runtime relay switching** - Component can change relays dynamically
   - **ZapTok Need?**: ❌ No - relay strategy is tied to feed type, not runtime state
   
2. **Testing flexibility** - Can inject mock relays easily
   - **ZapTok Need?**: ❌ No - already mock hooks in tests
   
3. **Multi-strategy feeds** - One component, multiple relay sources
   - **ZapTok Need?**: ❌ No - each feed type is a separate component

### What Flexibility Would We Lose with Option B?

**None** - The flexibility Jumble gains from component-level integration, ZapTok already has via:
- Separate hook functions per feed type
- Hook-level configuration via options parameter
- React Query's built-in caching/invalidation

---

## Risk Assessment

### Option A Risks

1. **Breaking Change** 🔴 HIGH RISK
   - Changes hook signature
   - Requires updating all call sites
   - Could break in unexpected places

2. **Test Complexity** 🟡 MEDIUM RISK
   - Need to update all mocks
   - Need to test relay selection logic
   - More complex test scenarios

3. **Component Bloat** 🟡 MEDIUM RISK
   - Components get relay management logic
   - Harder to reuse across feed types
   - More useState/useEffect noise

4. **Regression Potential** 🔴 HIGH RISK
   - Large refactor touches critical path
   - Following feed is core feature
   - More surface area for bugs

### Option B Risks

1. **Hook Complexity** 🟢 LOW RISK
   - Changes are isolated to one hook
   - No breaking changes
   - Easy to test in isolation

2. **Performance** 🟢 NEGLIGIBLE
   - One additional hook call
   - React Query handles caching
   - Minimal overhead

3. **Regression Potential** 🟢 LOW RISK
   - Small, targeted change
   - Easy to rollback
   - Limited blast radius

---

## Final Recommendation

### Choose Option B Unless...

**Stick with Option B (Hook-Level)** because:
- ✅ **No breaking changes** - 2-3 hours saved
- ✅ **Same flexibility** - Already have it via separate hooks
- ✅ **Lower risk** - Isolated change
- ✅ **Faster to ship** - 45 min vs 2-3 hours
- ✅ **Easier to test** - No test refactoring
- ✅ **Easier to rollback** - Small change surface

**Only Choose Option A (Component-Level) if**:
- ❌ You need runtime relay switching per component instance
- ❌ You plan to consolidate all feed types into one component
- ❌ You have 2-3 hours available for refactoring
- ❌ You want to match Jumble's pattern exactly (not architecturally necessary)

---

## Bottom Line

**Option A Effort**: 2-3 hours, 120 lines changed, 3 files modified, 2 test files updated, breaking changes

**Option B Effort**: 45 minutes, 30 lines changed, 1 file modified, 0 test files updated, no breaking changes

**Flexibility Gain**: Minimal - ZapTok already has the flexibility Jumble gains from component-level via separate hook functions

**Recommendation**: **Option B** - Achieves 100% of the optimization benefit with 25% of the effort and 10% of the risk.
