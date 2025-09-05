# BOLT12 NUT-25 Support Implementation Plan

**Status:** Future Implementation
**Priority:** High - Next-generation Lightning payments
**Dependencies:** @cashu/cashu-ts NUT-25 support, Production mint availability
**Created:** September 4, 2025
**Target Implementation:** TBD based on ecosystem readiness

## Executive Summary

This document outlines the comprehensive implementation plan for adding BOLT12 payment support (NUT-25) to ZapTok's nutzap ecosystem. BOLT12 represents the next evolution of Lightning Network payments, offering reusable payment codes, flexible amounts, enhanced privacy, and improved user experience.

## Table of Contents

1. [Background & Context](#background--context)
2. [Technical Specifications](#technical-specifications)
3. [Implementation Architecture](#implementation-architecture)
4. [Integration Strategy](#integration-strategy)
5. [User Experience Design](#user-experience-design)
6. [Testing & Validation](#testing--validation)
7. [Migration & Compatibility](#migration--compatibility)
8. [Timeline & Milestones](#timeline--milestones)

## Background & Context

### Current State (BOLT11 - NUT-23)
- ✅ **Production Ready**: Full BOLT11 support via @cashu/cashu-ts
- ✅ **Mature Ecosystem**: 3 verified P2PK-ready mints with BOLT11 support
- ✅ **Proven UX**: Single-use invoices with fixed amounts
- ❌ **Limitations**: Invoice generation overhead, fixed amounts, limited reusability

### BOLT12 Advantages (NUT-25)
- 🎯 **Reusable Offers**: One payment code for multiple transactions
- 💰 **Flexible Amounts**: Sender-selected amounts within receiver limits
- 🔒 **Enhanced Privacy**: Reduced payment correlation and metadata leakage
- ⚡ **Improved UX**: No invoice generation roundtrips
- 🌐 **Future-Proof**: Aligned with Lightning Network evolution

### Nutzap-Specific Benefits
- **Simplified Zap Receiving**: Users publish one reusable zap address
- **Dynamic Zap Amounts**: Community-driven amount selection
- **Batch Zapping**: Multiple zaps without coordination overhead
- **Richer Metadata**: Enhanced zap context and descriptions

## Technical Specifications

### NUT-25 Protocol Overview

```typescript
// BOLT12 Offer Structure
interface Bolt12Offer {
  offer_id: string;           // Unique offer identifier
  description: string;        // Human-readable description
  issuer: string;            // Issuer public key
  amount_msat?: number;      // Fixed amount (optional)
  amount_range?: {           // Amount range (alternative to fixed)
    min_msat: number;
    max_msat: number;
  };
  currency?: string;         // Currency code (default: BTC)
  features?: number;         // Feature flags
  chains?: string[];         // Supported blockchain networks
  quantity_max?: number;     // Maximum quantity
  recurring?: {              // Recurring payment info
    time_unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
    period: number;
    basetime?: number;
    start_any_period?: boolean;
    limit?: number;
  };
  signature: string;         // Cryptographic signature
}

// BOLT12 Invoice Request
interface Bolt12InvoiceRequest {
  offer_id: string;          // Reference to the offer
  amount_msat?: number;      // Requested amount (if flexible)
  quantity?: number;         // Requested quantity
  payer_key: string;         // Payer's public key
  payer_info?: string;       // Optional payer information
  signature: string;         // Request signature
}

// BOLT12 Invoice Response
interface Bolt12Invoice {
  payment_hash: string;      // Payment hash
  amount_msat: number;       // Final amount
  description: string;       // Payment description
  expiry: number;           // Expiration timestamp
  min_final_cltv_expiry: number;
  features?: number;
  fallbacks?: string[];     // Fallback addresses
  signature: string;        // Invoice signature
}
```

### Cashu Integration Points

```typescript
// Enhanced Mint Quote for BOLT12
interface Bolt12MintQuote extends MintQuoteResponse {
  quote: string;            // Quote identifier
  request: string;          // BOLT12 invoice request
  state: QuoteState;        // Quote state
  expiry: number;          // Quote expiration
  amount: number;          // Amount in sats
  fee_reserve: number;     // Fee reserve
  payment_method: 'bolt12'; // Payment method identifier
  bolt12_offer?: string;   // Associated offer
}

// Enhanced Melt Quote for BOLT12
interface Bolt12MeltQuote extends MeltQuoteResponse {
  quote: string;           // Quote identifier
  amount: number;          // Amount in sats
  fee_reserve: number;     // Fee reserve
  state: QuoteState;       // Quote state
  expiry: number;         // Quote expiration
  payment_method: 'bolt12'; // Payment method identifier
  bolt12_invoice: string;  // BOLT12 invoice to pay
}
```

## Implementation Architecture

### Core Components

#### 1. BOLT12 Offer Management
```typescript
// src/lib/bolt12-offers.ts
export class Bolt12OfferManager {
  /**
   * Create a new BOLT12 offer for receiving nutzaps
   */
  async createOffer(params: {
    description: string;
    amountRange?: { min: number; max: number };
    recurring?: RecurringConfig;
  }): Promise<Bolt12Offer>;

  /**
   * Parse and validate BOLT12 offer
   */
  parseOffer(offerString: string): Bolt12Offer;

  /**
   * Check if offer is valid and active
   */
  validateOffer(offer: Bolt12Offer): boolean;

  /**
   * Generate invoice request from offer
   */
  createInvoiceRequest(
    offer: Bolt12Offer,
    amount: number,
    payerKey: string
  ): Promise<Bolt12InvoiceRequest>;
}
```

#### 2. Enhanced Mint Integration
```typescript
// src/lib/bolt12-mint-client.ts
export class Bolt12MintClient extends CashuClient {
  /**
   * Request BOLT12 mint quote
   */
  async requestBolt12MintQuote(
    amount: number,
    unit = 'sat'
  ): Promise<Bolt12MintQuote>;

  /**
   * Request BOLT12 melt quote
   */
  async requestBolt12MeltQuote(
    bolt12Invoice: string,
    unit = 'sat'
  ): Promise<Bolt12MeltQuote>;

  /**
   * Check BOLT12 quote status
   */
  async checkBolt12Quote(
    quoteId: string,
    type: 'mint' | 'melt'
  ): Promise<Bolt12MintQuote | Bolt12MeltQuote>;
}
```

#### 3. Nutzap Integration
```typescript
// src/hooks/useBolt12Nutzaps.ts
export function useBolt12Nutzaps() {
  /**
   * Send BOLT12 nutzap using reusable offer
   */
  const sendBolt12Nutzap = async (params: {
    recipientOffer: string;
    amount: number;
    eventId: string;
    comment?: string;
  }) => {
    // Implementation
  };

  /**
   * Create BOLT12 offer for receiving nutzaps
   */
  const createReceivingOffer = async (params: {
    description: string;
    minAmount?: number;
    maxAmount?: number;
  }) => {
    // Implementation
  };

  return {
    sendBolt12Nutzap,
    createReceivingOffer,
    // ... other methods
  };
}
```

### Payment Method Selection

```typescript
// src/lib/payment-method-selector.ts
export interface PaymentMethodCapabilities {
  bolt11: boolean;
  bolt12: boolean;
  p2pk: boolean;
}

export async function selectOptimalPaymentMethod(
  recipient: NostrEvent,
  mintCapabilities: PaymentMethodCapabilities,
  userPreferences: UserPreferences
): Promise<'bolt11' | 'bolt12'> {
  // Priority logic:
  // 1. User preference
  // 2. Recipient capabilities
  // 3. Mint support
  // 4. Fallback to BOLT11
}
```

## Integration Strategy

### Phase 1: Foundation
**Dependencies:** @cashu/cashu-ts NUT-25 support

**Deliverables:**
- [ ] BOLT12 offer parsing and validation utilities
- [ ] Enhanced mint compatibility testing for NUT-25
- [ ] Basic BOLT12 mint quote operations
- [ ] Payment method detection and selection logic

**Implementation Tasks:**
```typescript
// Enhanced mint compatibility testing
interface EnhancedMintCapabilities {
  bolt11Support: boolean;    // NUT-23
  bolt12Support: boolean;    // NUT-25 (NEW)
  p2pkSupport: boolean;      // NUT-11
  supportedFeatures: string[];
  securityRating: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Update existing mint testing infrastructure
async function testMintCapabilities(mintUrl: string): Promise<EnhancedMintCapabilities> {
  const mintInfo = await getMintInfo(mintUrl);

  return {
    bolt11Support: mintInfo.nuts?.[23]?.supported || false,
    bolt12Support: mintInfo.nuts?.[25]?.supported || false, // NEW
    p2pkSupport: mintInfo.nuts?.[11]?.supported || false,
    supportedFeatures: mintInfo.nuts?.[25]?.methods || [],
    securityRating: assessSecurityRating(mintInfo)
  };
}
```

### Phase 2: Core Implementation
**Dependencies:** Production BOLT12 mint availability

**Deliverables:**
- [ ] BOLT12 offer creation and management
- [ ] BOLT12 nutzap sending functionality
- [ ] Enhanced NIP-57 zap info with BOLT12 offers
- [ ] Automatic fallback to BOLT11 when needed

**Key Components:**
```typescript
// Enhanced NIP-57 integration
interface EnhancedZapInfo {
  bolt11Callback: string;     // Traditional callback
  bolt12Offer?: string;       // NEW: Reusable offer
  allowsNostr: boolean;
  nostrPubkey: string;
  paymentMethods: ('bolt11' | 'bolt12')[];
  amountLimits?: {
    min: number;
    max: number;
  };
}

// BOLT12 nutzap creation
async function createBolt12Nutzap(params: {
  recipientOffer: string;
  amount: number;
  recipientPubkey: string;
  eventId: string;
  relays: string[];
  comment?: string;
}) {
  // 1. Parse and validate offer
  // 2. Create invoice request
  // 3. Generate P2PK-locked ecash
  // 4. Create NIP-61 nutzap event
  // 5. Publish to relays
}
```

### Phase 3: Enhanced UX
**Dependencies:** Core implementation completion

**Deliverables:**
- [ ] BOLT12 offer QR codes and sharing
- [ ] Payment method preferences UI
- [ ] Batch zapping with BOLT12 offers
- [ ] Enhanced zap amount selection UX

### Phase 4: Production Optimization
**Dependencies:** User feedback and testing

**Deliverables:**
- [ ] Performance optimizations
- [ ] Advanced error handling and recovery
- [ ] Analytics and monitoring integration
- [ ] Documentation and migration guides

## User Experience Design

### Receiving Nutzaps with BOLT12

**Current BOLT11 Flow:**
1. User wants to receive zaps
2. Others must request invoices for each zap
3. Amount must be specified upfront
4. New invoice needed for each payment

**Enhanced BOLT12 Flow:**
1. User creates one reusable zap offer
2. Publishes offer in NIP-57 zap info
3. Others can zap directly with chosen amounts
4. No invoice generation coordination needed

**UI Components:**

```typescript
// BOLT12 Offer Creation Interface
interface Bolt12OfferCreationProps {
  onOfferCreated: (offer: string) => void;
  defaultDescription?: string;
  allowAmountRange?: boolean;
}

function Bolt12OfferCreation({ onOfferCreated, defaultDescription, allowAmountRange }: Bolt12OfferCreationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Reusable Zap Address</CardTitle>
        <CardDescription>
          Generate a BOLT12 offer that others can use to zap you with flexible amounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Description</Label>
            <Input
              placeholder="Zaps for my content"
              defaultValue={defaultDescription}
            />
          </div>

          {allowAmountRange && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Amount (sats)</Label>
                <Input type="number" placeholder="100" />
              </div>
              <div>
                <Label>Max Amount (sats)</Label>
                <Input type="number" placeholder="10000" />
              </div>
            </div>
          )}

          <Button onClick={handleCreateOffer}>
            Create Zap Address
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Sending Nutzaps with BOLT12

**Enhanced Zap Interface:**
```typescript
function EnhancedZapInterface({ recipient, post }: { recipient: NostrEvent; post: NostrEvent }) {
  const [paymentMethod, setPaymentMethod] = useState<'bolt11' | 'bolt12' | 'auto'>('auto');
  const [zapAmount, setZapAmount] = useState<number>(1000);

  const recipientCapabilities = useRecipientCapabilities(recipient);
  const mintCapabilities = useMintCapabilities();

  const optimalMethod = useMemo(() =>
    selectOptimalPaymentMethod(recipient, mintCapabilities, { preferred: paymentMethod }),
    [recipient, mintCapabilities, paymentMethod]
  );

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Zap</DialogTitle>
          <DialogDescription>
            Zapping with {optimalMethod === 'bolt12' ? 'BOLT12 (instant)' : 'BOLT11 (traditional)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Method Selection */}
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Recommended)</SelectItem>
                <SelectItem value="bolt12" disabled={!recipientCapabilities.bolt12}>
                  BOLT12 {recipientCapabilities.bolt12 ? '(Available)' : '(Not Supported)'}
                </SelectItem>
                <SelectItem value="bolt11">BOLT11 (Compatible)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Selection */}
          <div>
            <Label>Amount (sats)</Label>
            {optimalMethod === 'bolt12' && recipientCapabilities.amountRange ? (
              <Slider
                value={[zapAmount]}
                onValueChange={([value]) => setZapAmount(value)}
                min={recipientCapabilities.amountRange.min}
                max={recipientCapabilities.amountRange.max}
                step={100}
              />
            ) : (
              <Input
                type="number"
                value={zapAmount}
                onChange={(e) => setZapAmount(Number(e.target.value))}
              />
            )}
          </div>

          {/* Benefits Display */}
          {optimalMethod === 'bolt12' && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertTitle>BOLT12 Benefits</AlertTitle>
              <AlertDescription>
                Instant zapping with no invoice generation wait time
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSendZap}>
            Send {zapAmount} sat Zap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Testing & Validation

### Unit Testing
```typescript
// src/test/bolt12-compliance.test.ts
describe('BOLT12 NUT-25 Compliance', () => {
  test('should parse valid BOLT12 offers', () => {
    const offerString = 'lno1...';
    const offer = parseBolt12Offer(offerString);
    expect(offer).toMatchObject({
      offer_id: expect.any(String),
      description: expect.any(String),
      signature: expect.any(String)
    });
  });

  test('should validate BOLT12 invoice requests', () => {
    const request = createBolt12InvoiceRequest(validOffer, 1000, payerKey);
    expect(validateBolt12InvoiceRequest(request)).toBe(true);
  });

  test('should handle BOLT12 mint quote operations', async () => {
    const quote = await bolt12Client.requestMintQuote(1000);
    expect(quote.payment_method).toBe('bolt12');
    expect(quote.amount).toBe(1000);
  });
});

// src/test/bolt12-integration.test.ts
describe('BOLT12 Integration Tests', () => {
  test('should create and use BOLT12 nutzaps end-to-end', async () => {
    // 1. Create recipient offer
    const offer = await createBolt12Offer({
      description: 'Test zaps',
      amountRange: { min: 100, max: 10000 }
    });

    // 2. Send nutzap using offer
    const nutzap = await sendBolt12Nutzap({
      recipientOffer: offer,
      amount: 1000,
      eventId: 'test-event',
    });

    // 3. Verify nutzap structure
    expect(nutzap.kind).toBe(9321);
    expect(nutzap.tags).toContainEqual(['bolt12_offer', offer]);
  });
});
```

### Integration Testing
```typescript
// src/test/bolt12-mint-compatibility.test.ts
describe('BOLT12 Mint Compatibility', () => {
  const testMints = [
    'https://mint.minibits.cash/Bitcoin',
    'https://mint.coinos.io',
    'https://testnut.cashu.space'
  ];

  test.each(testMints)('should test BOLT12 support for %s', async (mintUrl) => {
    const capabilities = await testMintCapabilities(mintUrl);

    if (capabilities.bolt12Support) {
      const quote = await createBolt12MintQuote(mintUrl, 1000);
      expect(quote.payment_method).toBe('bolt12');

      // Test offer handling
      const offer = await getMintBolt12Offer(mintUrl);
      expect(offer).toBeTruthy();
    } else {
      console.log(`${mintUrl} does not support BOLT12 yet`);
    }
  });
});
```

### User Acceptance Testing
- [ ] BOLT12 offer creation and sharing flows
- [ ] Payment method selection and automatic fallback
- [ ] Cross-client compatibility (receiving BOLT12 zaps from other clients)
- [ ] Performance comparison (BOLT12 vs BOLT11 zap times)
- [ ] Error handling and recovery scenarios

## Migration & Compatibility

### Backward Compatibility Strategy

**Dual Support Approach:**
```typescript
// Seamless integration with existing BOLT11 infrastructure
interface UnifiedPaymentMethod {
  type: 'bolt11' | 'bolt12';
  data: string;
  capabilities: PaymentCapabilities;
}

async function sendNutzap(recipient: NostrEvent, amount: number) {
  const paymentMethods = await getRecipientPaymentMethods(recipient);

  // Preference order: BOLT12 -> BOLT11
  for (const method of paymentMethods) {
    try {
      if (method.type === 'bolt12' && supportsBolt12()) {
        return await sendBolt12Nutzap(recipient, amount, method.data);
      } else if (method.type === 'bolt11') {
        return await sendBolt11Nutzap(recipient, amount, method.data);
      }
    } catch (error) {
      console.warn(`Payment method ${method.type} failed, trying next`);
      continue;
    }
  }

  throw new Error('No compatible payment methods available');
}
```

**Migration Path for Users:**
1. **Phase 1**: BOLT11 remains primary, BOLT12 as experimental option
2. **Phase 2**: BOLT12 becomes default for supported recipients/mints
3. **Phase 3**: BOLT11 maintained for compatibility, BOLT12 primary

**NIP-57 Enhancement:**
```json
{
  "kind": 9734,
  "content": "",
  "tags": [
    ["relays", "wss://relay.example.com"],
    ["amount", "1000"],
    ["lnurl", "lnurl1..."],
    ["bolt11_callback", "https://example.com/lnurlp/callback"],
    ["bolt12_offer", "lno1..."],
    ["payment_methods", "bolt11", "bolt12"],
    ["amount_range", "100", "50000"],
    ["p", "recipient_pubkey"]
  ]
}
```

## Timeline & Milestones

### Foundation Phase
**Environment Setup**
- [ ] Monitor @cashu/cashu-ts NUT-25 development
- [ ] Set up BOLT12 development environment
- [ ] Create test mint environment with NUT-25 support

**Core Utilities**
- [ ] Implement BOLT12 offer parsing and validation
- [ ] Create BOLT12 invoice request generation
- [ ] Add BOLT12 signature verification

**Mint Integration**
- [ ] Enhance mint compatibility testing for NUT-25
- [ ] Implement BOLT12 mint quote operations
- [ ] Add BOLT12 melt quote operations

**Payment Method Selection**
- [ ] Implement payment method detection logic
- [ ] Create automatic fallback mechanisms
- [ ] Add user preference management

### Implementation Phase
**Core Nutzap Integration**
- [ ] Implement BOLT12 nutzap creation
- [ ] Add BOLT12 offer management to user profiles
- [ ] Enhance NIP-57 zap info with BOLT12 support
- [ ] Implement BOLT12 nutzap receiving

**User Experience**
- [ ] Create BOLT12 offer creation UI
- [ ] Enhance zap sending interface with method selection
- [ ] Add BOLT12 offer QR code generation and sharing
- [ ] Implement batch zapping capabilities

**Testing & Validation**
- [ ] Comprehensive unit test suite
- [ ] Integration testing with test mints
- [ ] User acceptance testing
- [ ] Performance benchmarking

### Production Readiness
**Production Integration**
- [ ] Production mint compatibility testing
- [ ] Security audit and penetration testing
- [ ] Load testing and performance optimization
- [ ] Documentation and migration guides

**Launch Preparation**
- [ ] Feature flag implementation for gradual rollout
- [ ] Monitoring and analytics integration
- [ ] User education materials
- [ ] Community feedback integration

## Conclusion

BOLT12 NUT-25 support represents a significant evolution in ZapTok's payment capabilities, offering users enhanced privacy, improved user experience, and future-proof technology alignment. The phased implementation approach ensures production stability while positioning ZapTok as an innovation leader in the Nostr ecosystem.

**Key Success Factors:**
1. **Ecosystem Readiness**: Close monitoring of @cashu/cashu-ts and mint support
2. **User-Centric Design**: Seamless integration with automatic fallback to BOLT11
3. **Production Quality**: Comprehensive testing and gradual rollout
4. **Community Engagement**: Active participation in Lightning and Cashu development

**Expected Outcomes:**
- Enhanced user experience with instant, flexible zapping
- Competitive advantage as first major Nostr client with BOLT12 nutzaps
- Contribution to Lightning Network and Cashu ecosystem advancement
- Foundation for future payment innovations

This implementation will establish ZapTok as the premier platform for next-generation Lightning-powered social interactions on Nostr.

---

**Document Maintainer:** ZapTok Development Team
**Last Updated:** September 4, 2025
**Next Review:** TBD based on ecosystem developments
**Status:** Planning Phase