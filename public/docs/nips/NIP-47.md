NIP-47
======

Nostr Wallet Connect
--------------------

`draft` `optional`

This NIP defines a protocol for clients to remotely control Lightning wallets through a standardized interface. The communication happens through Nostr events, enabling wallet functionality across different clients and devices.

## Overview

Nostr Wallet Connect (NWC) enables:
- **Remote wallet control**: Control Lightning wallets from any Nostr client
- **Cross-device wallets**: Access wallet from multiple devices
- **Wallet abstraction**: Standardized interface regardless of wallet implementation
- **Permission management**: Granular control over wallet operations

## Connection Process

### 1. Connection URI Format

Wallets provide connection URIs in this format:

```
nostr+walletconnect://<pubkey>?relay=<relay>&secret=<secret>&lud16=<lud16>
```

Example:
```
nostr+walletconnect://69effe7b49a6dd5cf525bd0905917a5005ffe480b58eeb8e861bb4e2e8e9c4d0?relay=wss%3A%2F%2Frelay.getalby.com%2Fv1&secret=71a8c14c1407c113601079c4dcb9cc5014b6b00d5bdef90a07fb632c9b3e15f6&lud16=
```

### 2. URI Parameters

- **pubkey**: Wallet's public key for event communication
- **relay**: WebSocket relay URL for communication
- **secret**: Shared secret for message encryption (32-byte hex)
- **lud16**: Optional Lightning Address for the wallet

### 3. Client Connection

```typescript
// Parse connection URI
function parseWalletConnectUri(uri: string): WalletConnection {
  const url = new URL(uri);
  
  if (url.protocol !== 'nostr+walletconnect:') {
    throw new Error('Invalid protocol');
  }
  
  return {
    walletPubkey: url.hostname,
    relay: decodeURIComponent(url.searchParams.get('relay') || ''),
    secret: url.searchParams.get('secret') || '',
    lud16: url.searchParams.get('lud16') || ''
  };
}

// Establish wallet connection
async function connectWallet(uri: string): Promise<WalletClient> {
  const connection = parseWalletConnectUri(uri);
  
  // Connect to relay
  const relay = new Relay(connection.relay);
  await relay.connect();
  
  // Subscribe to wallet responses
  const filter = {
    kinds: [23195], // NIP-47 response events
    authors: [connection.walletPubkey],
    '#p': [getCurrentUserPubkey()]
  };
  
  relay.subscribe(filter, handleWalletResponse);
  
  return new WalletClient(connection, relay);
}
```

## Command Protocol

### Request Events (Kind 23194)

```json
{
  "kind": 23194,
  "content": "<encrypted_content>",
  "tags": [
    ["p", "<wallet_pubkey>"]
  ],
  "created_at": 1681980113
}
```

### Response Events (Kind 23195)

```json
{
  "kind": 23195, 
  "content": "<encrypted_content>",
  "tags": [
    ["p", "<client_pubkey>"],
    ["e", "<request_event_id>"]
  ],
  "created_at": 1681980114
}
```

### Content Encryption

Messages are encrypted using NIP-04 encryption:

```typescript
// Encrypt request content
async function encryptWalletRequest(
  content: any,
  recipientPubkey: string,
  senderPrivkey: string
): Promise<string> {
  const contentString = JSON.stringify(content);
  return await nip04.encrypt(senderPrivkey, recipientPubkey, contentString);
}

// Decrypt response content
async function decryptWalletResponse(
  encryptedContent: string,
  senderPubkey: string,
  recipientPrivkey: string
): Promise<any> {
  const decrypted = await nip04.decrypt(recipientPrivkey, senderPubkey, encryptedContent);
  return JSON.parse(decrypted);
}
```

## Supported Commands

### get_balance

Get wallet balance information.

**Request:**
```json
{
  "method": "get_balance"
}
```

**Response:**
```json
{
  "result_type": "get_balance",
  "result": {
    "balance": 10000
  }
}
```

### get_info

Get wallet and node information.

**Request:**
```json
{
  "method": "get_info"
}
```

