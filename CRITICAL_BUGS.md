# Critical Bugs Documentation

This document outlines critical bugs that have affected ZapTok and provides technical guidance for future development.

## 🚨 Critical Bug #1: Wallet Connection Isolation Between Account Switcher

**Status**: `TEMPORARILY DISABLED` (Account switcher disabled as of commit hash: pending)  
**Severity**: `CRITICAL` - Affects core wallet functionality  
**Impact**: Users see incorrect wallet balances when switching between different signer types  

### Problem Description

The account switcher functionality creates a critical wallet isolation bug where Bitcoin Connect's global `window.webln` persists across user sessions, causing wallet balance display issues when users switch between different signer types (extension vs bunker signers).

### Technical Details

#### Root Cause
1. **Global State Pollution**: Bitcoin Connect sets up a global `window.webln` that persists across user sessions
2. **Signer Type Conflicts**: Extension signers (like Alby) should use browser extension WebLN, but Bitcoin Connect's WebLN takes priority
3. **Balance Display Issues**: Users see 0 sats instead of their actual wallet balance from their extension wallet

#### Affected Components
- `src/contexts/WalletContext.tsx` - Auto-detection logic
- `src/components/auth/DropdownList.tsx` - Account switcher UI
- `src/components/auth/LoginArea.tsx` - Account switcher integration
- `src/components/lightning/wallet-connections/EnhancedBitcoinConnectCard.tsx` - Bitcoin Connect setup

#### User Impact Scenario
1. User logs in with bunker signer → Bitcoin Connect WebLN is established
2. User switches to extension signer (Alby with 9,861 sats)
3. Bitcoin Connect's WebLN remains active globally
4. Extension signer detects Bitcoin Connect's WebLN instead of Alby's WebLN
5. User sees 0 sats instead of their actual 9,861 sats balance

### Attempted Fix (Partial Success)

A wallet context fix was implemented to detect Bitcoin Connect for extension signers and attempt to clear it:

```typescript
// WalletContext.tsx - Lines 142-180
const isExtensionSigner = user.signer?.constructor?.name?.includes('NIP07') || 
                         user.signer?.constructor?.name?.includes('Extension');

if (isExtensionSigner) {
  const isBitcoinConnect = window.webln.constructor?.name?.includes('BitcoinConnect') ||
                         'requestProvider' in window.webln ||
                         window.webln.constructor?.name === 'WebLNProvider' ||
                         'connectors' in window.webln;
  
  if (isBitcoinConnect) {
    // Clear Bitcoin Connect's WebLN to allow extension WebLN to take priority
    if (window.webln && 'disconnect' in window.webln) {
      await window.webln.disconnect();
    }
    delete (window as any).webln;
    // Wait for extension to potentially set up webln again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
```

**Issue**: This fix is incomplete because it doesn't address the fundamental architecture problem of global state management between different wallet providers.

### Current Mitigation

Account switching has been **temporarily disabled** to prevent users from encountering this critical bug:

#### Changes Made
1. **DropdownList.tsx**: Account switching sections disabled with explanatory text
2. **LoginArea.tsx**: Add account callback disabled
3. **UI Feedback**: Clear messaging that account switching is temporarily unavailable

```typescript
// DropdownList.tsx - Lines 133-153
{/* Account switching section - DISABLED due to wallet isolation bug */}
<div className='font-medium text-sm px-2 py-1.5 text-muted-foreground/70'>Switch Account</div>
<div className='px-2 py-1 text-xs text-muted-foreground/60 mb-2'>
  Account switching temporarily disabled due to wallet connection issues
</div>
{otherUsers.map((user) => (
  <DropdownMenuItem
    key={user.id}
    disabled={true}
    className='flex items-center gap-2 p-2 rounded-md opacity-40 cursor-not-allowed'
  >
    {/* Account items rendered but disabled */}
  </DropdownMenuItem>
))}
```

## 🔧 Technical Implementation Guidance for Future Fix

### Recommended Architecture Changes

#### 1. Wallet Provider Isolation Strategy

**Problem**: Global `window.webln` creates conflicts between different wallet providers.

**Solution**: Implement a wallet provider isolation layer that manages different WebLN instances separately.

```typescript
interface WalletProviderManager {
  providers: Map<string, WebLNProvider>;
  activeProvider: string | null;
  
  registerProvider(id: string, provider: WebLNProvider): void;
  switchProvider(id: string): Promise<void>;
  clearProvider(id: string): Promise<void>;
  getActiveProvider(): WebLNProvider | null;
}
```

#### 2. User-Specific Wallet Context

**Problem**: Wallet state persists across user sessions.

**Solution**: Implement user-scoped wallet contexts that are completely isolated.

```typescript
interface UserWalletContext {
  userId: string;
  signerType: 'extension' | 'bunker' | 'nsec';
  walletProvider: WalletProviderType;
  connection: WalletConnection | null;
  balance: number;
}

// Store contexts per user
const userWalletContexts = new Map<string, UserWalletContext>();
```

#### 3. Signer Type Detection Improvements

**Current Issue**: Signer type detection is inconsistent and relies on constructor names.

**Solution**: Implement more robust signer type detection.

