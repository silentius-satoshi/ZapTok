NIP-57
======

Lightning Zaps
--------------

`draft` `optional`

This NIP defines two new event kinds for facilitating Lightning payments between users. `9734` is a `zap request`, representing a payer's request to a recipient's lightning wallet for an invoice. `9735` is a `zap receipt`, representing the confirmation by the recipient's lightning wallet that the invoice issued for the `zap request` has been paid.

Having lightning receipts as nostr events allows clients to display lightning payments from a payer to a recipient as social activities. Clients can integrate this to show zap payments on posts, creating a social layer on top of lightning payments.

## Definitions

- **zap request**: A kind `9734` event that is a request for a lightning invoice
- **zap receipt**: A kind `9735` event that acts as proof that a lightning invoice was paid
- **lnurl**: A bech32-encoded HTTPS URL used for fetching lightning invoices from a lightning wallet
- **lnurl-pay**: A lightning wallet's `lnurl` endpoint for creating invoices for payments

## Protocol Flow

1. Client calculates a recipient's lnurl from their profile's `lud06` or `lud16` field
2. Client fetches the lnurl-pay endpoint to get payment parameters  
3. Client creates a `zap request` event (kind 9734) with payment details
4. Client sends the zap request to the lnurl-pay endpoint
5. Lightning wallet creates an invoice and optionally publishes a `zap receipt` (kind 9735)
6. Client pays the lightning invoice
7. Upon payment, the lightning wallet publishes the zap receipt to relays

## Zap Request (`kind:9734`)

A `zap request` is an event of kind `9734` that represents a request for a lightning invoice. It MUST have the following tags:

- `recipient` - A 32-byte hex-encoded public key of the intended recipient of the payment
- `amount` - Millisatoshis, stringified. This is the amount the sender intends to pay
- `relays` - JSON stringified array of relay URIs where the zap receipt SHOULD be published to

A `zap request` MAY have the following tags:

- `e` - An event ID hex string referencing an event which the payment is being made for
- `p` - A 32-byte hex-encoded public key referencing a participant in the event being zapped
- `a` - An event coordinate string referencing a replaceable event being zapped

```json
{
  "kind": 9734,
  "content": "Zap!",
  "tags": [
    ["recipient", "be17722f2d4b25edddf3ee97a0d512fd29a3bdc692ab10ccd5c87a5b9316507"],
    ["amount", "21000"],
    ["relays", "[\"wss://relay1.com\", \"wss://relay2.com\"]"]
  ],
  "created_at": 1674164539,
  // ...other fields
}
```

## Zap Receipt (`kind:9735`)

A `zap receipt` is an event of kind `9735` that acts as a proof that a lightning invoice was paid. It MUST have the following tags:

- `bolt11` - The bolt11 invoice that was paid, as a string
- `description` - The description from the bolt11 invoice
- `recipient` - A 32-byte hex-encoded public key of the recipient
- `amount` - Millisatoshis, stringified. This SHOULD equal the amount from the bolt11 invoice

A `zap receipt` MAY have the following tags:

- `e` - An event ID hex string of the event that was zapped
- `p` - A 32-byte hex-encoded public key of a participant in the event that was zapped
- `a` - An event coordinate string of a replaceable event that was zapped
- `P` - The zap request that this receipt is responding to

```json
{
  "kind": 9735,
  "content": "",
  "tags": [
    ["bolt11", "lnbc210m1...invoice..."],
    ["description", "{\"kind\":9734,\"content\":\"Zap!\",\"tags\":[[\"recipient\",\"be17722f2d4b25edddf3ee97a0d512fd29a3bdc692ab10ccd5c87a5b9316507\"],[\"amount\",\"21000\"],[\"relays\",\"[\\\"wss://relay1.com\\\", \\\"wss://relay2.com\\\"]\"]],\"created_at\":1674164539}"],
    ["recipient", "be17722f2d4b25edddf3ee97a0d512fd29a3bdc692ab10ccd5c87a5b9316507"],
    ["amount", "21000"]
  ],
  "created_at": 1674164548,
  // ...other fields
}
```

## Client Implementation

### Sending Zaps

1. **Get recipient's lnurl**: Extract from `lud06` (bech32 lnurl) or `lud16` (email-style) in their kind 0 profile
2. **Fetch payment info**: GET the lnurl endpoint to get `callback`, `minSendable`, `maxSendable`, etc.
3. **Create zap request**: Build kind 9734 event with recipient, amount, relays
4. **Request invoice**: POST zap request to the callback URL with amount and other params
5. **Pay invoice**: Use lightning wallet to pay the returned bolt11 invoice
6. **Wait for receipt**: Listen for kind 9735 zap receipt events on specified relays

### Displaying Zaps

1. **Query receipts**: Subscribe to kind 9735 events filtering by `e`, `p`, or `a` tags
2. **Validate receipts**: Verify bolt11 payment proof and amounts
3. **Aggregate totals**: Sum amounts by recipient/event for display
4. **Show zap activity**: Display zaps as social proof on posts/profiles

### Profile Configuration

Users can configure zapping by adding to their kind 0 profile:

```json
{
  "kind": 0,
  "content": "{\"lud16\":\"user@getalby.com\",\"lud06\":\"lnurl1....\"}",
  // ...other fields
}
```

