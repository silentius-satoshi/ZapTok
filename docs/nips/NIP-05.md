NIP-05
======

Mapping Nostr keys to DNS-based internet identifiers
-----------------------------------------------------

`final` `mandatory`

On many platforms, users are used to identifying themselves by a username or email address. This NIP enables Nostr users to be identified by a DNS-based internet identifier like `_@example.com` or `username@example.com`.

A user who owns the domain `example.com` can add a `username` that maps their domain to their Nostr public key. These internet identifiers are mappings only -- they are not cryptographic assertions. Users must verify these claims.

## Identifier Format

Internet identifiers take the form:

```
<local-part>@<domain>
```

Examples:
- `alice@example.com`
- `bob@nostr-domain.net`
- `_@personal-site.org` (underscore represents the root)

## DNS Mapping Process

### 1. Well-Known URL Structure

For identifier `username@domain.com`, clients query:

```
https://domain.com/.well-known/nostr.json?name=username
```

For root identifier `_@domain.com`, clients query:

```
https://domain.com/.well-known/nostr.json?name=_
```

### 2. Response Format

The server should respond with JSON in this format:

```json
{
  "names": {
    "alice": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc6a4ba4f8a5a004",
    "bob": "c3f2f4e8a9b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5",
    "_": "e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc6a4ba4f8a5a004": [
      "wss://relay.example.com",
      "wss://nostr-pub.wellorder.net"
    ]
  }
}
```

### 3. Fields Explanation

- **names**: Maps usernames to 32-byte hex public keys (required)
- **relays**: Maps public keys to relay URLs for discovery (optional)

## Client Implementation

### Verification Process
```typescript
// Verify NIP-05 identifier
async function verifyNip05(identifier: string, pubkey: string): Promise<boolean> {
  try {
    const [username, domain] = identifier.split('@');
    if (!domain) return false;

    const url = `https://${domain}/.well-known/nostr.json?name=${username}`;
    const response = await fetch(url, {
      timeout: 10000,
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) return false;

    const data = await response.json();
    const expectedPubkey = data.names?.[username];
    
    return expectedPubkey === pubkey;
  } catch (error) {
    console.warn('NIP-05 verification failed:', error);
    return false;
  }
}
```

### Profile Enhancement
```typescript
// Get verified identifier from profile
function getVerifiedIdentifier(profile: any): string | null {
  const nip05 = profile.nip05;
  if (!nip05) return null;

  // Basic format validation
  if (!nip05.includes('@') || nip05.split('@').length !== 2) {
    return null;
  }

  return nip05;
}

// Display verified status in UI
function displayUserName(profile: any, pubkey: string): string {
  const identifier = getVerifiedIdentifier(profile);
  if (identifier && profile.nip05Valid) {
    return `${profile.name || identifier} ✓`;
  }
  return profile.name || pubkey.slice(0, 8);
}
```

### Relay Discovery
```typescript
// Get relays from NIP-05 response
async function getRelaysFromNip05(identifier: string): Promise<string[]> {
  try {
    const [username, domain] = identifier.split('@');
    const url = `https://${domain}/.well-known/nostr.json?name=${username}`;
    const response = await fetch(url);
    const data = await response.json();

    const pubkey = data.names?.[username];
    if (!pubkey) return [];

    return data.relays?.[pubkey] || [];
  } catch {
    return [];
  }
}
```

## Server Implementation

### Well-Known Endpoint
```javascript
// Express.js example for /.well-known/nostr.json
app.get('/.well-known/nostr.json', (req, res) => {
  const { name } = req.query;
  
  if (!name) {
    return res.status(400).json({ error: 'Name parameter required' });
  }

  // Look up mapping in database
  const mapping = getUserMapping(name);
  if (!mapping) {
    return res.status(404).json({ error: 'User not found' });
  }

  const response = {
    names: {
      [name]: mapping.pubkey
    }
  };

  // Add relay information if available
  if (mapping.relays && mapping.relays.length > 0) {
    response.relays = {
      [mapping.pubkey]: mapping.relays
    };
  }

  res.json(response);
});
```

### Static File Hosting
```json
{
  "names": {
    "john": "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc6a4ba4f8a5a004",
    "jane": "c3f2f4e8a9b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5",
    "_": "root_user_pubkey_here"
  },
  "relays": {
    "b0635d6a9851d3aed0cd6c495b282167acf761729078d975fc6a4ba4f8a5a004": [
      "wss://relay1.example.com",
      "wss://relay2.example.com"
    ]
  }
}
```

### CORS Configuration
```javascript
// Enable CORS for well-known endpoint
app.get('/.well-known/nostr.json', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  });
  
  // ... rest of handler
});
```

## Profile Integration

### Metadata Event
```json
{
  "kind": 0,
  "content": "{\"name\":\"Alice\",\"about\":\"Nostr enthusiast\",\"nip05\":\"alice@example.com\",\"picture\":\"https://example.com/alice.jpg\"}"
}
```

### Validation Status Tracking
```typescript
interface ProfileData {
  name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  nip05Valid?: boolean;
  nip05LastChecked?: number;
}

