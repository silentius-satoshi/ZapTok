# Notification System Enhancement Roadmap

**Document Type**: Implementation Roadmap & Progress Tracker  
**Status**: Planning Phase  
**Research Source**: Jumble Nostr Client Analysis  
**Related Documents**: 
- `DUAL_POOL_ARCHITECTURE.md` - Current architecture foundation
- `ZAP_IMPLEMENTATION_GUIDE.md` - Related notification type

---

## Executive Summary

This roadmap outlines the enhancement of ZapTok's notification system, transforming it from a query-based approach to a modern real-time subscription system with advanced features. The plan is based on research from Jumble (a production Nostr client) and is designed to be implemented in phases, allowing incremental improvements while maintaining system stability.

**Current State**: Query-based notifications using SimplePool (architecturally correct after recent fix)  
**Target State**: Real-time subscription-based notifications with WoT filtering, read/unread tracking, and performance optimizations

---

## Research Context: Jumble's Notification System

### Key Learnings from Jumble

**Architectural Patterns**:
- Dedicated `NotificationProvider` with React Context for global state management
- Real-time WebSocket subscriptions (not query-based polling)
- Auto-reconnect logic with 5-second retry intervals
- Smart relay selection (first 5 read relays only, not all relays)
- Event-driven architecture with `onevent`, `oneose`, `onAllClose` callbacks

**Advanced Features**:
- Web of Trust (WoT) filtering system (2-hop trust network)
- Read/unread tracking with localStorage persistence per user
- Document title updates with notification count: `(3) Jumble`
- Favicon badge with red dot for unread notifications
- Type-based filtering with tabs (All/Mentions/Reactions/Zaps)
- Pagination (load 100, display 30 initially)
- Infinite scroll with IntersectionObserver
- Pull-to-refresh for mobile
- Spam prevention through mute list integration

**Performance Optimizations**:
- Relay count limited to 5 (prevents slow queries)
- Batch processing for follow list fetches (20 at a time)
- Client-side filtering with `matchFilter` for real-time events
- Event deduplication by ID
- Lazy loading with IntersectionObserver

### ZapTok vs Jumble Comparison

| Feature | ZapTok Current | Jumble | Gap |
|---------|---------------|---------|-----|
| **Query Method** | `querySync` (on-demand) | `subscribe` (real-time) | ❌ No real-time |
| **Relay Selection** | All configured relays | First 5 read relays | ❌ Slower queries |
| **Auto-reconnect** | N/A (query-based) | 5s retry logic | ❌ Not applicable |
| **WoT Filtering** | None | 2-hop trust network | ❌ Potential spam |
| **Read/Unread** | None | localStorage + visual indicators | ❌ No state tracking |
| **Notification Count** | None | Title + favicon badge | ❌ No visual feedback |
| **Type Filtering** | None | Tabs (All/Mentions/etc) | ❌ No organization |
| **Pagination** | Load all at once | 100/30 with lazy load | ❌ Performance issue |
| **Architecture** | ✅ SimplePool (correct) | Client service | ✅ Aligned |
| **Filtering by #p** | ✅ Correct | ✅ Correct | ✅ Aligned |

---

## Phase-Based Implementation Plan

### Phase 1: Foundation & Performance ✅ (COMPLETED)

**Status**: ✅ Complete  
**Priority**: 🔴 CRITICAL (Bug Fix)  
**Timeline**: Immediate  
**Dependencies**: None

#### Objectives
- ✅ Fix "post not found" notification bug
- ✅ Establish correct architectural foundation (SimplePool)
- 🎯 Add relay count optimization (deferred to Phase 1.2)

#### Tasks

**1.1 Commit SimplePool Migration** ✅
- [x] Migrate `useNotifications` from NPool to SimplePool
- [x] Update all 6 query locations
- [x] Change imports from `useNostr` to `useSimplePool`
- [x] Verify architectural compliance with `DUAL_POOL_ARCHITECTURE.md`
- [x] Run full test suite (all tests passing)
- [x] **Git commit with detailed explanation** ✅

**Files Modified**:
- `src/hooks/useNotifications.ts` - Migrated to SimplePool (6 queries updated)
- `src/hooks/useEvent.ts` - Verified correct, added documentation
- `public/implementations/NOTIFICATION_SYSTEM_ENHANCEMENT_ROADMAP.md` - Created