## Lightning Address Integration

### LNURL-Pay Flow

1. **Resolve address**: `user@domain.com` → `https://domain.com/.well-known/lnurlp/user`
2. **Get parameters**:
   ```json
   {
     "callback": "https://domain.com/lnurlp/user/callback",
     "minSendable": 1000,
     "maxSendable": 100000000,
     "metadata": "[[\"text/plain\",\"Zap to user\"]]",
     "allowsNostr": true,
     "nostrPubkey": "be17722f2d4b25edddf3ee97a0d512fd29a3bdc692ab10ccd5c87a5b9316507"
   }
   ```
3. **Send zap request**: POST to callback with amount and nostr event
4. **Get invoice**: Receive bolt11 invoice in response
5. **Pay and confirm**: Pay invoice and wait for zap receipt

## Security Considerations

### Zap Request Validation
- Verify event signature before processing
- Check amount limits against lnurl-pay parameters  
- Validate recipient pubkey format
- Ensure reasonable timestamp ranges

### Zap Receipt Validation
- Verify bolt11 invoice matches claimed payment
- Check that description contains valid zap request
- Validate payment amounts match request
- Confirm recipient matches request

### Privacy Considerations
- Zap requests and receipts are public events
- Payment amounts are visible on the network
- Consider using private channels for sensitive payments
- Clients may allow anonymous zapping options

## Advanced Features

### Zap Splits
Send zaps to multiple recipients:

```json
{
  "kind": 9734,
  "tags": [
    ["recipient", "pubkey1"],
    ["recipient", "pubkey2", "0.6"],
    ["recipient", "pubkey3", "0.4"],
    ["amount", "100000"]
  ]
}
```

### Zap Goals
Set funding targets for projects or causes:

```json
{
  "kind": 9041,
  "content": "Funding goal for new relay server",
  "tags": [
    ["amount", "1000000"],
    ["closed_at", "1640995200"]
  ]
}
```

### Anonymous Zaps
Use intermediate services to break payment linkability:

```json
{
  "kind": 9734,
  "tags": [
    ["anon", ""],
    ["recipient", "..."],
    ["amount", "21000"]
  ]
}
```

## Economic Model

### Fee Structure
- **Lightning fees**: Network routing fees (typically <1%)
- **Service fees**: LNURL provider fees (variable)
- **Platform fees**: Client/relay fees (optional)

### Incentive Alignment
- **Content creators**: Monetize posts through zaps
- **LNURL providers**: Earn fees from payment processing
- **Relay operators**: Potential zap-based revenue models
- **Client developers**: Value-add through zap features

## Implementation Examples

### React Hook for Zapping
```typescript
function useZap() {
  const sendZap = async (
    recipient: string,
    amount: number,
    eventId?: string
  ) => {
    // 1. Get recipient's LNURL
    const profile = await getProfile(recipient);
    const lnurl = profile.lud16 || profile.lud06;
    
    // 2. Create zap request
    const zapRequest = {
      kind: 9734,
      tags: [
        ['recipient', recipient],
        ['amount', amount.toString()],
        ['relays', JSON.stringify(['wss://relay.damus.io'])],
        ...(eventId ? [['e', eventId]] : [])
      ],
      content: 'Zap!',
      created_at: Math.floor(Date.now() / 1000)
    };
    
    // 3. Request invoice
    const invoice = await requestInvoice(lnurl, zapRequest, amount);
    
    // 4. Pay invoice
    await payInvoice(invoice.pr);
    
    // 5. Listen for receipt
    return waitForZapReceipt(zapRequest);
  };
  
  return { sendZap };
}
```

### Zap Validation
```typescript
function validateZapReceipt(receipt: NostrEvent): boolean {
  if (receipt.kind !== 9735) return false;
  
  const bolt11Tag = receipt.tags.find(([name]) => name === 'bolt11');
  const amountTag = receipt.tags.find(([name]) => name === 'amount');
  const recipientTag = receipt.tags.find(([name]) => name === 'recipient');
  
  if (!bolt11Tag || !amountTag || !recipientTag) return false;
  
  // Validate bolt11 invoice
  const invoice = decodeBolt11(bolt11Tag[1]);
  if (!invoice || invoice.amount !== parseInt(amountTag[1])) return false;
  
  // Validate description contains valid zap request
  const description = invoice.tags.find(tag => tag.tagName === 'description');
  if (description) {
    try {
      const zapRequest = JSON.parse(description.data);
      return validateZapRequest(zapRequest);
    } catch {
      return false;
    }
  }
  
  return true;
}
```

## Related NIPs

- **NIP-01**: Basic event structure and validation
- **NIP-05**: DNS verification for lightning addresses
- **NIP-47**: Nostr Wallet Connect (alternative payment method)
- **NIP-75**: Zap Goals (funding targets)

## Status

**Implementation Status in ZapTok**: ✅ Fully Implemented

**Details**:
- ✅ Zap request creation (kind 9734)
- ✅ Zap receipt handling (kind 9735)  
- ✅ LNURL-pay integration
- ✅ Lightning address support (lud16)
- ✅ Zap display and aggregation
- ✅ Profile-based zap configuration
- ✅ Video zapping functionality
- ❌ Advanced features (splits, goals, anonymous)
- ❌ Zap receipt validation
- ❌ Payment verification
