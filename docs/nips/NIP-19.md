NIP-19
======

bech32-encoded entities
-----------------------

`final` `mandatory`

This NIP standardizes bech32 formatting for keys and other entities. These formats are designed to be used in clients, not in the core protocol. The core protocol uses 32-byte hex keys and 64-byte hex signatures.

## Encoding

The following bech32 prefixes are used:

- `npub`: Nostr public key
- `nsec`: Nostr private key  
- `note`: Nostr note (event id)
- `nprofile`: Nostr profile
- `nevent`: Nostr event
- `naddr`: Nostr parameterized replaceable event coordinate
- `nrelay`: Nostr relay (deprecated)

## Basic Entities

### Public Key (`npub`)
A user's 32-byte public key, encoded as bech32 with prefix `npub`.

Example: `npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg`

### Private Key (`nsec`)  
A user's 32-byte private key, encoded as bech32 with prefix `nsec`.

Example: `nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5`

**Security Warning**: Private keys should never be shared or displayed in clients except during backup/import procedures.

### Note ID (`note`)
An event's 32-byte ID, encoded as bech32 with prefix `note`.

Example: `note1fntxtkcy9pjwucqwa9mddn7v03wwwsu9j330jj350nvhpky2tuqsx6np67`

## Complex Entities

### Profile (`nprofile`)
Contains a public key plus additional metadata:

```
TLV format:
- 0: 32-byte pubkey (required)
- 1: relay URL (optional, multiple allowed)
```

Example: `nprofile1qqsrxys2q0h7r0skvjmrdwznkfjl3x6z73c0rdwc5wfcdhxgf7n8k82tnvdkqhf`

### Event (`nevent`)
Contains an event ID plus additional metadata:

```  
TLV format:
- 0: 32-byte event id (required)
- 1: relay URL (optional, multiple allowed)
- 2: 32-byte author pubkey (optional)
- 3: kind number (optional)
```

Example: `nevent1qqs2z8c8rmpffqkmc3p6rfz93qs3gyk2x4mcdvurvepf00k3h89vugxwqqr0u9`

### Address (`naddr`)
Contains a parameterized replaceable event coordinate:

```
TLV format:  
- 0: identifier string (the `d` tag value) (required)
- 1: relay URL (optional, multiple allowed)
- 2: author pubkey (required)
- 3: kind number (required)
```

Example: `naddr1qq8q8gw5gdx0c2z8q0qqhzgxyz8q6z4xr`

## Implementation Guide

### Encoding Process
1. **Prepare data**: Convert strings to UTF-8 bytes, numbers to big-endian bytes
2. **Create TLV structure**: Type-Length-Value format for complex entities
3. **Apply bech32 encoding**: Use standard bech32 library with appropriate prefix
4. **Validate result**: Ensure proper format and checksums

### Decoding Process  
1. **Validate format**: Check prefix and bech32 checksum
2. **Decode bech32**: Extract raw bytes from bech32 encoding
3. **Parse TLV**: For complex entities, parse Type-Length-Value structure
4. **Extract fields**: Return structured data with all available fields

### TLV Structure
For complex entities (`nprofile`, `nevent`, `naddr`):

```
Type (1 byte) | Length (1 byte) | Value (Length bytes)
```

Example TLV for `nprofile` with pubkey and relay:
```
00 20 <32-byte pubkey>
01 0D <13-byte relay URL>
```

## Usage Examples

### Client Display
```typescript
// Display user reference
function displayUserRef(npub: string): string {
  const decoded = nip19.decode(npub);
  if (decoded.type === 'npub') {
    return `@${getDisplayName(decoded.data)}`;
  }
  return npub;
}

// Create shareable note link  
function createNoteLink(eventId: string, relays: string[]): string {
  return nip19.encode('nevent', {
    id: eventId,
    relays: relays.slice(0, 3), // Limit to 3 relays
  });
}
```

### URL Routing
```typescript
// Route handler for Nostr entities
function handleNostrRoute(entity: string) {
  const decoded = nip19.decode(entity);
  
  switch (decoded.type) {
    case 'npub':
    case 'nprofile':
      return openProfile(decoded.data);
    case 'note':
    case 'nevent':  
      return openNote(decoded.data);
    case 'naddr':
      return openArticle(decoded.data);
  }
}
```