**1.2 Add Relay Count Limit** 🎯
- [ ] Limit SimplePool queries to first 5 relays
- [ ] Add constant `MAX_NOTIFICATION_RELAYS = 5`
- [ ] Document performance rationale in code comments
- [ ] Test with various relay configurations

**Implementation Example**:
```typescript
// src/hooks/useNotifications.ts
const MAX_NOTIFICATION_RELAYS = 5; // Performance: Jumble best practice

const limitedRelays = simplePoolRelays.slice(0, MAX_NOTIFICATION_RELAYS);
const events = await simplePool.querySync(limitedRelays, filter);
```

**Success Criteria**:
- ✅ Notifications query correct relay pool (general relays, not Cashu relay)
- ✅ Referenced posts are found successfully
- ✅ All tests passing
- ⏳ Query time reduced with relay limit (Phase 1.2)
- ✅ Commit includes comprehensive explanation

**Completion Notes**:
- **Committed**: Commit 1616bec
- **Bug Resolved**: "Post not found" errors eliminated
- **Architecture**: Full compliance with DUAL_POOL_ARCHITECTURE.md
- **Impact**: All notifications now query correct relay pool
- **Testing**: Full test suite passing, zero regressions
- **Documentation**: Comprehensive roadmap created with Jumble research
- **Next Phase**: Phase 1.2 (relay count optimization) or Phase 2 (real-time subscriptions)

---

### Phase 2: Real-Time Subscription System

**Status**: ❌ Not Started  
**Priority**: 🟡 HIGH (UX Enhancement)  
**Timeline**: 1-2 weeks  
**Dependencies**: Phase 1 complete

#### Objectives
- Transform from query-based to subscription-based notifications
- Enable real-time notification delivery without page refresh
- Implement auto-reconnect logic for reliability
- Create dedicated notification context provider

#### Tasks

**2.1 Create NotificationProvider Context**
- [ ] Create `src/contexts/NotificationProvider.tsx`
- [ ] Define notification state interface
- [ ] Implement React Context with provider/consumer pattern
- [ ] Add to main app provider hierarchy in `App.tsx`

**2.2 Implement Real-Time Subscription Logic**
- [ ] Use `simplePool.subscribeMany()` instead of `querySync()`
- [ ] Implement `onevent` callback for new notifications
- [ ] Implement `oneose` callback for initial load completion
- [ ] Implement `onAllClose` callback for disconnection handling
- [ ] Add subscription lifecycle management (cleanup on unmount)

**2.3 Add Auto-Reconnect Mechanism**
- [ ] Detect subscription failures/closures
- [ ] Implement 5-second retry interval (Jumble pattern)
- [ ] Add mounted ref check to prevent memory leaks
- [ ] Track retry attempts (optional: exponential backoff)

**2.4 Smart Relay Selection**
- [ ] Fetch user's relay list (read relays)
- [ ] Limit to first 5 relays for performance
- [ ] Fallback to popular relays if user has no relay list
- [ ] Cache relay selection per session