// Periodic verification
async function updateNip05Status(pubkey: string, profile: ProfileData): Promise<ProfileData> {
  if (!profile.nip05) return profile;

  const now = Date.now();
  const lastChecked = profile.nip05LastChecked || 0;
  const checkInterval = 24 * 60 * 60 * 1000; // 24 hours

  if (now - lastChecked < checkInterval) {
    return profile; // Skip if checked recently
  }

  const isValid = await verifyNip05(profile.nip05, pubkey);
  
  return {
    ...profile,
    nip05Valid: isValid,
    nip05LastChecked: now
  };
}
```

## Security Considerations

### DNS Vulnerabilities
- **DNS hijacking**: Attackers could take over domains and change mappings
- **Certificate attacks**: HTTPS certificate compromise affects verification
- **Subdomain takeover**: Vulnerable subdomains could be exploited
- **Cache poisoning**: DNS cache poisoning could redirect verification

### Verification Best Practices
```typescript
// Secure verification with additional checks
async function secureNip05Verification(
  identifier: string, 
  pubkey: string,
  options: { timeout?: number, retries?: number } = {}
): Promise<boolean> {
  const { timeout = 10000, retries = 2 } = options;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const [username, domain] = identifier.split('@');
      
      // Validate domain format
      if (!isValidDomain(domain)) return false;
      
      // Use HTTPS only
      const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(username)}`;
      
      const response = await fetch(url, {
        timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Nostr-Client/1.0'
        }
      });

      if (!response.ok) {
        if (attempt === retries) return false;
        await sleep(1000 * (attempt + 1));
        continue;
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data.names || typeof data.names !== 'object') return false;
      
      const expectedPubkey = data.names[username];
      return expectedPubkey === pubkey;
      
    } catch (error) {
      if (attempt === retries) {
        console.warn(`NIP-05 verification failed after ${retries + 1} attempts:`, error);
        return false;
      }
      await sleep(1000 * (attempt + 1));
    }
  }
  
  return false;
}
```

### Rate Limiting
```typescript
// Client-side rate limiting for verification
class Nip05RateLimiter {
  private attempts = new Map<string, number[]>();
  private readonly maxAttempts = 5;
  private readonly windowMs = 60 * 1000; // 1 minute

  canVerify(domain: string): boolean {
    const now = Date.now();
    const domainAttempts = this.attempts.get(domain) || [];
    
    // Remove expired attempts
    const validAttempts = domainAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    this.attempts.set(domain, validAttempts);
    return validAttempts.length < this.maxAttempts;
  }

  recordAttempt(domain: string): void {
    const attempts = this.attempts.get(domain) || [];
    attempts.push(Date.now());
    this.attempts.set(domain, attempts);
  }
}
```

## Privacy Considerations

### Domain Exposure
- **Identity correlation**: NIP-05 links Nostr identity to real-world domains
- **Metadata collection**: Domain owners can track verification requests
- **IP address exposure**: Client IP addresses are visible to domain servers
- **Usage patterns**: Verification timing reveals user activity patterns

### Mitigation Strategies
```typescript
// Privacy-conscious verification
async function privateNip05Verification(
  identifier: string,
  pubkey: string,
  options: { useProxy?: boolean, tor?: boolean } = {}
): Promise<boolean> {
  let fetchOptions: RequestInit = {
    headers: {
      'Accept': 'application/json'
      // Omit User-Agent or use generic one
    }
  };

  if (options.useProxy) {
    // Route through privacy proxy
    fetchOptions = {
      ...fetchOptions,
      // Configure proxy settings
    };
  }

  // Add random delay to prevent timing analysis
  await sleep(Math.random() * 1000);
  
  return verifyNip05(identifier, pubkey);
}
```

## Performance Optimization

### Caching Strategy
```typescript
// Efficient NIP-05 cache management
class Nip05Cache {
  private cache = new Map<string, {
    valid: boolean;
    timestamp: number;
    relays?: string[];
  }>();
  
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly NEGATIVE_CACHE_TTL = 60 * 60 * 1000; // 1 hour for failures

  async getVerificationStatus(
    identifier: string,
    pubkey: string
  ): Promise<{ valid: boolean; relays?: string[] }> {
    const cached = this.cache.get(`${identifier}:${pubkey}`);
    const now = Date.now();
    
    if (cached) {
      const ttl = cached.valid ? this.CACHE_TTL : this.NEGATIVE_CACHE_TTL;
      if (now - cached.timestamp < ttl) {
        return { valid: cached.valid, relays: cached.relays };
      }
    }

    // Perform fresh verification
    const valid = await verifyNip05(identifier, pubkey);
    const relays = valid ? await getRelaysFromNip05(identifier) : undefined;
    
    this.cache.set(`${identifier}:${pubkey}`, {
      valid,
      timestamp: now,
      relays
    });

    return { valid, relays };
  }

  invalidate(identifier: string, pubkey?: string): void {
    if (pubkey) {
      this.cache.delete(`${identifier}:${pubkey}`);
    } else {
      // Invalidate all entries for this identifier
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${identifier}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }
}
```

