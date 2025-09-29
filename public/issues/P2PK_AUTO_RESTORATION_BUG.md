# P2PK Auto-Restoration Bug

**Issue Type**: Critical Bug  
**Component**: Cashu Wallet Management  
**Status**: Identified - Investigation Required  
**Affects**: P2PK token cleanup functionality  

## Problem Summary

P2PK-locked Cashu tokens that were created in a wallet that had its wallet data erased and are no longer unlockable are automatically restored to the wallet immediately after being successfully removed via the P2PK cleanup function, despite the deletion event being properly published to Nostr relays.

## Technical Details

### Expected Behavior
1. User runs P2PK cleanup function
2. System identifies unlockable P2PK proofs (proofs locked to different pubkeys from erased wallets)
3. System removes unlockable proofs from wallet
4. Publishes deletion event to Nostr relay
5. Balance permanently decreases by removed proof amounts
6. Unlockable proofs remain deleted

### Actual Behavior
1. ✅ User runs P2PK cleanup function
2. ✅ System identifies unlockable P2PK proofs correctly
3. ✅ System removes unlockable proofs from wallet
4. ✅ Publishes deletion event to Nostr relay (relay accepts event)
5. ✅ Balance temporarily decreases by removed proof amounts
6. ❌ **Unlockable proofs are automatically restored within seconds**
7. ❌ Balance returns to original amount including unlockable proofs

## Evidence from Console Logs

```javascript
// Successful cleanup - proofs correctly identified and removed
[P2PK Cleanup] Starting cleanup for mint: https://mint.chorus.community
[P2PK Cleanup] User's P2PK pubkey: 02ac1e8273d93efcafa81225004a45d9bfda9e8019b57b3e9738c42d0c79027ddd
[P2PK Cleanup] Found 2 P2PK proofs out of 4 total proofs
[P2PK Cleanup] P2PK proof: 8 sats, secret: [REDACTED]
[P2PK Cleanup] P2PK proof: 2 sats, secret: [REDACTED]

// Ownership verification works correctly
[P2PK Cleanup] P2PK proof belongs to different pubkey: 022b0f42bce20deafdb3cf4429b4515d293916fdbb56c2a6de47489cb8905fa114 (user: 02ac1e8273d93efcafa81225004a45d9bfda9e8019b57b3e9738c42d0c79027ddd)
[P2PK Cleanup] Marking as unspendable - user cannot unlock this P2PK proof

// Successful removal and relay acceptance
[P2PK Cleanup] Found 2 unspendable P2PK proofs to remove
[P2PK Cleanup] Removing 2 proofs totaling 10 sats
Removed 2 unspendable P2PK proofs totaling 10 sats from https://mint.chorus.community
✅ relay.chorus.community accepted event 0e8627968be0...

// Balance changes show the problem
Balance: 8 sats (reactive value)    // ✅ Correct after cleanup
Balance: 18 sats (reactive value)   // ❌ Unlockable proofs restored
```

## Impact Assessment

### User Impact
- **High**: Users cannot permanently remove inaccessible P2PK tokens from erased wallets
- **Wallet pollution**: Unlockable P2PK proofs clutter wallet balance and interface
- **Misleading balance**: Display shows sats that cannot be spent
- **UX confusion**: Cleanup appears to work but doesn't persist

### System Impact
- **Data integrity**: Inconsistent state between cleanup action and actual wallet contents
- **Storage waste**: Unnecessary storage of unusable proof data
- **Performance**: Repeated processing of unlockable proofs in wallet operations

### Cross-Client Verification
- **Chorus client** also shows the same inflated balance (18 sats instead of 8)
- Indicates the unlockable proofs are being restored from persistent/shared storage
- Problem affects multiple clients using the same wallet data

## Root Cause Analysis

### Working Components ✅
- **P2PK Detection**: Multi-pattern matching correctly identifies P2PK proofs
- **Ownership Verification**: Properly compares proof pubkeys vs user pubkey
- **Proof Removal**: Successfully removes unlockable proofs from active wallet
- **Nostr Publishing**: Deletion events are properly published and accepted by relays
- **State Management**: Initial balance updates work correctly

### Suspected Failure Points ❌
1. **Reactive State Sync**: Cleanup removes from one state store but not others
2. **Persistent Storage**: Unlockable proofs restored from localStorage/IndexedDB
3. **Token Auto-Import**: Background processes re-importing tokens from various sources
4. **Wallet Restoration**: System restoring from cached/backup token data
5. **Nostr Event Processing**: Re-processing of Cashu tokens from Nostr events
6. **External API Sync**: Restoration from Blossom servers or other external sources

## Investigation Areas

### 1. State Management
- **Multiple stores**: Check if cleanup updates all relevant state stores
- **Reactive dependencies**: Identify which reactive values trigger restoration
- **Store synchronization**: Look for sync operations that might restore proofs

### 2. Token Import Sources
```javascript
// Potential restoration sources to investigate:
- useUrlTokenProcessor: URL-based token imports
- localStorage: Cached token data
- Nostr events: Re-processing of Cashu token events
- Blossom APIs: External token storage
- Wallet sync: Cross-device synchronization
```

### 3. Timing Analysis
- Restoration occurs within **seconds** of cleanup
- Suggests automated process rather than user action
- Likely triggered by reactive state change or scheduled sync

### 4. Cross-Client Consistency
- Both ZapTok and Chorus show same incorrect balance
- Points to shared storage mechanism (not just local state)
- Indicates restoration happens at storage/persistence layer

## Debugging Strategy

### 1. Add Restoration Monitoring
```javascript
// Add logging to detect when/where proofs are re-added
console.log('[Proof Restoration] Proof added:', proof);
console.trace('[Proof Restoration] Stack trace for proof addition');
```

### 2. Storage Analysis
- Monitor localStorage for Cashu token data changes
- Check IndexedDB for wallet state persistence
- Identify which storage operations occur after cleanup

### 3. Event Flow Tracking
- Track all wallet state changes after cleanup
- Monitor token import/processing events
- Identify the source of proof restoration

### 4. Process Isolation
- Test cleanup in isolation (disable auto-import features)
- Check if restoration occurs with network disabled
- Verify behavior with different relay configurations

## Potential Solutions

### 1. Comprehensive State Cleanup
- Ensure cleanup removes proofs from ALL state stores
- Update persistent storage in addition to reactive state
- Clear cached token data that might trigger restoration

### 2. Import Filtering
- Add unlockable proof detection to token import processes
- Prevent re-import of previously deleted unlockable proofs
- Maintain deletion history/blacklist

### 3. Storage Layer Fix
- Update storage operations to respect proof deletions
- Implement proper cascade deletion across storage systems
- Add deletion event processing at storage layer

## Priority Classification

**Priority**: 🔴 **HIGH**
- Critical wallet functionality affected
- User-facing feature completely broken
- Data consistency issues
- Affects multiple clients

## Next Steps

1. **Immediate**: Add comprehensive logging to identify restoration source
2. **Short-term**: Implement monitoring for all proof addition operations
3. **Medium-term**: Fix identified restoration mechanism
4. **Long-term**: Implement proper deletion cascade across all storage layers

## Related Issues

- Unlockable P2PK proof ownership verification (✅ Resolved)
- Multi-pattern P2PK detection (✅ Resolved)
- Proof state validation (✅ Working)
- **Auto-restoration prevention** (❌ This issue)

---

**Created**: 2024-09-24  
**Last Updated**: 2024-09-24  
**Reporter**: System Analysis  
**Assignee**: Investigation Required