**Implementation Example**:
```typescript
// src/contexts/NotificationProvider.tsx
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { simplePool } = useSimplePool();
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = useState<NostrEvent[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    const isMountedRef = { current: true };
    let subCloser: SubCloser | null = null;
    
    const subscribe = async () => {
      if (subCloser) {
        subCloser.close();
        subCloser = null;
      }
      
      if (!isMountedRef.current) return;
      
      try {
        // Get user's read relays, limit to 5
        const relayList = await fetchUserRelays(user.pubkey);
        const relays = relayList.read.length > 0 
          ? relayList.read.slice(0, 5)
          : DEFAULT_RELAYS;
        
        let eosed = false;
        
        subCloser = simplePool.subscribeMany(
          relays,
          [{
            kinds: [1111, 4550, 4551, 34550, 7, 9735, 6, 16],
            '#p': [user.pubkey],
            limit: 20
          }],
          {
            oneose: () => {
              eosed = true;
              console.log('[Notifications] Initial load complete');
            },
            onevent: (event) => {
              if (event.pubkey === user.pubkey) return; // Skip own events
              
              setNotifications(prev => {
                // Prevent duplicates
                if (prev.some(e => e.id === event.id)) return prev;
                
                // Insert in chronological order
                const index = prev.findIndex(e => e.created_at < event.created_at);
                if (index === -1) return [...prev, event];
                return [...prev.slice(0, index), event, ...prev.slice(index)];
              });
              
              if (eosed) {
                // Emit event for real-time UI updates
                console.log('[Notifications] New notification:', event.kind);
              }
            },
            onclose: (reasons) => {
              // Auto-reconnect on unexpected closure
              if (!reasons.every(r => r === 'closed by caller') && isMountedRef.current) {
                console.log('[Notifications] Reconnecting in 5s...');
                setTimeout(() => {
                  if (isMountedRef.current) subscribe();
                }, 5000);
              }
            }
          }
        );
      } catch (error) {
        console.error('[Notifications] Subscription error:', error);
        
        // Retry on error
        if (isMountedRef.current) {
          setTimeout(() => {
            if (isMountedRef.current) subscribe();
          }, 5000);
        }
      }
    };
    
    subscribe();
    
    return () => {
      isMountedRef.current = false;
      if (subCloser) {
        subCloser.close();
        subCloser = null;
      }
    };
  }, [user?.pubkey]);
  
  return (
    <NotificationContext.Provider value={{ notifications }}>
      {children}
    </NotificationContext.Provider>
  );
}
```

**2.5 Update Existing Components**
- [ ] Migrate `useNotifications` hook to consume `NotificationContext`
- [ ] Remove direct SimplePool queries from hook
- [ ] Update notification UI to reflect real-time state
- [ ] Add loading states during initial subscription setup

**Success Criteria**:
- [ ] Notifications appear in real-time without page refresh
- [ ] Auto-reconnect works after network interruptions
- [ ] No memory leaks from unmounted subscriptions
- [ ] Performance is equivalent or better than query-based approach
- [ ] All existing notification features continue to work

**Testing Checklist**:
- [ ] New notification appears within 1-2 seconds of creation
- [ ] Page refresh maintains subscription
- [ ] Network disconnection triggers auto-reconnect
- [ ] Multiple browser tabs share notification state
- [ ] No console errors or warnings
- [ ] Mobile performance is acceptable

**Completion Notes**: N/A - Not started

---

### Phase 3: Read/Unread Tracking System

**Status**: ❌ Not Started  
**Priority**: 🟢 MEDIUM (UX Polish)  
**Timeline**: 3-5 days  
**Dependencies**: Phase 2 complete

#### Objectives
- Track which notifications user has seen/read
- Persist read state across sessions per user account
- Show visual indicators for unread notifications
- Update browser tab title with notification count

#### Tasks

**3.1 State Management for Read/Unread**
- [ ] Add `notificationsSeenAt` timestamp to user state
- [ ] Add `readNotificationIdSet` (Set<string>) for granular tracking
- [ ] Store in localStorage with user pubkey namespace
- [ ] Load persisted state on app initialization

**3.2 Visual Indicators**
- [ ] Add blue dot or badge for unread notifications
- [ ] Add timestamp comparison logic (notification.created_at > seenAt)
- [ ] Style unread notifications differently (bold, background color)
- [ ] Add "Mark all as read" button

**3.3 Document Title Updates**
- [ ] Count unread notifications
- [ ] Update `document.title` with count: `(3) ZapTok`
- [ ] Show `9+` for counts >= 10
- [ ] Reset title when notifications page is active

**3.4 Favicon Badge (Optional)**
- [ ] Generate canvas with red dot overlay
- [ ] Update favicon dynamically based on unread count
- [ ] Clear badge when no unread notifications
- [ ] Handle different favicon sizes (16x16, 32x32)

