# Cashu Store Architecture

## Store Boundaries & Responsibilities

### 🔒 User-Specific Store (`useUserCashuStore`)
**Personal wallet data that should be isolated per user:**

```typescript
interface UserCashuStore {
  // Personal wallet data
  wallets: CashuWalletStruct[];
  wallet: CashuWalletStruct | null;
  activeWalletId: string | null;
  
  // Personal proofs
  proofs: Proof[];
  proofEventMap: Map<string, string>;
  
  // Personal pending data
  pendingProofs: Proof[];
  pendingProofEvents: string[];
  
  // Personal operations
  addWallet: (wallet: CashuWalletStruct) => void;
  updateWallet: (wallet: CashuWalletStruct) => void;
  removeWallet: (walletId: string) => void;
  setActiveWallet: (walletId: string | null) => void;
  addProofs: (proofs: Proof[], eventId: string) => void;
  // ... other personal operations
}
```

### 🌐 Global Store (`useCashuStore`)
**Shared network data that's common across all users:**

```typescript
interface GlobalCashuStore {
  // Shared mint information
  mints: CashuMintStruct[];
  activeMintUrl: string | null;
  
  // Shared quote data (temporary, request-specific)
  mintQuotes: Map<string, MintQuoteResponse>;
  meltQuotes: Map<string, MeltQuoteResponse>;
  
  // Shared operations
  addMint: (mint: CashuMintStruct | string) => void;
  removeMint: (url: string) => void;
  setActiveMintUrl: (url: string | null) => void;
  setMintInfo: (url: string, info: any) => void;
  setKeysets: (url: string, keysets: any[]) => void;
  // ... other shared operations
}
```

## Data Flow Rules

### ✅ Correct Patterns

1. **Wallet Operations → User Store**
   ```typescript
   // ✅ Personal wallet operations write to user store
   const userStore = useUserCashuStore(user?.pubkey);
   userStore.addWallet(newWallet);
   userStore.addProofs(proofs, eventId);
   ```

2. **Mint Operations → Global Store**
   ```typescript
   // ✅ Shared mint data writes to global store
   const globalStore = useCashuStore();
   globalStore.addMint(mintUrl);
   globalStore.setMintInfo(mintUrl, mintInfo);
   ```

3. **Component Data Access**
   ```typescript
   // ✅ Components read from appropriate store
   const userStore = useUserCashuStore(user?.pubkey);  // For wallet data
   const globalStore = useCashuStore();                // For mint data
   
   const balance = userStore.getTotalBalance();        // Personal data
   const activeMint = globalStore.activeMintUrl;       // Shared data
   ```

### ❌ Anti-Patterns to Fix

1. **Writing Personal Data to Global Store**
   ```typescript
   // ❌ Bad: Personal wallet data in global store
   cashuStore.addWallet(userWallet);
   cashuStore.addProofs(userProofs, eventId);
   ```

2. **Auto-sync Dependencies**
   ```typescript
   // ❌ Bad: Requiring sync between stores
   useEffect(() => {
     userStore.syncFrom(globalStore);
   }, [globalStore.wallets]);
   ```

## Migration Strategy

### Phase 1: Hook Modifications
- Update `useCashuWallet` to write to user-specific store
- Update wallet creation hooks to target correct store
- Update proof management to use user-specific store

### Phase 2: Component Updates  
- Update wallet display components to read from user store
- Update mint management components to use global store
- Remove auto-sync mechanisms

### Phase 3: Store Cleanup
- Remove personal data fields from global store
- Remove shared data fields from user store
- Clean up duplicate methods

## Benefits

1. **Clear Separation**: No confusion about where data belongs
2. **No Sync Required**: Data writes to correct store initially
3. **Better Performance**: No unnecessary synchronization overhead
4. **Easier Testing**: Clear boundaries make mocking simpler
5. **Account Isolation**: User data is naturally isolated
