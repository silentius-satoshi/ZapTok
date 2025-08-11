# Nostr Implementation Possibilities (NIPs) - Complete Reference

This directory contains the complete set of official Nostr protocol specifications for reference during development.

## Implementation Status in ZapTok

### ✅ Fully Implemented
- **[NIP-01](./NIP-01.md)**: Basic protocol flow description
- **[NIP-02](./NIP-02.md)**: Contact List and Petnames
- **[NIP-05](./NIP-05.md)**: DNS-based verification
- **NIP-07**: `window.nostr` capability for web browsers
- **[NIP-19](./NIP-19.md)**: bech32-encoded entities
- **NIP-25**: Reactions
- **NIP-46**: Nostr Connect
- **[NIP-57](./NIP-57.md)**: Lightning Zaps
- **[NIP-71](./NIP-71.md)**: Video Events
- **NIP-94**: File Metadata
- **NIP-60**: Cashu Wallets (custom implementation)
- **NIP-61**: Nutzaps (custom implementation)

### 🚧 Partially Implemented
- **[NIP-47](./NIP-47.md)**: Wallet Connect (core features implemented, advanced features pending)

### ❌ Not Implemented
- **[NIP-03](./NIP-03.md)**: OpenTimestamps Attestations (documented, ready for implementation)
- **NIP-04**: Encrypted Direct Message (deprecated, use NIP-17)
- **NIP-06**: Basic key derivation from mnemonic seed phrase
- **NIP-08**: Handling Mentions
- **NIP-09**: Event Deletion
- **NIP-10**: Conventions for clients' use of `e` and `p` tags
- **NIP-11**: Relay Information Document
- **NIP-13**: Proof of Work
- **NIP-14**: Subject tag in text events
- **NIP-15**: Nostr Marketplace (for resilient marketplaces)
- **NIP-17**: Private Direct Messages
- **NIP-18**: Reposts
- **NIP-21**: `nostr:` URI scheme
- **NIP-23**: Long-form Content
- **NIP-24**: Extra metadata fields and tags
- **NIP-26**: Delegated Event Signing
- **NIP-27**: Text Note References
- **NIP-28**: Public Chat
- **NIP-30**: Custom Emoji
- **NIP-31**: Dealing with unknown event kinds
- **NIP-32**: Labeling
- **NIP-33**: Parameterized Replaceable Events
- **NIP-36**: Sensitive Content / Content Warning
- **NIP-38**: User Statuses
- **NIP-39**: External Identities in Profiles
- **NIP-40**: Expiration Timestamp
- **NIP-42**: Authentication of clients to relays
- **NIP-44**: Versioned Encryption
- **NIP-45**: Counting results
- **NIP-48**: Proxy Tags
- **NIP-50**: Search Capability
- **NIP-51**: Lists
- **NIP-52**: Calendar Events
- **NIP-53**: Live Activities
- **NIP-56**: Reporting
- **NIP-58**: Badges
- **NIP-59**: Gift Wraps
- **NIP-65**: Relay List Metadata
- **NIP-72**: Moderated Communities
- **NIP-75**: Zap Goals
- **NIP-78**: Application-specific data
- **NIP-84**: Highlights
- **NIP-89**: Recommended Application Handlers
- **NIP-90**: Data Vending Machines
- **NIP-94**: File Metadata
- **NIP-96**: File Storage Integration
- **NIP-98**: HTTP Auth
- **NIP-99**: Classified Listings

## Quick Reference

### Core Protocol (Always Needed)
- [NIP-01](./NIP-01.md): Basic protocol flow description ✅
- [NIP-19](./NIP-19.md): bech32-encoded entities ✅
- [NIP-07](./NIP-07.md): Browser extension interface ✅

### Identity & Social
- [NIP-02](./NIP-02.md): Contact lists and petnames 🚧
- [NIP-05](./NIP-05.md): DNS verification ❌
- [NIP-08](./NIP-08.md): Handling mentions ❌
- [NIP-25](./NIP-25.md): Reactions ✅

### Content & Media  
- [NIP-23](./NIP-23.md): Long-form content ❌
- [NIP-71](./NIP-71.md): Video Events ✅
- [NIP-94](./NIP-94.md): File metadata ✅

### Payments & Economy
- [NIP-47](./NIP-47.md): Wallet Connect ✅
- [NIP-57](./NIP-57.md): Lightning Zaps ✅
- [NIP-60](./NIP-60.md): Cashu Wallets ✅
- [NIP-61](./NIP-61.md): Nutzaps ✅
- [NIP-87](./NIP-87.md): Cashu Mint Discovery 🚧

### Privacy & Security
- [NIP-17](./NIP-17.md): Private Direct Messages ❌
- [NIP-44](./NIP-44.md): Versioned Encryption ❌
- [NIP-59](./NIP-59.md): Gift Wraps ❌

### Infrastructure
- [NIP-03](./NIP-03.md): OpenTimestamps Attestations ❌
- [NIP-11](./NIP-11.md): Relay Information Document ❌
- [NIP-42](./NIP-42.md): Client authentication to relays ❌

### Advanced Features
- [NIP-26](./NIP-26.md): Delegated Event Signing ❌
- [NIP-33](./NIP-33.md): Parameterized Replaceable Events ❌
- [NIP-50](./NIP-50.md): Search Capability ❌
- [NIP-96](./NIP-96.md): File Storage Integration ❌

## Usage

When implementing new features:

1. **Reference the relevant NIP**: Check `docs/nips/NIP-XX.md` for the full specification
2. **Update implementation status**: Mark as implemented in this index
3. **Add validation**: Create validation functions in `/src/lib/nip-validation/`
4. **Add tests**: Test the implementation against the NIP specification
5. **Update compliance monitoring**: Add to the NIP-01 monitor if applicable

## Sources

All NIPs are sourced from the official repository:
- **GitHub**: https://github.com/nostr-protocol/nips
- **Website**: https://nips.nostr.com
- **Last Updated**: July 2025