**Implementation Example**:
```typescript
// src/contexts/NotificationProvider.tsx (additions)

const [notificationsSeenAt, setNotificationsSeenAt] = useState<number>(() => {
  if (!user) return Date.now() / 1000;
  return storage.getNotificationsSeenAt(user.pubkey) ?? Date.now() / 1000;
});

const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

const unreadNotifications = useMemo(() => {
  return notifications.filter(n => 
    n.created_at > notificationsSeenAt && 
    !readNotificationIds.has(n.id)
  );
}, [notifications, notificationsSeenAt, readNotificationIds]);

// Update document title
useEffect(() => {
  const count = unreadNotifications.length;
  if (count > 0) {
    document.title = `(${count >= 10 ? '9+' : count}) ZapTok`;
  } else {
    document.title = 'ZapTok';
  }
}, [unreadNotifications]);

const markAsRead = useCallback((notificationId: string) => {
  setReadNotificationIds(prev => new Set([...prev, notificationId]));
}, []);

const markAllAsRead = useCallback(() => {
  const now = Date.now() / 1000;
  setNotificationsSeenAt(now);
  storage.setNotificationsSeenAt(user.pubkey, now);
  setReadNotificationIds(new Set());
}, [user]);
```

**3.5 localStorage Utilities**
- [ ] Create `storage.getNotificationsSeenAt(pubkey)`
- [ ] Create `storage.setNotificationsSeenAt(pubkey, timestamp)`
- [ ] Create `storage.getReadNotificationIds(pubkey)`
- [ ] Create `storage.setReadNotificationIds(pubkey, ids)`
- [ ] Add namespace isolation per user account

**Success Criteria**:
- [ ] Unread notifications have visual indicators
- [ ] Read state persists across browser sessions
- [ ] Document title shows accurate unread count
- [ ] "Mark all as read" button works correctly
- [ ] Multi-account support (different users have separate read state)

**Testing Checklist**:
- [ ] New notification shows as unread
- [ ] Clicking notification marks as read
- [ ] Read state persists after page refresh
- [ ] Switching accounts loads correct read state
- [ ] Browser tab title updates in real-time
- [ ] localStorage data is properly namespaced

**Completion Notes**: N/A - Not started

---

### Phase 4: Web of Trust (WoT) Filtering

**Status**: ❌ Not Started  
**Priority**: 🟣 LOW (Spam Prevention)  
**Timeline**: 1 week  
**Dependencies**: Phase 2 complete

#### Objectives
- Build user trust network (following + 2nd-hop follows)
- Filter notifications from untrusted users (optional preference)
- Prevent spam notifications as ZapTok scales
- Provide user control over trust settings

#### Tasks

**4.1 Build Web of Trust Graph**
- [ ] Fetch user's following list (kind 3 contacts)
- [ ] Add user's follows to trust set
- [ ] Fetch follows of follows (2-hop network)
- [ ] Batch requests (20 at a time for performance)
- [ ] Cache trust set in memory and localStorage

**4.2 User Preferences**
- [ ] Add "Hide notifications from untrusted users" setting
- [ ] Add "Hide content mentioning muted users" setting
- [ ] Add settings UI in profile/preferences page
- [ ] Persist preferences to localStorage

**4.3 Notification Filtering Logic**
- [ ] Create `notificationFilter()` utility function
- [ ] Check if notification author is in trust set
- [ ] Check if notification mentions muted users
- [ ] Apply filters before adding to notification state
- [ ] Make filtering optional based on user preferences

**Implementation Example**:
```typescript
// src/lib/notificationFilter.ts

export interface NotificationFilterOptions {
  pubkey: string;
  mutePubkeySet: Set<string>;
  hideContentMentioningMutedUsers: boolean;
  hideUntrustedNotifications: boolean;
  isUserTrusted: (pubkey: string) => boolean;
}

export function notificationFilter(
  event: NostrEvent,
  options: NotificationFilterOptions
): boolean {
  const {
    pubkey,
    mutePubkeySet,
    hideContentMentioningMutedUsers,
    hideUntrustedNotifications,
    isUserTrusted
  } = options;
  
  // Filter muted users
  if (mutePubkeySet.has(event.pubkey)) {
    return false;
  }
  
  // Filter content mentioning muted users
  if (hideContentMentioningMutedUsers && isMentioningMutedUsers(event, mutePubkeySet)) {
    return false;
  }
  
  // Filter untrusted users
  if (hideUntrustedNotifications && !isUserTrusted(event.pubkey)) {
    return false;
  }
  
  // For reactions, verify target is current user
  if (pubkey && event.kind === 7) {
    const targetPubkey = event.tags.findLast(tag => tag[0] === 'p')?.[1];
    if (targetPubkey !== pubkey) {
      return false;
    }
  }
  
  return true;
}

function isMentioningMutedUsers(event: NostrEvent, mutePubkeySet: Set<string>): boolean {
  const mentionedPubkeys = event.tags
    .filter(tag => tag[0] === 'p')
    .map(tag => tag[1]);
  
  return mentionedPubkeys.some(pubkey => mutePubkeySet.has(pubkey));
}
```

