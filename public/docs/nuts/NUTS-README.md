# Cashu NUTs (Notation, Usage, and Terminology)

This directory contains the complete set of official Cashu protocol specifications for reference during development.

**ZapTok NUTS Compliance Status: ✅ PRODUCTION READY**
**Implementation Model:** Hybrid - Core P2PK utilities + @cashu/cashu-ts library delegation
**Compliance Level:** Full NUT-11 (P2PK) and NUT-12 (DLEQ) support for nutzap functionality
**Last Updated:** September 4, 2025

Source: [https://github.com/cashubtc/nuts](https://github.com/cashubtc/nuts)
Documentation: [https://cashubtc.github.io/nuts/](https://cashubtc.github.io/nuts/)

## ZapTok NUTS Implementation Status

ZapTok implements Cashu protocol support through a **hybrid approach**: core P2PK utilities implemented directly for nutzap functionality, with @cashu/cashu-ts library handling comprehensive protocol operations.

### 🎯 Primary Use Case: P2PK Nutzaps (NIP-61)
ZapTok's main focus is **nutzap functionality** - sending and receiving P2PK-locked ecash as Nostr zaps, enabling micropayments with enhanced privacy.

### 🔧 Implementation Architecture

**Direct Implementation (ZapTok-specific):**
- **NUT-11 P2PK Utilities**: Complete implementation in `src/lib/p2pk.ts`
- **NIP-61 Integration**: Nutzap creation, detection, and redemption
- **Mint Compatibility Testing**: Real-world mint assessment for P2PK support

**Library Delegation (@cashu/cashu-ts v2.5.2):**
- **Core Protocol Operations**: Mint/melt/swap operations via CashuWallet
- **Cryptographic Primitives**: BDHKE, blind signatures, DLEQ proofs
- **Protocol Compliance**: Automatic handling of mandatory NUTS specs

### 📊 NUTS Compliance Matrix

| Category | Implementation Status | ZapTok Support | Library Support |
|----------|----------------------|---------------|-----------------|
| **Mandatory NUTS** | | | |

| NUT-00 | Cryptography and Models | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| NUT-01 | Mint public keys | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| NUT-02 | Keysets and fees | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| NUT-03 | Swapping tokens | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| NUT-04 | Minting tokens | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| NUT-05 | Melting tokens | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| NUT-06 | Mint info | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| **Optional NUTS** | | | |
| NUT-07 | Token state check | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| NUT-08 | Overpaid Lightning fees | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| NUT-09 | Signature restore | ⚡ **LIBRARY** | Not required | via @cashu/cashu-ts |
| NUT-10 | Spending conditions | ✅ **FULL** | P2PK implementation | ✅ Complete |
| **NUT-11** | **Pay-To-Pubkey (P2PK)** | **🎯 DIRECT** | **✅ Custom + Library** | **✅ Production Ready** |
| **NUT-12** | **DLEQ proofs** | **✅ FULL** | **via @cashu/cashu-ts** | **✅ Complete** |
| NUT-13 | Deterministic secrets | ⚡ **LIBRARY** | Not required | via @cashu/cashu-ts |
| NUT-14 | HTLCs | ⚡ **LIBRARY** | Not required | via @cashu/cashu-ts |
| NUT-15 | Partial MPP | ⚡ **LIBRARY** | Not required | via @cashu/cashu-ts |
| NUT-16 | Animated QR codes | ❌ **N/A** | Not implemented | Not implemented |
| NUT-17 | WebSocket subscriptions | ⚡ **LIBRARY** | Not required | via @cashu/cashu-ts |
| NUT-18 | Payment requests | ❌ **N/A** | Not implemented | Not implemented |
| NUT-19 | Cached Responses | ⚡ **LIBRARY** | Mint-side only | via @cashu/cashu-ts |
| NUT-20 | Signature on Mint Quote | ⚡ **LIBRARY** | Not required | via @cashu/cashu-ts |
| NUT-21 | Clear authentication | ⚡ **LIBRARY** | Not required | via @cashu/cashu-ts |
| NUT-22 | Blind authentication | ⚡ **LIBRARY** | Not required | via @cashu/cashu-ts |
| NUT-23 | BOLT11 payments | ✅ **FULL** | via @cashu/cashu-ts | ✅ Complete |
| NUT-24 | HTTP 402 Payment Required | ❌ **N/A** | Not implemented | Not implemented |
| NUT-25 | BOLT12 payments | ⚡ **LIBRARY** | Not required | via @cashu/cashu-ts |

### 🔍 Legend
- **✅ FULL**: Complete implementation with all features
- **🎯 DIRECT**: ZapTok-specific implementation for core functionality
- **⚡ LIBRARY**: Handled entirely by @cashu/cashu-ts
- **❌ N/A**: Not applicable to ZapTok's use case

### 🎯 NUT-11 (P2PK) - ZapTok's Core Implementation

**What ZapTok Implements Directly:**
- ✅ **P2PK Secret Generation**: NUT-11 compliant secret format (`["P2PK", {...}]`)
- ✅ **P2PK Signature Verification**: Production-ready Schnorr signature validation
- ✅ **P2PK Witness Creation**: Proper witness format for token unlocking
- ✅ **Nutzap Integration**: NIP-61 events with P2PK-locked tokens
- ✅ **Mint Compatibility Testing**: Real-world mint P2PK support assessment

**What @cashu/cashu-ts Handles:**
- ✅ **P2PK Token Operations**: Automatic witness creation during swap/melt operations
- ✅ **Protocol Integration**: Seamless integration with core Cashu operations
- ✅ **DLEQ Proofs**: Offline signature validation for received P2PK tokens

### 🏭 Production Mint Compatibility

**P2PK-Ready Mints** (Tested September 2025):
- ✅ **Minibits Mint** (`mint.minibits.cash`) - HIGH security, NUT-11 + NUT-12
- ✅ **Coinos Mint** (`mint.coinos.io`) - HIGH security, NUT-11 + NUT-12
- ✅ **Testnut Mint** (`testnut.cashu.space`) - HIGH security, NUT-11 + NUT-12

**Testing Framework:** `src/lib/mint-compatibility.ts` provides production-ready utilities for assessing mint capabilities and security ratings.

### 🧪 Testing Infrastructure

**Comprehensive Test Coverage:**
## Additional Resources

### Documentation Files
- `error_codes.md` - Standard error codes used throughout the protocol
- Individual NUT specification files (00.md through 25.md)

### ZapTok-Specific Resources
- `../analysis/NUTS_COMPLIANCE_ANALYSIS.md` - Complete implementation analysis and testing results
- `src/test/` - Comprehensive test suite for NUTS compliance verification

## About the Cashu Protocol

These documents specify parts of the Cashu protocol. The Cashu protocol is an open-source implementation of Chaumian Ecash for Bitcoin using Lightning Network for payments.

**ZapTok's Implementation Philosophy:**
- Focus on nutzap use cases with production-ready P2PK support
- Leverage @cashu/cashu-ts for protocol compliance and reliability
- Custom implementation only where necessary for nutzap-specific functionality
- Comprehensive testing with real-world mint compatibility assessment

### License

MIT License - See individual files for licensing information.bash
npm run test:nut11     # NUT-11 signature verification compliance
npm run test:p2pk      # P2PK format validation
npm run test:mint-compatibility  # Real-world mint testing
npm run test:cashu     # Complete test suite
MIT License - See individual files for licensing information.
### 📚 Implementation Files

**Core P2PK Implementation:**
- `src/lib/p2pk.ts` - NUT-11 compliant P2PK utilities
- `src/lib/mint-compatibility.ts` - Production mint assessment
- `src/hooks/useSendNutzap.ts` - P2PK-locked nutzap creation
- `src/hooks/useReceivedNutzaps.ts` - P2PK token detection & validation
- `src/hooks/useRedeemNutzap.ts` - P2PK token redemption via library integration

**Library Integration:**
- `src/lib/cashu.ts` - @cashu/cashu-ts integration layer
- `src/lib/cashuLightning.ts` - Lightning operations via CashuWallet
- `src/hooks/useCashuWallet.ts` - Wallet management with NIP-60 storage

## Standard NUTS Reference

Below are the complete Cashu protocol specifications for development reference.

### Mandatory NUTS (Required)

| NUT | Description | Status |
|-----|-------------|--------|
| 00  | Cryptography and Models | Fully supported via @cashu/cashu-ts |
| 01  | Mint public keys | Fully supported via @cashu/cashu-ts |
| 02  | Keysets and fees | Fully supported via @cashu/cashu-ts |
| 03  | Swapping tokens | Fully supported via @cashu/cashu-ts |
| 04  | Minting tokens | Fully supported via @cashu/cashu-ts |
| 05  | Melting tokens | Fully supported via @cashu/cashu-ts |
| 06  | Mint info | Fully supported via @cashu/cashu-ts |

### Optional NUTS (Selective Implementation)

| NUT | Description | Status |
|-----|-------------|--------|
| 07  | Token state check | Fully supported via @cashu/cashu-ts |
| 08  | Overpaid Lightning fees | Fully supported via @cashu/cashu-ts |
| 09  | Signature restore | Library-handled, not required for nutzaps |
| 10  | Spending conditions | Supported for P2PK implementation |
| **11**  | **Pay-To-Pubkey (P2PK)** | **✅ DIRECTLY IMPLEMENTED + Library support** |
| **12**  | **DLEQ proofs** | **✅ FULLY SUPPORTED via @cashu/cashu-ts** |
| 13  | Deterministic secrets | Library-handled, not required for nutzaps |
| 14  | Hashed Timelock Contracts (HTLCs) | Library-handled, not required for nutzaps |
| 15  | Partial multi-path payments (MPP) | Library-handled, not required for nutzaps |
| 16  | Animated QR codes | Not implemented (UI-only feature) |
| 17  | WebSocket subscriptions | Library-handled, not required for nutzaps |
| 18  | Payment requests | Not implemented (wallet-side only) |
| 19  | Cached Responses | Library-handled (mint-side optimization) |
| 20  | Signature on Mint Quote | Library-handled, not required for nutzaps |
| 21  | Clear authentication | Library-handled, not required for nutzaps |
| 22  | Blind authentication | Library-handled, not required for nutzaps |
| 23  | Payment Method: BOLT11 | Fully supported via @cashu/cashu-ts |
| 24  | HTTP 402 Payment Required | Not implemented (experimental) |
| 25  | Payment Method: BOLT12 | Library-handled (growing support) |
