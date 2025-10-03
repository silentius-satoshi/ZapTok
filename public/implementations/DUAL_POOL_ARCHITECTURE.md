# Dual-Pool Architecture Implementation Guide

## Overview

ZapTok uses a **parallel query system** with two independent relay pool managers to optimize performance while maintaining Cashu wallet isolation:

1. **NPool** (@nostrify/nostrify) - Cashu wallet operations only
2. **SimplePool** (@nbd-wtf/nostr-tools) - Timeline/feed/social operations

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     ZapTok Application                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │   NPool (Nostrify)   │    │  SimplePool (Tools)   │  │
│  │                      │    │                       │  │
│  │  Cashu Operations    │    │  Timeline/Feed Ops    │  │
│  │  • kinds: 7374-7376  │    │  • kinds: 0,1,3,6,7   │  │
│  │  • kind: 17375       │    │  • kinds: 16,21,22    │  │
│  │                      │    │  • kind: 1111         │  │
│  └──────────────────────┘    └──────────────────────┘  │
│           │                              │               │
│           │                              │               │
│           ▼                              ▼               │
│  ┌──────────────────┐         ┌─────────────────────┐  │
│  │  Cashu Relay     │         │  General Relays     │  │
│  │  (Exclusive)     │         │  (Filtered)         │  │
│  └──────────────────┘         └─────────────────────┘  │
│           │                              │               │
└───────────┼──────────────────────────────┼───────────────┘
            │                              │
            ▼                              ▼
   wss://relay.chorus.community    wss://relay.nostr.band
                                   wss://relay.damus.io
                                   wss://nos.lol
                                   (excluding Cashu relay)