**Response:**
```json
{
  "result_type": "get_info",
  "result": {
    "alias": "MyLightningWallet",
    "color": "3399ff",
    "pubkey": "02...",
    "network": "bitcoin",
    "block_height": 800000,
    "block_hash": "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
    "methods": ["get_balance", "make_invoice", "pay_invoice", "pay_keysend", "get_info", "list_transactions"]
  }
}
```

### make_invoice

Create a Lightning invoice.

**Request:**
```json
{
  "method": "make_invoice",
  "params": {
    "amount": 1000,
    "description": "Test invoice",
    "description_hash": "",
    "expiry": 86400
  }
}
```

**Response:**
```json
{
  "result_type": "make_invoice",
  "result": {
    "type": "incoming",
    "invoice": "lnbc10m1pvjluez...",
    "description": "Test invoice",
    "description_hash": "",
    "preimage": "5d006d2cf963c7aac3c8b6c39b7c...",
    "payment_hash": "63c49d8fa6a2d0c2b6d6c7b5e7a0...",
    "amount": 1000,
    "fees_paid": 0,
    "created_at": 1681980113,
    "expires_at": 1681980113,
    "metadata": {}
  }
}
```

### pay_invoice

Pay a Lightning invoice.

**Request:**
```json
{
  "method": "pay_invoice",
  "params": {
    "invoice": "lnbc10m1pvjluez...",
    "amount": null
  }
}
```

**Response:**
```json
{
  "result_type": "pay_invoice",
  "result": {
    "type": "outgoing",
    "invoice": "lnbc10m1pvjluez...",
    "description": "Test payment",
    "description_hash": "",
    "preimage": "5d006d2cf963c7aac3c8b6c39b7c...",
    "payment_hash": "63c49d8fa6a2d0c2b6d6c7b5e7a0...",
    "amount": 1000,
    "fees_paid": 21,
    "created_at": 1681980113,
    "settled_at": 1681980114,
    "metadata": {}
  }
}
```

### pay_keysend

Send a spontaneous payment (keysend).

**Request:**
```json
{
  "method": "pay_keysend", 
  "params": {
    "amount": 1000,
    "pubkey": "02...",
    "preimage": "5d006d2cf963c7aac3c8b6c39b7c...",
    "tlv_records": []
  }
}
```

**Response:**
```json
{
  "result_type": "pay_keysend",
  "result": {
    "type": "outgoing",
    "description": "",
    "description_hash": "",
    "preimage": "5d006d2cf963c7aac3c8b6c39b7c...",
    "payment_hash": "63c49d8fa6a2d0c2b6d6c7b5e7a0...",
    "amount": 1000,
    "fees_paid": 21,
    "created_at": 1681980113,
    "settled_at": 1681980114,
    "metadata": {}
  }
}
```

### list_transactions

List recent transactions.

**Request:**
```json
{
  "method": "list_transactions",
  "params": {
    "from": 1681980113,
    "until": 1681980114,
    "limit": 10,
    "offset": 0,
    "unpaid": false,
    "type": "incoming"
  }
}
```

**Response:**
```json
{
  "result_type": "list_transactions",
  "result": {
    "transactions": [
      {
        "type": "incoming",
        "invoice": "lnbc10m1pvjluez...",
        "description": "Test transaction",
        "description_hash": "",
        "preimage": "5d006d2cf963c7aac3c8b6c39b7c...",
        "payment_hash": "63c49d8fa6a2d0c2b6d6c7b5e7a0...",
        "amount": 1000,
        "fees_paid": 0,
        "created_at": 1681980113,
        "settled_at": 1681980114,
        "metadata": {}
      }
    ]
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "result_type": "error",
  "error": {
    "code": "PAYMENT_FAILED",
    "message": "Payment failed: insufficient balance"
  }
}
```

### Common Error Codes

- `PAYMENT_FAILED`: Payment could not be completed
- `NOT_IMPLEMENTED`: Method not supported by wallet
- `INSUFFICIENT_BALANCE`: Not enough balance for payment
- `QUOTA_EXCEEDED`: Rate limit or quota exceeded  
- `RESTRICTED`: Operation not permitted
- `UNAUTHORIZED`: Invalid credentials or permissions
- `INTERNAL`: Internal wallet error
- `OTHER`: Unspecified error

### Error Handling Implementation