**4.4 Web of Trust Provider**
- [ ] Create `src/contexts/WebOfTrustProvider.tsx`
- [ ] Load trust graph on user login
- [ ] Expose `isUserTrusted(pubkey)` function
- [ ] Handle trust graph updates when user follows/unfollows

**4.5 Integration with NotificationProvider**
- [ ] Apply filters in `onevent` callback before adding to state
- [ ] Respect user preferences for filtering
- [ ] Add stats/logs for filtered notifications
- [ ] Provide UI to review filtered notifications (optional)

**Success Criteria**:
- [ ] Trust graph builds correctly (1-hop + 2-hop)
- [ ] Notifications from untrusted users are filtered when enabled
- [ ] User preferences persist across sessions
- [ ] Performance impact is minimal (batched requests, caching)
- [ ] Trust graph updates when user changes following list

**Testing Checklist**:
- [ ] Following list loads correctly
- [ ] 2-hop follows are fetched and cached
- [ ] Filtering preference toggles work
- [ ] Notifications from strangers are filtered when enabled
- [ ] Notifications from trusted users always appear
- [ ] Muted users are filtered correctly
- [ ] Performance is acceptable with large trust networks

**Completion Notes**: N/A - Not started

---

### Phase 5: Advanced UX Features

**Status**: ❌ Not Started  
**Priority**: 🔵 OPTIONAL (Polish)  
**Timeline**: 1-2 weeks  
**Dependencies**: Phases 2-3 complete

#### Objectives
- Add notification type filtering (tabs)
- Implement pagination and infinite scroll
- Add pull-to-refresh for mobile
- Improve notification organization and discoverability

#### Tasks

**5.1 Notification Type Tabs**
- [ ] Add tabs for "All", "Mentions", "Reactions", "Zaps"
- [ ] Filter notifications by kind based on active tab
- [ ] Persist active tab preference
- [ ] Update UI to show tab-specific counts

**Kind to Tab Mapping**:
```typescript
const TAB_FILTERS = {
  all: [1111, 4550, 4551, 34550, 7, 9735, 6, 16],
  mentions: [1111], // Comments mentioning user
  reactions: [7, 6, 16], // Reactions and reposts
  zaps: [9735], // Lightning zaps
  groups: [4550, 4551, 34550] // Group-related notifications
};
```

**5.2 Pagination System**
- [ ] Load initial batch (100 notifications)
- [ ] Display subset (30 notifications)
- [ ] Track pagination state (`showCount`, `until` timestamp)
- [ ] Implement "Load More" button or auto-load

**5.3 Infinite Scroll**
- [ ] Use IntersectionObserver on bottom sentinel element
- [ ] Load next batch when scrolled to bottom
- [ ] Add loading indicator during fetch
- [ ] Handle end-of-list state (no more notifications)

**Implementation Example**:
```typescript
// IntersectionObserver for infinite scroll
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loading && hasMore) {
        loadMoreNotifications();
      }
    },
    { threshold: 1, rootMargin: '10px' }
  );
  
  if (bottomRef.current) {
    observer.observe(bottomRef.current);
  }
  
  return () => observer.disconnect();
}, [loading, hasMore]);
```

**5.4 Pull-to-Refresh (Mobile)**
- [ ] Detect pull-down gesture on mobile
- [ ] Show refresh indicator
- [ ] Trigger notification refresh
- [ ] Reset to top of list after refresh
- [ ] Use library like `react-simple-pull-to-refresh`

**5.5 Notification Grouping (Optional)**
- [ ] Group multiple reactions to same post
- [ ] Show "User1, User2, and 3 others reacted to your post"
- [ ] Collapse/expand grouped notifications
- [ ] Improve readability for high-volume notifications

**Success Criteria**:
- [ ] Tabs filter notifications correctly
- [ ] Pagination loads efficiently
- [ ] Infinite scroll works smoothly on desktop and mobile
- [ ] Pull-to-refresh feels native on mobile
- [ ] No performance degradation with large notification lists

