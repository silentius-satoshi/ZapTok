# Test Directory

This directory contains various test files for the ZapTok application.

## Existing Tests

### Component Tests
- `account-isolation.test.tsx` - Account isolation verification
- `user-transaction-history-isolation.test.tsx` - Transaction history isolation
- `wallet-isolation.test.tsx` - Wallet isolation testing

### Library Tests  
- `profile-verification.test.ts` - Profile verification functionality

### Test Infrastructure
- `setup.ts` - Vitest test environment configuration
- `TestApp.tsx` - Test app wrapper with providers
- `AccountIsolationVerifier.ts` - Account isolation verification utilities

## NUTS Compliance Tests

### `nuts-compliance.test.js`
**Purpose**: Verifies NUTS (Cashu protocol) compliance for nutzap functionality.

**What it tests**:
- NUT-11 P2PK secret generation and format compliance
- NUT-12 DLEQ proof support verification
- NUT-10 spending conditions (via NUT-11)
- Library version and feature compatibility
- Secret format alignment with official specifications

**How to run**:
```bash
npm run test:nuts
```

### `p2pk-format.test.js`
**Purpose**: Verifies P2PK secret format compatibility between our implementation and the Cashu library.

**What it tests**:
- @cashu/cashu-ts P2PK secret format analysis
- Format consistency across multiple generations
- NUT-11 specification compliance verification
- Implementation guidance for custom P2PK utilities

**How to run**:
```bash
npm run test:p2pk
```

### Combined Cashu Testing
Run all Cashu-related tests together:
```bash
npm run test:cashu
```

## Running Tests

### All Tests
```bash
npm test
```

### Individual Test Categories
```bash
npm run test:nuts    # NUTS compliance verification
npm run test:p2pk    # P2PK format compatibility  
npm run test:cashu   # All Cashu-related tests
```

### Vitest UI
```bash
npm run test:ui
```