### QR Code Generation
```typescript
// Generate QR code for profile sharing
function generateProfileQR(pubkey: string, relays: string[]): string {
  const nprofile = nip19.encode('nprofile', {
    pubkey,
    relays
  });
  return generateQR(`nostr:${nprofile}`);
}
```

## Security Considerations

### Private Key Handling
- **Never log** nsec entities in client applications
- **Secure storage** when temporarily holding nsec data
- **Clear memory** after processing private keys
- **User warnings** before displaying private keys

### Data Validation
- **Verify checksums** during decoding process
- **Validate lengths** for all decoded components
- **Sanitize inputs** before processing TLV data
- **Handle errors** gracefully for malformed entities

### Relay Privacy
- **Minimize relay exposure** in shared entities
- **User control** over which relays are included
- **Consider privacy** implications of relay metadata
- **Rotate relays** in shared links when possible

## Error Handling

### Common Errors
- **Invalid checksum**: Bech32 validation failure
- **Wrong prefix**: Entity type mismatch
- **Invalid length**: Incorrect byte lengths for fields
- **Malformed TLV**: Invalid Type-Length-Value structure

### Error Response
```typescript
interface DecodeError {
  type: 'InvalidChecksum' | 'WrongPrefix' | 'InvalidLength' | 'MalformedTLV';
  message: string;
  input: string;
}

function safeDecodeNip19(entity: string): DecodeResult | DecodeError {
  try {
    return { success: true, data: nip19.decode(entity) };
  } catch (error) {
    return {
      success: false,
      error: {
        type: classifyError(error),
        message: error.message,
        input: entity
      }
    };
  }
}
```

## Migration and Compatibility

### From Hex Encoding
```typescript
// Convert hex pubkey to npub
function hexToNpub(hex: string): string {
  return nip19.encode('npub', hex);
}

// Convert hex event ID to note
function hexToNote(hex: string): string {
  return nip19.encode('note', hex);
}
```

### Version Compatibility
- **Backward compatibility**: Always support older formats
- **Graceful degradation**: Handle unsupported entity types
- **Format detection**: Auto-detect hex vs bech32 inputs
- **User education**: Guide users on new formats

## Client Integration

### Input Parsing
```typescript
// Parse various input formats
function parseNostrEntity(input: string): ParsedEntity {
  // Check for bech32 format
  if (input.startsWith('npub') || input.startsWith('note') || 
      input.startsWith('nprofile') || input.startsWith('nevent') || 
      input.startsWith('naddr')) {
    return { type: 'bech32', data: nip19.decode(input) };
  }
  
  // Check for hex format  
  if (/^[0-9a-f]{64}$/i.test(input)) {
    return { type: 'hex', data: input };
  }
  
  throw new Error('Invalid Nostr entity format');
}
```

### Copy/Paste Support
- **Detect format** automatically in paste handlers
- **Convert formats** as needed for display
- **Preserve metadata** when copying complex entities  
- **User preferences** for default copy format

## Best Practices

### For Client Developers
1. **Always use bech32** for user-facing entity display
2. **Include relay hints** in complex entities when available  
3. **Implement robust parsing** with proper error handling
4. **Provide format conversion** utilities for users
5. **Test edge cases** thoroughly with various inputs

### For Users
1. **Share bech32 entities** instead of hex when possible
2. **Include relay information** for better discoverability
3. **Verify entities** before sharing or using
4. **Keep private keys secure** and never share nsec entities

## Related NIPs

- **NIP-01**: Basic event and key formats (hex encoding)
- **NIP-05**: DNS verification (complements profile sharing)
- **NIP-21**: nostr: URI scheme (builds on these entities)
- **NIP-65**: Relay list metadata (provides relay hints)

## Status

**Implementation Status in ZapTok**: ✅ Fully Implemented

**Details**:
- ✅ All entity types supported (npub, nsec, note, nprofile, nevent, naddr)
- ✅ Encoding and decoding functions
- ✅ TLV parsing for complex entities
- ✅ URL routing with bech32 entities
- ✅ QR code integration
- ✅ Input format detection and conversion
- ✅ Error handling and validation
- ✅ User interface integration throughout app
