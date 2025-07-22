NIP-60 & NIP-61 Implementation
==============================

Cashu Wallets and Nutzaps on Nostr
----------------------------------

`implemented` `optional`

This document describes ZapTok's implementation of NIP-60 Cashu wallets and NIP-61 Nutzaps, which provides Nostr-native eCash functionality with cross-application interoperability and P2P zapping.

## Implementation Overview

ZapTok implements both NIP-60 compliant Cashu wallets and NIP-61 Nutzaps that store wallet state as encrypted Nostr events rather than local storage, enabling:

- **Cross-application interoperability**: Wallets work across any NIP-60 compliant Nostr client
- **Event-driven state management**: Wallet state is synchronized via Nostr events
- **NIP-44 encryption**: All sensitive data is encrypted using the user's Nostr keypair
- **P2PK nutzap support**: Automatic private key generation for receiving NIP-61 nutzaps
- **Nutzap sending/receiving**: Full NIP-61 implementation with P2PK locked tokens

## Event Types Used

### Kind 17375: Wallet Event (Replaceable)
Defines the wallet configuration and P2PK private key for receiving nutzaps.

```json
{
  "kind": 17375,
  "content": "<nip44_encrypted_json>",
  "tags": [
    ["mint", "https://mint1.example.com"],
    ["mint", "https://mint2.example.com"]
  ]
}
```

**Encrypted content structure:**
```json
{
  "privkey": "64_char_hex_private_key",
  "mint": [
    "https://mint1.example.com",
    "https://mint2.example.com"
  ]
}
```

### Kind 10019: Nutzap Info Event (Replaceable)
Advertises user's capability to receive nutzaps with trusted mints and P2PK key.

```json
{
  "kind": 10019,
  "content": "",
  "tags": [
    ["relay", "wss://relay.example.com"],
    ["mint", "https://mint1.example.com", "sat"],
    ["mint", "https://mint2.example.com", "sat"],
    ["pubkey", "02abcd..."]
  ]
}
```

### Kind 9321: Nutzap Event (Regular)
Contains P2PK-locked Cashu proofs sent as a nutzap to another user.

```json
{
  "kind": 9321,
  "content": "Great post!",
  "tags": [
    ["proof", "{\"amount\":100,\"id\":\"abc123\",\"secret\":\"[\\\"P2PK\\\",{...}]\",\"C\":\"02...\"}"],
    ["u", "https://mint.example.com"],
    ["p", "recipient_pubkey"],
    ["e", "nutzapped_event_id", "relay_hint"]
  ]
}
```

### Kind 7375: Token Event (Regular)
Contains unspent Cashu proofs for a specific mint.

```json
{
  "kind": 7375,
  "content": "<nip44_encrypted_json>",
  "tags": []
}
```

**Encrypted content structure:**
```json
{
  "mint": "https://mint.example.com",
  "proofs": [
    {
      "id": "005c2502034d4f12",
      "amount": 1,
      "secret": "z+zyxAVLRqN9lEjxuNPSyRJzEstbl69Jc1vtimvtkPg=",
      "C": "0241d98a8197ef238a192d47edf191a9de78b657308937b4f7dd0aa53beae72c46"
    }
  ],
  "del": ["token-event-id-1"]
}
```

### Kind 7376: History Event (Regular)
Records transaction history for wallet operations.

```json
{
  "kind": 7376,
  "content": "<nip44_encrypted_json>",
  "tags": [
    ["e", "token-event-id", "", "created"]
  ]
}
```

**Encrypted content structure:**
```json
{
  "direction": "in",
  "amount": "1000",
  "e": [
    ["e", "token-event-id", "", "created"]
  ]
}
```

### Kind 5: Delete Event (NIP-09)
Used to delete spent token events.

```json
{
  "kind": 5,
  "content": "",
  "tags": [
    ["e", "token-event-id"],
    ["k", "7375"]
  ]
}
```

## State Management

The wallet maintains consistency through the following flow:

1. **Wallet Creation**: Publishes kind 17375 with encrypted mint list and P2PK key
2. **Token Receipt**: Creates kind 7375 with encrypted proofs and kind 7376 history
3. **Token Spending**:
   - Publishes kind 5 to delete spent tokens
   - Creates new kind 7375 with remaining proofs (if any)
   - Creates kind 7376 history event with transaction details

## Security Features

- **NIP-44 Encryption**: All sensitive content encrypted with user's keypair
- **Separate P2PK Keys**: Dedicated private key for nutzap receiving, isolated from Nostr identity
- **Event Permanence**: Wallet state preserved on Nostr relays
- **Cross-Device Sync**: Automatic synchronization across devices using same Nostr identity

## UI Implementation

The wallet card displays:
- Multiple mints per wallet
- Real-time balance calculation
- Transaction history
- Connection status per mint
- NIP-60 compliance indication
- **NIP-61 nutzap status and controls**
- **Pending nutzaps with claim functionality**
- **Nutzap statistics (sent/received)**

## Nutzap Workflow

### Receiving Nutzaps
1. User creates NIP-60 wallet (generates P2PK keypair)
2. User enables nutzaps (publishes kind 10019 event)
3. Others can send nutzaps using the published mint list and P2PK key
4. User sees pending nutzaps in wallet interface
5. User claims nutzaps to add tokens to their wallet

### Sending Nutzaps
1. User looks up recipient's kind 10019 event
2. Finds compatible mint between sender and recipient
3. Creates P2PK-locked proofs using recipient's public key
4. Publishes kind 9321 nutzap event
5. Recipient can claim the locked tokens

## Developer Notes

### Event Validation

All events undergo validation:
- Wallet events validate private key format and mint URLs
- Token events validate proof structure and mint association
- History events validate amount format and direction values

### Error Handling

The implementation handles:
- NIP-44 decryption failures (corrupted events)
- Network connectivity issues
- Mint server downtime
- Invalid proof states

### Performance Optimizations

- Batch event queries to minimize relay requests
- Client-side filtering of deleted token events
- Efficient balance calculation from current token state
- Connection pooling for mint communications

## Compliance Status

✅ **Fully Compliant with NIP-60 specification**
- Implements all required event kinds (17375, 7375, 7376)
- Uses proper NIP-44 encryption
- Supports P2PK private key management
- Handles event deletion for spent tokens
- Maintains proper transaction history

✅ **Fully Compliant with NIP-61 specification**
- Publishes nutzap info events (kind 10019)
- Sends nutzap events (kind 9321) with P2PK-locked proofs
- Validates recipient compatibility and mint support
- Handles nutzap claiming and redemption
- Maintains nutzap transaction history

## Future Enhancements

- **Quote Events (kind 7374)**: Optional quote tracking for pending mints
- **Multi-Mint Transactions**: Atomic transactions across multiple mints
- **Proof Validation**: Optional proof verification against mint servers
- **Advanced History**: Enhanced transaction categorization and filtering
- **Nutzap UI Enhancements**: Better nutzap management and statistics
- **Multi-Currency Support**: Support for different units beyond sats