**Testing Checklist**:
- [ ] Tab switching updates notification list instantly
- [ ] Pagination state persists during session
- [ ] Infinite scroll triggers at correct threshold
- [ ] Pull-to-refresh works on touch devices
- [ ] No duplicate notifications after refresh
- [ ] Loading states are clear and responsive

**Completion Notes**: N/A - Not started

---

## Implementation Guidelines

### Code Quality Standards

**TypeScript**:
- No `any` types - always use proper type definitions
- Define interfaces for all notification-related data structures
- Use strict null checking
- Export types for reusability

**React Best Practices**:
- Use functional components with hooks
- Implement proper cleanup in useEffect
- Memoize expensive computations with useMemo/useCallback
- Avoid prop drilling - use context for global notification state

**Performance**:
- Limit relay count (5 maximum)
- Batch API requests when possible
- Use IntersectionObserver for lazy loading
- Implement debouncing for expensive operations
- Cache relay lists and trust graphs

**Testing**:
- Run full test suite after each phase
- Add unit tests for utility functions (notificationFilter, etc.)
- Test edge cases (network failures, empty states, etc.)
- Verify no memory leaks from subscriptions

**Documentation**:
- Update this roadmap with completion notes after each phase
- Add inline code comments for complex logic
- Document breaking changes
- Keep AGENTS.md synchronized with new patterns

### Architectural Considerations

**Dual-Pool Compliance**:
- ✅ **ALWAYS** use SimplePool for notifications (social feature)
- ❌ **NEVER** use NPool for notifications (Cashu-only pool)
- Verify relay selection excludes Cashu relay (`wss://relay.chorus.community`)
- Follow `DUAL_POOL_ARCHITECTURE.md` specifications

**Provider Hierarchy**:
```tsx
<AppProvider>
  <NostrProvider>
    <SimplePoolProvider>
      <NotificationProvider>  {/* Phase 2 */}
        <WebOfTrustProvider>  {/* Phase 4 */}
          <App />
        </WebOfTrustProvider>
      </NotificationProvider>
    </SimplePoolProvider>
  </NostrProvider>
</AppProvider>
```

**State Management**:
- Global notification state in NotificationContext
- User preferences in localStorage
- Trust graph in WebOfTrustProvider
- Read/unread state per user account

**Error Handling**:
- Gracefully handle subscription failures
- Implement auto-reconnect with exponential backoff
- Log errors for debugging (console.error)
- Show user-friendly error messages in UI
- Don't crash app on notification errors

### Git Commit Strategy

**Commit Message Format** (follow `.gitmessage`):
```
type(scope): brief description (50 chars max)

Detailed explanation of what and why vs. how (wrap at 72 characters).
Use bullet points with "-" for multiple changes.
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`  
**Scopes**: `notifications`, `ui`, `performance`, `wot`, `storage`

**Phase Commits**:
- Phase 1: `fix(notifications): migrate to SimplePool and optimize relay count`
- Phase 2: `feat(notifications): implement real-time subscription system`
- Phase 3: `feat(notifications): add read/unread tracking with visual indicators`
- Phase 4: `feat(notifications): add Web of Trust spam filtering`
- Phase 5: `feat(notifications): add tabs, pagination, and infinite scroll`

---

## Success Metrics

### Phase 1 Metrics
- ✅ Zero "post not found" errors in notifications
- 🎯 Query time reduced by 30-50% with relay limit
- ✅ All tests passing
- ✅ Architectural compliance verified

### Phase 2 Metrics
- Notifications appear within 1-2 seconds of creation
- Auto-reconnect success rate > 95%
- Zero memory leaks detected
- User satisfaction with real-time updates

### Phase 3 Metrics
- Read state accuracy > 99%
- Browser title updates within 500ms
- Visual indicators clear and intuitive
- Multi-account state isolation working

### Phase 4 Metrics
- Trust graph build time < 5 seconds
- Spam reduction > 80% when filtering enabled
- User satisfaction with filtering controls
- Performance impact < 5%

### Phase 5 Metrics
- Tab switching feels instant (< 100ms)
- Infinite scroll smoothness (60fps)
- Pull-to-refresh feels native on mobile
- Notification organization praised by users