```typescript
// Handle wallet response errors
function handleWalletError(response: WalletResponse): Error {
  if (response.result_type === 'error') {
    const { code, message } = response.error;
    
    switch (code) {
      case 'PAYMENT_FAILED':
        return new PaymentError(message);
      case 'INSUFFICIENT_BALANCE':
        return new InsufficientBalanceError(message);
      case 'NOT_IMPLEMENTED':
        return new NotImplementedError(message);
      case 'UNAUTHORIZED':
        return new UnauthorizedError(message);
      default:
        return new WalletError(message, code);
    }
  }
  
  return new Error('Unknown wallet response format');
}
```

## Client Implementation

### Wallet Client Class

```typescript
class WalletClient {
  constructor(
    private connection: WalletConnection,
    private relay: Relay
  ) {}

  async getBalance(): Promise<number> {
    const response = await this.sendCommand({
      method: 'get_balance'
    });
    
    if (response.result_type === 'error') {
      throw handleWalletError(response);
    }
    
    return response.result.balance;
  }

  async makeInvoice(params: {
    amount: number;
    description: string;
    expiry?: number;
  }): Promise<Invoice> {
    const response = await this.sendCommand({
      method: 'make_invoice',
      params
    });

    if (response.result_type === 'error') {
      throw handleWalletError(response);
    }

    return response.result;
  }

  async payInvoice(invoice: string, amount?: number): Promise<Payment> {
    const response = await this.sendCommand({
      method: 'pay_invoice',
      params: { invoice, amount }
    });

    if (response.result_type === 'error') {
      throw handleWalletError(response);
    }

    return response.result;
  }

  private async sendCommand(command: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Generate request ID
      const requestId = generateRandomId();
      
      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Create and send request event
      const requestEvent = {
        kind: 23194,
        content: await encryptWalletRequest(
          command,
          this.connection.walletPubkey,
          getCurrentUserPrivkey()
        ),
        tags: [['p', this.connection.walletPubkey]],
        created_at: Math.floor(Date.now() / 1000)
      };

      this.relay.publish(await signEvent(requestEvent));
      
      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Wallet command timeout'));
        }
      }, 30000);
    });
  }
}
```

### UI Integration

```typescript
// Wallet connection modal
function WalletConnectModal({ onConnect }: { onConnect: (client: WalletClient) => void }) {
  const [uri, setUri] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const client = await connectWallet(uri);
      await client.getInfo(); // Test connection
      onConnect(client);
    } catch (error) {
      alert('Failed to connect to wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wallet-connect-modal">
      <h3>Connect Lightning Wallet</h3>
      <input
        type="text"
        placeholder="nostr+walletconnect://..."
        value={uri}
        onChange={(e) => setUri(e.target.value)}
      />
      <button onClick={handleConnect} disabled={loading}>
        {loading ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  );
}

// Payment component using wallet
function PaymentComponent({ amount, description }: { amount: number, description: string }) {
  const { walletClient } = useWallet();
  const [paying, setPaying] = useState(false);

  const handlePay = async () => {
    if (!walletClient) return;
    
    setPaying(true);
    try {
      const invoice = await walletClient.makeInvoice({
        amount,
        description
      });
      
      // Display invoice for payment
      showInvoice(invoice.invoice);
    } catch (error) {
      alert('Payment failed: ' + error.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <button onClick={handlePay} disabled={!walletClient || paying}>
      {paying ? 'Processing...' : `Pay ${amount} sats`}
    </button>
  );
}
```

## Security Considerations

### Connection Security
- **Secret protection**: Keep connection secret secure and never log it
- **HTTPS relays**: Use encrypted relay connections when possible
- **Permission scoping**: Implement granular permissions for wallet operations
- **Session management**: Implement session timeouts and re-authentication

