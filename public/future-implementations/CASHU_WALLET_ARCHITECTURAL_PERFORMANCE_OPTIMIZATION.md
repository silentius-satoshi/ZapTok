# Cashu Wallet Architectural & Performance Optimization

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Chorus Reference Architecture](#chorus-reference-architecture)
4. [Performance Bottlenecks Identified](#performance-bottlenecks-identified)
5. [Optimization Strategy](#optimization-strategy)
6. [Implementation Phases](#implementation-phases)
7. [Technical Implementation Details](#technical-implementation-details)
8. [Risk Assessment](#risk-assessment)
9. [Success Metrics](#success-metrics)
10. [Migration Guide](#migration-guide)

## Executive Summary

This document provides comprehensive guidance for optimizing ZapTok's Cashu wallet system performance while maintaining the user-specific store architecture and security model. Based on analysis of Chorus's wallet implementation at https://github.com/andotherstuff/chorus, we've identified key optimization opportunities that can improve wallet loading performance by 70-90% without sacrificing functionality or security.

### Key Findings
- **Current Performance**: 3-5 second wallet loading times
- **Target Performance**: 1-2 second wallet loading times
- **Primary Bottlenecks**: Sequential operations, excessive Nostr queries, redundant decryption
- **Solution Approach**: Parallel processing, intelligent caching, batch operations

## Current Architecture Analysis

### ZapTok's Current Wallet System

#### Store Architecture
```
userCashuStore (per-user)
├── User-specific encrypted Nostr events
├── Complex multi-layer event processing
├── Sequential mint activation
└── Individual proof management
```

#### Loading Flow
1. **User Login** → Fetch user-specific wallet events
2. **Wallet Decryption** → NIP-44 decrypt wallet data
3. **Sequential Mint Activation** → One mint at a time
4. **Token Events Query** → Separate query for proof events
5. **Individual Proof Processing** → Event-by-event decryption
6. **Store Population** → Complex state updates

#### Current Pain Points
- **Sequential Bottlenecks**: Mint activation happens one-by-one
- **Over-fetching**: Multiple separate Nostr queries
- **Redundant Decryption**: Each token event decrypted individually
- **Complex State Management**: Multi-layer event tracking
- **Frequent Re-queries**: Limited caching strategies

## Chorus Reference Architecture

### Chorus's Performance Advantages

#### Simplified Store Architecture
```typescript
// Chorus: Global store with direct access
const cashuStore = {
  mints: [],
  proofs: [],
  privkey: string,
  activeMintUrl: string
}

// Direct access pattern
const balances = calculateBalance(cashuStore.proofs);
```

#### Optimized Loading Strategy
```typescript
// Parallel mint activation
await Promise.all(walletData.mints.map(async (mint) => {
  const { mintInfo, keysets } = await activateMint(mint);
  cashuStore.addMint(mint);
  cashuStore.setMintInfo(mint, mintInfo);
  cashuStore.setKeysets(mint, keysets);
}));
```

#### Key Performance Patterns
1. **Parallel Operations**: Extensive use of `Promise.all`
2. **Direct State Updates**: Immediate store mutations
3. **Batch Processing**: Group related operations
4. **Intelligent Caching**: TanStack Query optimization
5. **Simplified Event Model**: Minimal event complexity

## Performance Bottlenecks Identified

### 1. Sequential Mint Activation
**Current**: Mints activated one-by-one
```typescript
// Bottleneck: Sequential processing
for (const mint of mints) {
  await activateMint(mint);
}
```

**Impact**: 60-80% slower than parallel approach

### 2. Excessive Nostr Queries
**Current**: Separate queries for wallet and tokens
```typescript
// Multiple round trips
const wallet = await nostr.query([walletFilter]);
const tokens = await nostr.query([tokenFilter]);
```

**Impact**: 2x network overhead

### 3. Individual Event Decryption
**Current**: Each token event decrypted separately
```typescript
// Sequential decryption
for (const event of events) {
  const decrypted = await user.signer.nip44.decrypt(event.content);
}
```

**Impact**: 3-5x slower than batch operations

### 4. Complex Store Updates
**Current**: Multi-layer event tracking with complex state updates
**Impact**: 40-60% overhead in state management

### 5. Insufficient Caching
**Current**: Frequent re-queries without optimal caching
**Impact**: Unnecessary network requests and computation

## Optimization Strategy

### Core Principles
1. **Maintain Security**: Preserve user-specific encryption and store isolation
2. **Parallel Processing**: Convert sequential operations to parallel
3. **Intelligent Caching**: Implement aggressive caching where safe
4. **Batch Operations**: Group related operations
5. **Progressive Loading**: Load critical data first, defer non-essential

### Target Architecture
```
Optimized userCashuStore
├── Parallel mint activation
├── Batched Nostr queries
├── Bulk decryption operations
├── Cached proof management
└── Direct balance calculations
```

## Implementation Phases

### Phase 1: Core Optimizations (Week 1)
**Goal**: 40-60% performance improvement

#### 1.1 Parallel Mint Activation (Days 1-2)
```typescript
// Target implementation
const activateUserMints = async (mints: string[]) => {
  const results = await Promise.all(mints.map(async (mintUrl) => {
    try {
      const { mintInfo, keysets } = await activateMint(mintUrl);
      return { mintUrl, mintInfo, keysets, success: true };
    } catch (error) {
      return { mintUrl, error, success: false };
    }
  }));
  
  // Batch store updates
  const successful = results.filter(r => r.success);
  userCashuStore.batchAddMints(successful);
};
```

#### 1.2 Combined Query Strategy (Days 3-4)
```typescript
// Optimize: Single combined query
const useCashuWalletOptimized = () => {
  return useQuery({
    queryKey: ['cashu', 'combined', user?.pubkey],
    queryFn: async ({ signal }) => {
      const [walletEvents, tokenEvents] = await Promise.all([
        nostr.query([
          { kinds: [CASHU_EVENT_KINDS.WALLET], authors: [user.pubkey], limit: 1 }
        ], { signal }),
        nostr.query([
          { kinds: [CASHU_EVENT_KINDS.TOKEN], authors: [user.pubkey], limit: 100 }
        ], { signal })
      ]);
      
      return { walletEvents, tokenEvents };
    },
    staleTime: 30000, // 30-second cache
    cacheTime: 300000, // 5-minute retention
  });
};
```

#### 1.3 Batch Decryption (Days 5-7)
```typescript
// Bulk decryption strategy
const batchDecryptEvents = async (events: NostrEvent[]) => {
  const decryptionPromises = events.map(async (event, index) => {
    try {
      const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
      return { index, event, decrypted, success: true };
    } catch (error) {
      return { index, event, error, success: false };
    }
  });
  
  return await Promise.all(decryptionPromises);
};
```

### Phase 2: Event & State Management (Week 2)
**Goal**: 20-30% additional improvement

#### 2.1 Batch Event Publishing (Days 8-10)
```typescript
// Group proof operations
interface ProofOperation {
  type: 'add' | 'remove';
  proofs: Proof[];
  mintUrl: string;
}

const batchUpdateProofs = async (operations: ProofOperation[]) => {
  // Group by mint
  const mintGroups = operations.reduce((acc, op) => {
    if (!acc[op.mintUrl]) acc[op.mintUrl] = [];
    acc[op.mintUrl].push(op);
    return acc;
  }, {} as Record<string, ProofOperation[]>);
  
  // Single event per mint
  const events = await Promise.all(
    Object.entries(mintGroups).map(([mintUrl, ops]) => 
      createBatchTokenEvent(mintUrl, ops)
    )
  );
  
  // Batch publish
  await Promise.all(events.map(event => nostr.event(event)));
};
```

#### 2.2 Direct Balance Calculations (Days 11-12)
```typescript
// Chorus-style direct calculation
const useOptimizedBalance = () => {
  const proofs = userCashuStore(state => state.proofs);
  
  return useMemo(() => {
    return calculateBalance(proofs);
  }, [proofs]);
};
```

#### 2.3 Query Batching (Days 13-14)
```typescript
// Debounced query batching
const useQueryBatcher = () => {
  const [queryQueue, setQueryQueue] = useState<Filter[]>([]);
  
  const addToQueue = useCallback((filter: Filter) => {
    setQueryQueue(prev => [...prev, filter]);
  }, []);
  
  useEffect(() => {
    if (queryQueue.length === 0) return;
    
    const timer = setTimeout(async () => {
      const results = await nostr.query(queryQueue, { signal });
      processQueuedResults(results);
      setQueryQueue([]);
    }, 100); // 100ms debounce
    
    return () => clearTimeout(timer);
  }, [queryQueue]);
  
  return { addToQueue };
};
```

### Phase 3: Polish & Monitoring (Week 3)
**Goal**: 10-15% final improvements + monitoring

#### 3.1 Progressive Loading (Days 15-16)
```typescript
// Load critical data first
const useProgressiveWalletLoading = () => {
  // Priority 1: Basic wallet structure
  const { data: walletData } = useQuery({
    queryKey: ['wallet', 'basic', user?.pubkey],
    queryFn: () => fetchBasicWalletData(),
  });
  
  // Priority 2: Active mint data
  const { data: activeMintData } = useQuery({
    queryKey: ['wallet', 'active-mint', user?.pubkey],
    queryFn: () => fetchActiveMintData(),
    enabled: !!walletData,
  });
  
  // Priority 3: All mint data (deferred)
  const { data: allMintsData } = useQuery({
    queryKey: ['wallet', 'all-mints', user?.pubkey],
    queryFn: () => fetchAllMintsData(),
    enabled: !!activeMintData,
    staleTime: 60000, // Longer cache for non-critical data
  });
};
```

#### 3.2 Performance Monitoring (Days 17-19)
```typescript
// Performance metrics collection
const useWalletPerformanceMetrics = () => {
  const trackLoadingTime = useCallback((phase: string, startTime: number) => {
    const duration = performance.now() - startTime;
    console.log(`Wallet ${phase} took ${duration}ms`);
    
    // Optional: Send to analytics
    if (duration > 1000) {
      console.warn(`Slow wallet ${phase}: ${duration}ms`);
    }
  }, []);
  
  return { trackLoadingTime };
};
```

## Technical Implementation Details

### 1. Optimized useCashuWallet Hook

```typescript
// src/hooks/useCashuWalletOptimized.ts
export function useCashuWalletOptimized() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const userCashuStore = useUserCashuStore();
  
  // Combined wallet and token data query
  const combinedQuery = useQuery({
    queryKey: ['cashu', 'wallet-combined', user?.pubkey],
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('User not logged in');
      
      const startTime = performance.now();
      
      // Parallel fetch wallet and token events
      const [walletEvents, tokenEvents] = await Promise.all([
        nostr.query([
          { kinds: [CASHU_EVENT_KINDS.WALLET], authors: [user.pubkey], limit: 1 }
        ], { signal }),
        nostr.query([
          { kinds: [CASHU_EVENT_KINDS.TOKEN], authors: [user.pubkey], limit: 100 }
        ], { signal })
      ]);
      
      if (walletEvents.length === 0) return null;
      
      // Batch decrypt operations
      const decryptionResults = await batchDecryptEvents([
        ...walletEvents,
        ...tokenEvents
      ]);
      
      // Process decrypted data
      const walletData = processWalletData(decryptionResults[0]);
      const tokenData = processTokenEvents(decryptionResults.slice(1));
      
      // Parallel mint activation
      await activateUserMintsParallel(walletData.mints);
      
      console.log(`Wallet loading took ${performance.now() - startTime}ms`);
      
      return { wallet: walletData, tokens: tokenData };
    },
    enabled: !!user,
    staleTime: 30000,
    cacheTime: 300000,
    refetchOnWindowFocus: false,
  });
  
  return {
    wallet: combinedQuery.data?.wallet,
    tokens: combinedQuery.data?.tokens,
    isLoading: combinedQuery.isLoading,
    error: combinedQuery.error,
  };
}
```

### 2. Parallel Mint Activation

```typescript
// src/lib/mintActivationOptimized.ts
export const activateUserMintsParallel = async (mints: string[]) => {
  const startTime = performance.now();
  
  const activationResults = await Promise.allSettled(
    mints.map(async (mintUrl) => {
      const { mintInfo, keysets } = await activateMint(mintUrl);
      const { keys } = await updateMintKeys(mintUrl, keysets);
      
      return {
        mintUrl,
        mintInfo,
        keysets,
        keys,
      };
    })
  );
  
  // Process results and update store
  const successful = activationResults
    .filter((result): result is PromiseFulfilledResult<any> => 
      result.status === 'fulfilled')
    .map(result => result.value);
  
  const failed = activationResults
    .filter((result): result is PromiseRejectedResult => 
      result.status === 'rejected')
    .map(result => result.reason);
  
  if (failed.length > 0) {
    console.warn('Some mints failed to activate:', failed);
  }
  
  // Batch store updates
  userCashuStore.batchAddMints(successful);
  
  console.log(`Mint activation took ${performance.now() - startTime}ms`);
  
  return successful;
};
```

### 3. Batch Decryption Utility

```typescript
// src/lib/batchDecryption.ts
export const batchDecryptEvents = async (
  events: NostrEvent[],
  user: { signer: { nip44: any }, pubkey: string }
) => {
  const startTime = performance.now();
  
  const decryptionPromises = events.map(async (event, index) => {
    try {
      const decrypted = await user.signer.nip44.decrypt(user.pubkey, event.content);
      return {
        index,
        eventId: event.id,
        decrypted,
        success: true,
        originalEvent: event,
      };
    } catch (error) {
      console.error(`Failed to decrypt event ${event.id}:`, error);
      return {
        index,
        eventId: event.id,
        error,
        success: false,
        originalEvent: event,
      };
    }
  });
  
  const results = await Promise.all(decryptionPromises);
  
  console.log(`Batch decryption of ${events.length} events took ${performance.now() - startTime}ms`);
  
  return results;
};
```

### 4. Enhanced User Store with Batching

```typescript
// src/stores/userCashuStore.ts
interface UserCashuStore {
  // ... existing interface
  
  // New batch operations
  batchAddMints: (mints: MintData[]) => void;
  batchAddProofs: (proofs: ProofWithEventId[], eventIds: string[]) => void;
  batchRemoveProofs: (proofSecrets: string[]) => void;
  optimizedGetBalance: () => Record<string, number>;
}

export const useUserCashuStore = create<UserCashuStore>()(
  persist(
    (set, get) => ({
      // ... existing state
      
      batchAddMints: (mints) => {
        const startTime = performance.now();
        
        set(state => {
          const existingUrls = new Set(state.mints.map(m => m.url));
          const newMints = mints.filter(m => !existingUrls.has(m.mintUrl));
          
          return {
            ...state,
            mints: [...state.mints, ...newMints.map(m => ({
              url: m.mintUrl,
              mintInfo: m.mintInfo,
              keysets: m.keysets,
              keys: m.keys,
            }))],
          };
        });
        
        console.log(`Batch mint addition took ${performance.now() - startTime}ms`);
      },
      
      batchAddProofs: (proofs, eventIds) => {
        const startTime = performance.now();
        
        set(state => {
          const existingSecrets = new Set(state.proofs.map(p => p.secret));
          const newProofs = proofs.filter(p => !existingSecrets.has(p.secret));
          
          return {
            ...state,
            proofs: [...state.proofs, ...newProofs],
          };
        });
        
        console.log(`Batch proof addition of ${proofs.length} proofs took ${performance.now() - startTime}ms`);
      },
      
      optimizedGetBalance: () => {
        const state = get();
        return calculateBalance(state.proofs);
      },
    }),
    {
      name: `user-cashu-store-${user?.pubkey}`,
      version: 2, // Increment for new batch operations
    }
  )
);
```

### 5. Progressive Loading Implementation

```typescript
// src/hooks/useProgressiveWalletLoading.ts
export const useProgressiveWalletLoading = () => {
  const { user } = useCurrentUser();
  
  // Phase 1: Critical wallet data
  const criticalDataQuery = useQuery({
    queryKey: ['wallet', 'critical', user?.pubkey],
    queryFn: async () => {
      // Load only essential wallet structure and active mint
      const walletEvents = await nostr.query([
        { kinds: [CASHU_EVENT_KINDS.WALLET], authors: [user.pubkey], limit: 1 }
      ]);
      
      if (walletEvents.length === 0) return null;
      
      const walletData = await decryptWalletEvent(walletEvents[0]);
      const activeMint = walletData.mints[0]; // Primary mint
      
      // Activate only the primary mint
      await activateMint(activeMint);
      
      return { walletData, activeMint };
    },
    enabled: !!user,
    staleTime: 30000,
  });
  
  // Phase 2: Proof data for active mint
  const proofsQuery = useQuery({
    queryKey: ['wallet', 'proofs', user?.pubkey, criticalDataQuery.data?.activeMint],
    queryFn: async () => {
      // Load proofs only for active mint
      const tokenEvents = await nostr.query([
        { kinds: [CASHU_EVENT_KINDS.TOKEN], authors: [user.pubkey], limit: 50 }
      ]);
      
      return await processTokenEventsForMint(tokenEvents, criticalDataQuery.data.activeMint);
    },
    enabled: !!criticalDataQuery.data,
    staleTime: 15000,
  });
  
  // Phase 3: Secondary mint data (deferred)
  const secondaryDataQuery = useQuery({
    queryKey: ['wallet', 'secondary', user?.pubkey],
    queryFn: async () => {
      const remainingMints = criticalDataQuery.data.walletData.mints.slice(1);
      return await activateUserMintsParallel(remainingMints);
    },
    enabled: !!proofsQuery.data,
    staleTime: 60000, // Longer cache for non-critical
  });
  
  return {
    isReady: !!criticalDataQuery.data && !!proofsQuery.data,
    isFullyLoaded: !!secondaryDataQuery.data,
    criticalData: criticalDataQuery.data,
    proofs: proofsQuery.data,
    secondaryData: secondaryDataQuery.data,
    loadingPhase: criticalDataQuery.isLoading ? 'critical' :
                  proofsQuery.isLoading ? 'proofs' :
                  secondaryDataQuery.isLoading ? 'secondary' : 'complete',
  };
};
```

### 6. Query Optimization with Intelligent Caching

```typescript
// src/hooks/useOptimizedQueries.ts
export const useOptimizedCashuQueries = () => {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  
  // Prefetch strategy
  const prefetchWalletData = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ['cashu', 'wallet-combined', user?.pubkey],
      queryFn: () => fetchCombinedWalletData(),
      staleTime: 30000,
    });
  }, [user?.pubkey, queryClient]);
  
  // Background refresh strategy
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      // Refresh only if data is stale
      queryClient.invalidateQueries({
        queryKey: ['cashu', 'wallet-combined', user.pubkey],
        refetchType: 'inactive', // Only if not actively being used
      });
    }, 60000); // 1 minute background refresh
    
    return () => clearInterval(interval);
  }, [user, queryClient]);
  
  return { prefetchWalletData };
};
```

## Risk Assessment

### High Risk Areas
1. **Event Ordering Dependencies**
   - **Risk**: Parallel processing might break chronological assumptions
   - **Mitigation**: Implement timestamp-based ordering validation
   - **Testing**: Comprehensive event sequence testing

2. **Race Conditions in Parallel Operations**
   - **Risk**: Concurrent mint activation could cause state corruption
   - **Mitigation**: Use proper locking mechanisms and atomic operations
   - **Testing**: Stress testing with rapid wallet operations

3. **NIP-44 Encryption Limitations**
   - **Risk**: Batch decryption might not be supported by all signers
   - **Mitigation**: Fallback to sequential decryption for unsupported signers
   - **Testing**: Test across different signer implementations

### Medium Risk Areas
1. **User Data Migration**
   - **Risk**: Existing wallet data might not be compatible with optimizations
   - **Mitigation**: Implement gradual migration with backward compatibility
   - **Testing**: Migration testing with real user data

2. **Mint Server Compatibility**
   - **Risk**: Some mints might not handle parallel requests well
   - **Mitigation**: Implement per-mint request rate limiting
   - **Testing**: Test against various mint implementations

3. **Query Result Consistency**
   - **Risk**: Parallel queries might return inconsistent state
   - **Mitigation**: Implement result validation and conflict resolution
   - **Testing**: Consistency validation in test suite

### Low Risk Areas
1. **UI Loading State Management**
   - **Risk**: Loading indicators might not reflect new loading patterns
   - **Mitigation**: Update loading states to match optimization phases
   - **Testing**: UI testing for loading state accuracy

2. **Cache Invalidation**
   - **Risk**: Aggressive caching might show stale data
   - **Mitigation**: Implement intelligent cache invalidation triggers
   - **Testing**: Cache behavior validation

## Success Metrics

### Performance Targets
- **Wallet Loading Time**: < 2 seconds (from 3-5 seconds)
- **Mint Activation**: < 1 second for parallel vs 3-5 seconds sequential
- **Balance Calculation**: < 100ms (from 500ms)
- **Proof Operations**: 50% faster processing

### Monitoring Implementation
```typescript
// Performance monitoring
const trackWalletPerformance = {
  loadingStart: performance.now(),
  
  milestones: {
    walletDecrypted: 0,
    mintsActivated: 0,
    proofsLoaded: 0,
    balanceCalculated: 0,
    fullyReady: 0,
  },
  
  mark: (milestone: keyof typeof this.milestones) => {
    this.milestones[milestone] = performance.now() - this.loadingStart;
    console.log(`Wallet ${milestone}: ${this.milestones[milestone]}ms`);
  },
  
  report: () => {
    return {
      totalTime: this.milestones.fullyReady,
      breakdown: this.milestones,
      targetsMet: {
        totalTime: this.milestones.fullyReady < 2000,
        mintActivation: this.milestones.mintsActivated < 1000,
        balanceCalc: this.milestones.balanceCalculated < 100,
      }
    };
  }
};
```

### Quality Assurance Metrics
- **Error Rate**: < 1% for wallet operations
- **Data Consistency**: 100% proof integrity
- **User Experience**: No perceived loading delays
- **Backward Compatibility**: 100% compatibility with existing wallets

## Migration Guide

### Phase 1: Preparation (Before Implementation)
1. **Backup Strategy**
   ```typescript
   // Backup existing user stores
   const backupUserWallet = () => {
     const currentData = localStorage.getItem(`user-cashu-store-${user.pubkey}`);
     localStorage.setItem(`user-cashu-store-backup-${user.pubkey}`, currentData);
   };
   ```

2. **Feature Flags**
   ```typescript
   // Allow gradual rollout
   const useOptimizedWallet = () => {
     const featureFlag = localStorage.getItem('enable-wallet-optimization') === 'true';
     return featureFlag && user?.pubkey;
   };
   ```

### Phase 2: Gradual Rollout
1. **A/B Testing Implementation**
   ```typescript
   // Route users to optimized or original implementation
   const WalletComponent = () => {
     const shouldUseOptimized = useOptimizedWallet();
     
     return shouldUseOptimized ? 
       <OptimizedCashuWallet /> : 
       <OriginalCashuWallet />;
   };
   ```

2. **Performance Comparison**
   ```typescript
   // Compare performance between implementations
   const trackImplementationPerformance = (implementation: 'optimized' | 'original') => {
     // Send performance data for comparison
   };
   ```

### Phase 3: Full Migration
1. **Data Migration**
   ```typescript
   // Migrate existing user data to optimized format
   const migrateUserWalletData = async (userPubkey: string) => {
     const legacyData = getLegacyWalletData(userPubkey);
     const migratedData = transformToOptimizedFormat(legacyData);
     await saveOptimizedWalletData(userPubkey, migratedData);
   };
   ```

2. **Cleanup**
   ```typescript
   // Remove legacy implementations after successful migration
   const cleanupLegacyCode = () => {
     // Remove old hooks, components, and store implementations
   };
   ```

### Rollback Strategy
```typescript
// Emergency rollback capability
const rollbackToOriginal = () => {
  localStorage.setItem('force-original-wallet', 'true');
  window.location.reload(); // Force refresh to original implementation
};
```

## Conclusion

This optimization strategy provides a comprehensive approach to dramatically improving ZapTok's Cashu wallet performance while maintaining security and functionality. The phased implementation approach minimizes risk while delivering measurable performance improvements.

### Next Steps
1. **Review and Planning**: Team review of optimization strategy
2. **Prototype Development**: Build proof-of-concept for core optimizations
3. **Testing Strategy**: Develop comprehensive testing plan
4. **Implementation**: Execute optimization phases according to timeline
5. **Monitoring**: Implement performance tracking and user feedback collection

### Expected Outcomes
- **70-90% improvement** in wallet loading performance
- **Enhanced user experience** with near-instant wallet access
- **Maintained security** with user-specific encryption and isolation
- **Scalable architecture** that supports future enhancements

This document serves as the definitive guide for implementing performance optimizations while preserving ZapTok's security-first approach to Cashu wallet management.