### Batch Verification
```typescript
// Batch verify multiple identifiers
async function batchVerifyNip05(
  verifications: Array<{ identifier: string; pubkey: string }>
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  // Group by domain to minimize requests
  const byDomain = new Map<string, Array<{ identifier: string; pubkey: string }>>();
  
  verifications.forEach(({ identifier, pubkey }) => {
    const domain = identifier.split('@')[1];
    if (!byDomain.has(domain)) {
      byDomain.set(domain, []);
    }
    byDomain.get(domain)!.push({ identifier, pubkey });
  });

  // Process each domain
  for (const [domain, domainVerifications] of byDomain) {
    try {
      const url = `https://${domain}/.well-known/nostr.json`;
      const response = await fetch(url);
      const data = await response.json();

      domainVerifications.forEach(({ identifier, pubkey }) => {
        const username = identifier.split('@')[0];
        const expectedPubkey = data.names?.[username];
        results.set(identifier, expectedPubkey === pubkey);
      });
    } catch (error) {
      // Mark all verifications for this domain as failed
      domainVerifications.forEach(({ identifier }) => {
        results.set(identifier, false);
      });
    }
  }

  return results;
}
```

## Error Handling

### Common Errors
```typescript
enum Nip05Error {
  InvalidFormat = 'INVALID_FORMAT',
  NetworkError = 'NETWORK_ERROR',
  InvalidResponse = 'INVALID_RESPONSE',
  UserNotFound = 'USER_NOT_FOUND',
  Timeout = 'TIMEOUT',
  DomainError = 'DOMAIN_ERROR'
}

interface Nip05Result {
  valid: boolean;
  error?: Nip05Error;
  relays?: string[];
}

async function robustNip05Verification(
  identifier: string,
  pubkey: string
): Promise<Nip05Result> {
  try {
    // Validate identifier format
    if (!identifier.includes('@') || identifier.split('@').length !== 2) {
      return { valid: false, error: Nip05Error.InvalidFormat };
    }

    const [username, domain] = identifier.split('@');
    
    // Validate domain
    if (!isValidDomain(domain)) {
      return { valid: false, error: Nip05Error.DomainError };
    }

    const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(username)}`;
    
    const response = await fetch(url, { timeout: 10000 });
    
    if (!response.ok) {
      if (response.status === 404) {
        return { valid: false, error: Nip05Error.UserNotFound };
      }
      return { valid: false, error: Nip05Error.NetworkError };
    }

    const data = await response.json();
    
    if (!data.names || typeof data.names !== 'object') {
      return { valid: false, error: Nip05Error.InvalidResponse };
    }

    const expectedPubkey = data.names[username];
    const valid = expectedPubkey === pubkey;
    const relays = data.relays?.[pubkey];

    return { valid, relays };

  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      return { valid: false, error: Nip05Error.Timeout };
    }
    return { valid: false, error: Nip05Error.NetworkError };
  }
}
```

## Best Practices

### For Domain Owners
1. **Serve over HTTPS**: Always use HTTPS for security
2. **Enable CORS**: Allow cross-origin requests for client verification
3. **Implement caching**: Use appropriate HTTP cache headers
4. **Monitor usage**: Track verification requests for abuse
5. **Backup strategy**: Maintain redundancy for critical mappings

### For Client Developers
1. **Implement caching**: Cache verification results with appropriate TTL
2. **Handle errors gracefully**: Provide fallbacks for verification failures
3. **Rate limit requests**: Prevent abuse of verification endpoints
4. **Validate inputs**: Always validate identifier format before verification
5. **Consider privacy**: Implement privacy-conscious verification options

### For Users
1. **Verify ownership**: Only use domains you control for your identifier
2. **Monitor mappings**: Regularly check that your mappings are correct
3. **Consider privacy**: Understand that NIP-05 links your identity to domains
4. **Use HTTPS domains**: Ensure your domain supports HTTPS
5. **Plan for continuity**: Consider what happens if you lose domain control

## Related NIPs

- **NIP-01**: Basic event structure and metadata events
- **NIP-02**: Contact lists (enhanced with verified identifiers)
- **NIP-19**: Bech32 encoding (complements identifier sharing)
- **NIP-65**: Relay list metadata (enhanced by NIP-05 relay hints)

## Status

**Implementation Status in ZapTok**: ✅ Fully Implemented

**Details**:
- ✅ NIP-05 identifier verification system
- ✅ DNS-based identity mapping (names to pubkeys)
- ✅ Relay discovery through NIP-05 responses
- ✅ Profile metadata integration with verification status
- ✅ Verification status caching with TTL management
- ✅ Batch verification for performance optimization  
- ✅ Error handling for network and validation failures
- ✅ UI indicators for verified identities (checkmarks)
- ✅ Privacy-conscious verification with rate limiting
- ✅ Secure HTTPS-only verification process
- ✅ Profile display enhancement with verified status