```typescript
function detectSignerType(signer: NostrSigner): SignerType {
  // Check for specific NIP-07 methods (extension)
  if ('getPublicKey' in signer && 'signEvent' in signer && typeof window !== 'undefined' && window.nostr) {
    return 'extension';
  }
  
  // Check for bunker-specific properties
  if (signer.constructor?.name?.includes('bunker') || 'relay' in signer) {
    return 'bunker';
  }
  
  // Check for nsec signer
  if ('_privateKey' in signer || signer.constructor?.name?.includes('nsec')) {
    return 'nsec';
  }
  
  return 'unknown';
}
```

#### 4. WebLN Provider Priority System

**Problem**: Bitcoin Connect WebLN overrides extension WebLN globally.

**Solution**: Implement a priority-based WebLN provider system.

```typescript
enum WebLNProviderPriority {
  EXTENSION = 1,      // Highest priority for extension signers
  BITCOIN_CONNECT = 2, // Lower priority, only for bunker signers
  FALLBACK = 3        // Lowest priority
}

interface WebLNProviderEntry {
  provider: WebLNProvider;
  priority: WebLNProviderPriority;
  signerTypes: SignerType[];
}
```

### Implementation Roadmap

#### Phase 1: Core Architecture (High Priority)
1. **Create WalletProviderManager**: Centralized management of wallet providers
2. **Implement User-Scoped Contexts**: Isolate wallet state per user
3. **Add Provider Priority System**: Ensure correct WebLN provider selection
4. **Improve Signer Detection**: More reliable signer type identification

#### Phase 2: Integration & Testing (Medium Priority)
1. **Update WalletContext**: Integrate new architecture
2. **Modify Account Switcher**: Use new isolation system
3. **Comprehensive Testing**: Test all signer type combinations
4. **Migration Strategy**: Safely migrate existing users

#### Phase 3: Enhancement & Monitoring (Low Priority)
1. **Add Provider Diagnostics**: Better debugging tools
2. **Implement Health Checks**: Monitor wallet connection state
3. **User Experience Improvements**: Better error messaging
4. **Documentation**: Complete technical documentation

### Testing Strategy

#### Critical Test Cases
1. **Extension to Bunker Switch**: Verify Bitcoin Connect doesn't interfere with extension WebLN
2. **Bunker to Extension Switch**: Verify extension WebLN properly replaces Bitcoin Connect
3. **Multiple Account Sessions**: Test rapid switching between different accounts
4. **Wallet Balance Persistence**: Verify user-specific balances are maintained
5. **Connection Recovery**: Test wallet reconnection after provider switches

#### Automated Testing Requirements
```typescript
describe('Wallet Isolation', () => {
  it('should isolate wallet connections per user', async () => {
    // Test user A with extension signer
    const userA = await loginWithExtension();
    expect(getWalletBalance()).toBe(9861); // Alby balance
    
    // Switch to user B with bunker signer  
    const userB = await loginWithBunker();
    expect(getWalletBalance()).toBe(0); // No Bitcoin Connect balance
    
    // Switch back to user A
    await switchToUser(userA);
    expect(getWalletBalance()).toBe(9861); // Should restore Alby balance
  });
});
```

### Risk Assessment

#### High Risk Areas
- **Global State Management**: `window.webln` modifications
- **Provider Initialization**: Bitcoin Connect setup timing
- **User Session Transitions**: Account switching logic
- **WebLN Detection**: Signer type identification

#### Mitigation Strategies
- **Gradual Rollout**: Enable account switching for limited user groups first
- **Rollback Plan**: Keep disable mechanism for quick rollback
- **Monitoring**: Add extensive logging for wallet connection events
- **User Communication**: Clear messaging about wallet connection status

### Success Criteria

#### Functional Requirements
- [ ] Users can switch between accounts without wallet balance issues
- [ ] Extension signers consistently use browser extension WebLN
- [ ] Bunker signers properly use Bitcoin Connect WebLN
- [ ] Wallet balances persist correctly per user session
- [ ] No global state pollution between user sessions

#### Performance Requirements
- [ ] Account switching completes within 2 seconds
- [ ] Wallet provider detection is reliable (>99% accuracy)
- [ ] No memory leaks from wallet provider instances
- [ ] Graceful handling of wallet connection failures

### Related Issues

- **Issue #1**: Wallet balance shows 0 sats instead of actual balance
- **Issue #2**: Bitcoin Connect persists across extension signer sessions
- **Issue #3**: Account switcher creates wallet state confusion

### References

- **Wallet Context Implementation**: `src/contexts/WalletContext.tsx`
- **Bitcoin Connect Integration**: `src/components/lightning/wallet-connections/EnhancedBitcoinConnectCard.tsx`
- **Account Switcher UI**: `src/components/auth/DropdownList.tsx`
- **WebLN Specification**: [WebLN API Documentation](https://www.webln.guide/)
- **Bitcoin Connect Docs**: [Bitcoin Connect GitHub](https://github.com/getAlby/bitcoin-connect)

---

**Last Updated**: August 23, 2025  
**Document Version**: 1.0  
**Next Review**: When implementing account switcher re-enablement

> ⚠️ **Important**: Do not re-enable account switching without implementing the recommended architecture changes outlined in this document. The current mitigation (disabled account switching) should remain in place until a comprehensive fix is developed and thoroughly tested.