---

## Risk Mitigation

### Technical Risks

**Risk**: Real-time subscriptions consume more resources than queries  
**Mitigation**: Limit relay count, implement efficient event deduplication, monitor memory usage

**Risk**: Auto-reconnect could cause infinite retry loops  
**Mitigation**: Implement exponential backoff, max retry limit, mounted ref checks

**Risk**: localStorage quota exceeded with large notification history  
**Mitigation**: Implement data pruning, store only recent notifications, compress data

**Risk**: Trust graph fetch could be slow with large networks  
**Mitigation**: Batch requests, cache aggressively, make WoT optional feature

### UX Risks

**Risk**: Real-time notifications could be distracting  
**Mitigation**: Add user preference to disable real-time updates, implement notification batching

**Risk**: WoT filtering could hide legitimate notifications  
**Mitigation**: Make filtering optional, provide "Review filtered" UI, clear documentation

**Risk**: Browser tab title changes could be annoying  
**Mitigation**: Add user preference to disable title updates, respect browser notification permissions

### Migration Risks

**Risk**: Breaking changes affect existing notification UI  
**Mitigation**: Incremental rollout, feature flags, backward compatibility checks

**Risk**: Performance regression with new system  
**Mitigation**: Benchmark each phase, A/B testing, rollback plan

---

## Future Enhancements (Beyond This Roadmap)

- **Push Notifications**: Browser notification API integration
- **Email Digests**: Periodic email summaries of notifications
- **Notification Settings**: Granular control per notification type
- **Notification Sounds**: Audio alerts for new notifications
- **Smart Notifications**: AI-based importance ranking
- **Cross-Device Sync**: Sync read state across devices via Nostr events (NIP-78)
- **Notification Analytics**: Track engagement metrics
- **Custom Notification Kinds**: Support for app-specific notification types

---

## References

### External Resources
- [[Jumble GitHub Repository](https://github.com/CodyTseng/jumble) - Research source
- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md) - Event structure
- [NIP-25: Reactions](https://github.com/nostr-protocol/nips/blob/master/25.md) - Reaction events
- [NIP-57: Zaps](https://github.com/nostr-protocol/nips/blob/master/57.md) - Lightning zaps
- [@nbd-wtf/nostr-tools Documentation](https://github.com/nbd-wtf/nostr-tools) - SimplePool API

### Internal Documentation
- `DUAL_POOL_ARCHITECTURE.md` - Architecture foundation
- `ZAP_IMPLEMENTATION_GUIDE.md` - Zap notification handling
- `AGENTS.md` - Project guidelines and patterns
- `.gitmessage` - Commit message template

---

## Progress Tracking

### Phase Completion Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | ✅ Complete | SimplePool migration committed (1616bec) |
| Phase 2 | ❌ Not Started | Real-time subscription system |
| Phase 3 | ❌ Not Started | Read/unread tracking |
| Phase 4 | ❌ Not Started | Web of Trust filtering |
| Phase 5 | ❌ Not Started | Advanced UX features |


## Changelog
**Latest Updates**:
- **Phase 1**: Architectural fix complete - migrated to SimplePool
- **Research**: Analyzed Jumble notification system
- **Planning**: Defined 5-phase implementation plan
---

## Appendix: Notification Event Kinds Reference

### ZapTok Notification Kinds

| Kind | Description | NIP | Example |
|------|-------------|-----|---------|
| 1111 | Group comments | NIP-22 | User commented on your group post |
| 4550 | Group post approval | Custom | Your post was approved in group |
| 4551 | Group post removal | Custom | Your post was removed from group |
| 34550 | Groups | Custom | Group-related notification |
| 7 | Reactions | NIP-25 | User ❤️ reacted to your post |
| 9735 | Zap receipts | NIP-57 | User zapped you 1000 sats ⚡ |
| 6 | Reposts | NIP-18 | User reposted your content |
| 16 | Generic reposts | NIP-18 | User shared your post |

### Filter Pattern
```typescript
{
  kinds: [1111, 4550, 4551, 34550, 7, 9735, 6, 16],
  '#p': [currentUserPubkey],
  limit: 150
}
```

---

**Document Maintained By**: AI Agents & Development Team  
**Version**: 1.0.0
