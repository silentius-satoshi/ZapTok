NIP-03
======

OpenTimestamps Attestations for Events
--------------------------------------

`draft` `optional`

This NIP defines an event with `kind:1040` that can contain an [OpenTimestamps](https://opentimestamps.org/) proof for any other event:

```json
{
  "kind": 1040
  "tags": [
    ["e", <event-id>, <relay-url>],
    ["alt", "opentimestamps attestation"]
  ],
  "content": <base64-encoded OTS file data>
}
```

- The OpenTimestamps proof MUST prove the referenced `e` event id as its digest.
- The `content` MUST be the full content of an `.ots` file containing at least one Bitcoin attestation. This file SHOULD contain a **single** Bitcoin attestation (as not more than one valid attestation is necessary and less bytes is better than more) and no reference to "pending" attestations since they are useless in this context.

### Example OpenTimestamps proof verification flow

Using [`nak`](https://github.com/fiatjaf/nak), [`jq`](https://jqlang.github.io/jq/) and [`ots`](https://github.com/fiatjaf/ots):

```bash
~> nak req -i e71c6ea722987debdb60f81f9ea4f604b5ac0664120dd64fb9d23abc4ec7c323 wss://nostr-pub.wellorder.net | jq -r .content | ots verify
> using an esplora server at https://blockstream.info/api
- sequence ending on block 810391 is valid
timestamp validated at block [810391]
```

## Implementation Requirements

### For Clients (Readers)

1. **Display Attestations**: Show when events have OpenTimestamps proofs
2. **Verify Proofs**: Decode base64 content and verify against Bitcoin blockchain
3. **Trust Indicators**: Display verification status and timestamp information

### For Clients (Publishers)

1. **Create Attestations**: Generate kind 1040 events with .ots proofs
2. **Batch Processing**: Efficiently handle multiple event attestations  
3. **Base64 Encoding**: Properly encode .ots file data in content field

## Technical Details

### Content Format
- **Type**: Base64-encoded binary data
- **Source**: Complete .ots file from OpenTimestamps
- **Requirements**: Must contain at least one Bitcoin attestation
- **Optimization**: Should contain only one Bitcoin attestation (no pending)

### Event Structure
- **Kind**: 1040 (fixed)
- **Tags**: 
  - `e` tag: References the attested event ID and optional relay
  - `alt` tag: Human-readable description for clients
- **Content**: Base64 .ots file data

### Verification Process
1. Decode base64 content to get .ots file
2. Extract Bitcoin attestation(s) from .ots
3. Verify proof against Bitcoin blockchain
4. Confirm digest matches referenced event ID
5. Display verification result and timestamp

## Security Considerations

### Trust Model
- **Blockchain Verification**: Proofs are verified against Bitcoin blockchain
- **No Central Authority**: OpenTimestamps is decentralized
- **Tamper Evidence**: Any modification invalidates the proof

### Limitations
- **Bitcoin Only**: Currently limited to Bitcoin blockchain attestations
- **Storage Overhead**: .ots files add size to events
- **Verification Complexity**: Requires OpenTimestamps library integration

## Use Cases

### Content Authentication
- **News Articles**: Prove publication timestamps for journalism
- **Legal Documents**: Establish document creation time
- **Academic Papers**: Timestamp research publication

### Social Media
- **Original Content**: Prove when content was first published
- **Attribution**: Establish authorship timestamps
- **Fact Checking**: Verify timing claims in posts

## Example Implementation

```typescript
// Verify OpenTimestamps attestation
async function verifyAttestation(event: NostrEvent): Promise<boolean> {
  if (event.kind !== 1040) return false;
  
  // Get referenced event ID
  const eTag = event.tags.find(([name]) => name === 'e');
  if (!eTag) return false;
  const referencedEventId = eTag[1];
  
  // Decode OTS data
  const otsData = Buffer.from(event.content, 'base64');
  
  // Verify with OpenTimestamps (pseudo-code)
  const verification = await ots.verify(otsData, referencedEventId);
  
  return verification.valid;
}

// Create OpenTimestamps attestation
async function createAttestation(eventId: string): Promise<NostrEvent> {
  // Generate OTS proof (pseudo-code)
  const otsFile = await ots.stamp(eventId);
  const base64Content = Buffer.from(otsFile).toString('base64');
  
  return {
    kind: 1040,
    tags: [
      ['e', eventId],
      ['alt', 'opentimestamps attestation']
    ],
    content: base64Content,
    created_at: Math.floor(Date.now() / 1000),
    // ... other required fields
  };
}
```

## Related NIPs

- **NIP-01**: Basic event structure and validation
- **NIP-16**: Event Treatment (how clients handle unknown kinds)
- **NIP-25**: Reactions (alternative timestamping for social proof)

## References

- **OpenTimestamps**: https://opentimestamps.org/
- **OTS GitHub**: https://github.com/opentimestamps/opentimestamps-client
- **Bitcoin Integration**: Uses Bitcoin blockchain for immutable timestamps
- **Verification Tools**: `ots` command-line tool for verification

## Status

**Implementation Status in ZapTok**: ❌ Not Implemented

**Priority**: Low (specialized use case)
**Complexity**: Medium (requires OpenTimestamps integration)
**Dependencies**: OpenTimestamps library, Bitcoin blockchain access