```

## Smart Relay Exclusion

The two pools have **zero connection overlap** through smart filtering:

### NPool Relays
```typescript
const npoolRelays = [cashuRelay]; // wss://relay.chorus.community only
```

### SimplePool Relays
```typescript
const simplePoolRelays = allRelays.filter(url => url !== cashuRelay);
// All general relays EXCEPT the Cashu relay
```

### Benefits
- ✅ **No duplicate connections**: Each relay connects to only one pool
- ✅ **Resource efficiency**: Zero overhead from duplicate subscriptions
- ✅ **Clear separation**: Cashu operations never leak to general relays
- ✅ **Isolation guarantee**: Cashu relay never receives non-Cashu events

## Publishing Strategy

Events are routed to the appropriate pool based on their kind:

```typescript
function publishEvent(event: NostrEvent): Promise<void> {
  const CASHU_KINDS = [7374, 7375, 7376, 17375];
  
  if (CASHU_KINDS.includes(event.kind)) {
    // Publish to Cashu relay via NPool
    return npool.event(event);
  } else {
    // Publish to general relays via SimplePool
    return simplePool.publish(event, generalRelays);
  }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure ✅
**Goal**: Establish dual-pool foundation

- [x] Create SimplePool singleton instance (`/src/lib/simplePool.ts`)
- [x] Implement smart relay exclusion logic
- [x] Create publishing router utility
- [ ] Add SimplePool to NostrProvider context

**Success Criteria**:
- ✅ SimplePool singleton created with relay filtering
- ✅ Publishing router routes events by kind
- ⏳ Integration with NostrProvider pending

**Completed**:
- `/src/lib/simplePool.ts` - SimplePool singleton with smart relay exclusion
- `/src/lib/publishingRouter.ts` - Event routing logic by kind (Cashu vs social)

### Phase 2: Hook Migration
**Goal**: Migrate timeline/feed hooks to SimplePool

- [ ] Update `useOptimizedVideoFeed` to use SimplePool
- [ ] Migrate `useAuthor` to SimplePool
- [ ] Migrate `useFollowing` to SimplePool
- [ ] Update `useComments` to use SimplePool
- [ ] Migrate reaction/repost hooks

**Success Criteria**:
- All feed queries use SimplePool
- All Cashu queries still use NPool
- No performance regression

### Phase 4: Performance & Polish
**Goal**: Achieve 95% Jumble alignment

- [ ] IndexedDB offline storage
- [ ] FlexSearch profile indexing
- [ ] Real-time update batching
- [ ] Performance testing and optimization

**Success Criteria**:
- Offline mode fully functional
- Profile search <100ms latency
- 95% Jumble alignment achieved

## Query Routing Matrix

| Operation Type | Event Kinds | Pool | Relays |
|---------------|-------------|------|--------|
| Cashu Mint Discovery | 7374 | NPool | Cashu only |
| Cashu Proofs | 7375 | NPool | Cashu only |
| Cashu Quotes | 7376 | NPool | Cashu only |
| Cashu Operations | 17375 | NPool | Cashu only |
| Profile Metadata | 0 | SimplePool | General |
| Text Notes | 1 | SimplePool | General |
| Contact Lists | 3 | SimplePool | General |
| Reposts | 6, 16 | SimplePool | General |
| Reactions | 7 | SimplePool | General |
| Timeline Events | 21, 22 | SimplePool | General |
| Comments | 1111 | SimplePool | General |
| Relay Lists | 10002 | SimplePool | General |

## Hook Migration Checklist

### Must Stay on NPool (Cashu)
- [ ] `useCashuWallet` - kinds 7374, 7375, 7376
- [ ] `useCashuHistory` - kind 17375
- [ ] `useSendNutzap` - Cashu payment operations
- [ ] `useNutzaps` - Cashu zap operations
- [ ] `useCashuStore` - Wallet state management
- [ ] `useMintDiscovery` - NIP-87 mint discovery
- [ ] `useCashuReceiveToken` - Token reception
- [ ] `useCashuBalance` - Balance queries

### Can Move to SimplePool (Feed/Social) ✅
- [x] `useOptimizedVideoFeed` - kinds 21, 22
- [x] `useAuthor` - kind 0 (profiles)
- [x] `useAuthors` - kind 0 (batch profiles)
- [x] `useFollowing` - kind 3 (contact lists)
- [x] `useEvent` - any kind (single event)
- [x] `useOptimizedVideoData` - kinds 1,7,6,16,9735,1111
- [ ] `useComments` - kind 1111
- [ ] `useReactions` - kind 7
- [ ] `useReposts` - kinds 6, 16
- [ ] `useRelayList` - kind 10002
- [ ] `useRecommendedProfiles` - kind 0
- [ ] `useSearchProfiles` - kind 0

**Completed Phase 2 Migrations**:
- `/src/hooks/useAuthor.ts` - Profile queries migrated
- `/src/hooks/useAuthors.ts` - Batch profile queries migrated
- `/src/hooks/useEvent.ts` - Single event queries migrated
- `/src/hooks/useFollowing.ts` - Contact list queries migrated
- `/src/hooks/useOptimizedVideoData.ts` - Video engagement migrated
- `/src/hooks/useOptimizedVideoFeed.ts` - Feed queries migrated

### Needs Routing Logic (Hybrid)
- [ ] `useNostrPublish` - Route by event kind
- [ ] `FavoriteRelaysProvider` - Context-based routing
- [ ] `relayList.service` - May query both pools

## Testing Strategy

### Unit Tests
```typescript
describe('Dual Pool Routing', () => {
  it('routes Cashu events to NPool', () => {
    const event = { kind: 7375, /* ... */ };
    expect(getPoolForEvent(event)).toBe('npool');
  });
  
  it('routes timeline events to SimplePool', () => {
    const event = { kind: 21, /* ... */ };
    expect(getPoolForEvent(event)).toBe('simplePool');
  });
  
  it('filters Cashu relay from SimplePool', () => {
    const relays = getSimplePoolRelays(allRelays, cashuRelay);
    expect(relays).not.toContain(cashuRelay);
  });
});
```

### Integration Tests
1. **Cashu Isolation Test**: Verify Cashu events never reach general relays
2. **Feed Performance Test**: Measure SimplePool query efficiency vs old NPool
3. **Publishing Test**: Verify events publish to correct relay pools
4. **Connection Test**: Confirm zero duplicate relay connections

## Performance Expectations

### Before (Single NPool)
- 🐌 Cashu + Feed queries compete for same connection pool
- 🐌 Single relay limit (e.g., 3 on Safari) affects all operations
- 🐌 Mixed event types in same subscriptions

### After (Dual Pool)
- ⚡ Cashu operations isolated, never blocked by feed queries
- ⚡ Feed gets full relay capacity (e.g., 10+ connections)
- ⚡ Specialized query strategies per operation type
- ⚡ DataLoader batching for profile/event queries
- ⚡ LRU caching reduces redundant relay requests

### Expected Improvements
- **Feed Load Time**: 65% → 90% (2-3x faster initial load)
- **Cashu Operations**: 100% isolation (no regression)
- **Profile Queries**: 80% → 95% (DataLoader batching)
- **Real-time Updates**: 70% → 85% (dedicated SimplePool subscriptions)

## Migration Risks & Mitigation

### Risk 1: Breaking Cashu Operations
**Mitigation**: Keep NPool completely unchanged for Cashu, only add SimplePool alongside

### Risk 2: Increased Memory Usage
**Mitigation**: Monitor connection counts, set appropriate limits on SimplePool

### Risk 3: Complex Publishing Logic
**Mitigation**: Central `publishEvent()` router with clear kind-to-pool mapping

### Risk 4: AUTH Challenges
**Mitigation**: Adapt existing NIP-42 service to work with both pools

## Success Criteria

✅ **Zero Cashu Regression**: All Cashu operations work identically  
✅ **Feed Performance Gain**: 2-3x faster timeline loading  
✅ **No Duplicate Connections**: Each relay connects to exactly one pool  
✅ **Clean Separation**: Zero event type mixing between pools  
✅ **Maintainability**: Clear routing logic, easy to understand  

## Next Steps

1. ✅ Update TIMELINE_OPTIMIZATION_ROADMAP.md with correct architecture
2. ⏳ Create SimplePool instance in NostrProvider
3. ⏳ Implement smart relay exclusion
4. ⏳ Begin Section 1 implementation with SimplePool

---

**Note**: This architecture is inspired by Jumble's proven patterns but adapted for ZapTok's unique requirement to maintain Cashu wallet isolation while optimizing timeline performance.