### Message Security
```typescript
// Secure message handling
class SecureWalletClient {
  private secret: string;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private lastActivity: number = Date.now();

  async sendSecureCommand(command: any): Promise<any> {
    // Check session validity
    if (Date.now() - this.lastActivity > this.sessionTimeout) {
      throw new Error('Session expired, please reconnect');
    }

    // Add timestamp to prevent replay attacks
    const commandWithTimestamp = {
      ...command,
      timestamp: Date.now(),
      nonce: generateRandomNonce()
    };

    // Update activity timestamp
    this.lastActivity = Date.now();

    return this.sendCommand(commandWithTimestamp);
  }

  validateResponse(response: any, requestTimestamp: number): boolean {
    // Check response timestamp is reasonable
    const now = Date.now();
    const responseTime = response.timestamp || 0;
    
    if (Math.abs(now - responseTime) > 60000) { // 1 minute tolerance
      throw new Error('Response timestamp invalid');
    }

    if (responseTime < requestTimestamp) {
      throw new Error('Response predates request');
    }

    return true;
  }
}
```

### Permission Management
```typescript
interface WalletPermissions {
  methods: string[];
  maxAmount?: number;
  budgetPeriod?: number; // seconds
  budgetAmount?: number;
  expiresAt?: number;
}

// Permission-aware wallet client
class PermissionedWalletClient extends WalletClient {
  constructor(
    connection: WalletConnection,
    relay: Relay,
    private permissions: WalletPermissions
  ) {
    super(connection, relay);
  }

  async sendCommand(command: any): Promise<any> {
    // Check method permissions
    if (!this.permissions.methods.includes(command.method)) {
      throw new Error(`Method ${command.method} not permitted`);
    }

    // Check amount limits for payment methods
    if (['pay_invoice', 'pay_keysend'].includes(command.method)) {
      await this.checkPaymentPermissions(command);
    }

    // Check expiration
    if (this.permissions.expiresAt && Date.now() > this.permissions.expiresAt) {
      throw new Error('Wallet permissions expired');
    }

    return super.sendCommand(command);
  }

  private async checkPaymentPermissions(command: any): Promise<void> {
    const amount = command.params?.amount || 0;
    
    if (this.permissions.maxAmount && amount > this.permissions.maxAmount) {
      throw new Error(`Payment amount exceeds limit of ${this.permissions.maxAmount} sats`);
    }

    if (this.permissions.budgetAmount && this.permissions.budgetPeriod) {
      const spent = await this.getSpentInPeriod(this.permissions.budgetPeriod);
      if (spent + amount > this.permissions.budgetAmount) {
        throw new Error(`Payment would exceed budget limit`);
      }
    }
  }
}
```

## Best Practices

### For Wallet Developers
1. **Implement all core methods**: Support get_info, get_balance, make_invoice, pay_invoice
2. **Validate permissions**: Implement granular permission checking
3. **Rate limiting**: Prevent abuse with appropriate rate limits
4. **Secure storage**: Protect connection secrets and private keys
5. **Error handling**: Provide clear, actionable error messages

### For Client Developers  
1. **Connection management**: Handle connection failures and reconnection
2. **User experience**: Provide clear wallet status and error feedback
3. **Permission requests**: Request minimal necessary permissions
4. **Fallback handling**: Graceful degradation when wallet unavailable
5. **Testing**: Thoroughly test with different wallet implementations

### For Users
1. **Connection security**: Only connect to trusted wallet providers
2. **Permission review**: Carefully review permissions before connecting
3. **Monitor activity**: Regularly check wallet transaction history
4. **Disconnect unused**: Remove unused wallet connections
5. **Backup connections**: Keep connection URIs secure but accessible

## Related NIPs

- **NIP-04**: Encrypted Direct Message (used for message encryption)
- **NIP-57**: Lightning Zaps (enhanced by wallet connectivity)
- **NIP-01**: Basic event structure (foundation for request/response events)

## Status

**Implementation Status in ZapTok**: 🚧 Partially Implemented

**Details**:
- ✅ Wallet connection URI parsing
- ✅ Basic wallet command interface (get_info, get_balance)
- ✅ Payment commands (make_invoice, pay_invoice)
- ✅ Encrypted message handling with NIP-04
- ✅ Error handling and user feedback
- ✅ UI components for wallet connection
- 🚧 Permission management system (basic implementation)
- 🚧 Advanced security features (session management, rate limiting)
- ❌ Keysend payments (pay_keysend method)
- ❌ Transaction history (list_transactions method)
- ❌ Multi-wallet management
- ❌ Advanced permission scoping and budget controls

**Priority for completion**: High - NWC is essential for Lightning payments and wallet integration in the video content ecosystem.
