NIP-87
======

Cashu Mint Discovery
--------------------

`draft` `optional`

This NIP defines a way for Cashu mints to announce themselves to the Nostr network.

## Mint Announcement Event

A Cashu mint can announce itself using a `kind:38000` replaceable event:

```jsonc
{
    "kind": 38000,
    "content": "<json>",
    "tags": [
        ["d", "<mint-url>"],
        ["mint_url", "<mint-url>"],
        ["description", "<description>"],
        ["contact", "<contact-info>"]
    ]
}
```

**Tags:**
- `d`: The mint URL, used as identifier for this replaceable event
- `mint_url`: The mint URL  
- `description`: Optional description of the mint
- `contact`: Optional contact information for the mint operator

**Content:**
The content SHOULD be a JSON string with additional mint information:
```jsonc
{
    "name": "<mint-name>",
    "description": "<detailed-description>", 
    "contact": {
        "nostr": "<npub>",
        "email": "<email>", 
        "website": "<website>"
    },
    "units": ["sat", "usd", "eur"], 
    "nuts": [4, 5, 7, 8, 9, 10, 11, 12],
    "max_amount": 100000,
    "fee_reserve": {
        "percent_fee_reserve": 4.0
    }
}
```

## Mint List Event

Users can create a `kind:10019` event to indicate which mints they trust and use:

```jsonc
{
    "kind": 10019,
    "tags": [
        ["relay", "wss://relay1"],
        ["relay", "wss://relay2"], 
        ["mint", "https://mint1", "usd", "sat"],
        ["mint", "https://mint2", "sat"],
        ["pubkey", "<p2pk-pubkey>"]
    ]
}
```

This is used in [NIP-61](61.md) for nutzap functionality.

## Mint Discovery

Clients can discover mints by querying for `kind:38000` events:

```typescript
// Discover all announced mints
const mintEvents = await nostr.query([{
  kinds: [38000],
  limit: 100
}]);

// Filter by specific criteria
const satMints = mintEvents.filter(event => {
  try {
    const content = JSON.parse(event.content);
    return content.units?.includes('sat');
  } catch {
    return false;
  }
});
```

## Implementation Guide

### Mint Operator: Announcing a Mint

```typescript
// Example mint announcement
async function announceMint(mintInfo: {
  url: string;
  name: string;
  description: string;
  contact: {
    nostr?: string;
    email?: string;
    website?: string;
  };
  units: string[];
  nuts: number[];
  maxAmount?: number;
  feeReserve?: {
    percentFeeReserve: number;
  };
}): Promise<string> {
  const mintEvent = {
    kind: 38000,
    content: JSON.stringify({
      name: mintInfo.name,
      description: mintInfo.description,
      contact: mintInfo.contact,
      units: mintInfo.units,
      nuts: mintInfo.nuts,
      max_amount: mintInfo.maxAmount,
      fee_reserve: mintInfo.feeReserve
    }),
    tags: [
      ['d', mintInfo.url],
      ['mint_url', mintInfo.url],
      ['description', mintInfo.description],
      ...(mintInfo.contact.nostr ? [['contact', mintInfo.contact.nostr]] : [])
    ],
    created_at: Math.floor(Date.now() / 1000)
  };

  const signedEvent = await signEvent(mintEvent);
  await publishToRelays(signedEvent);
  
  return signedEvent.id;
}

// Usage example
await announceMint({
  url: 'https://mint.example.com',
  name: 'Example Mint',
  description: 'A reliable Cashu mint for ecash transactions',
  contact: {
    nostr: 'npub1...',
    email: 'admin@example.com',
    website: 'https://example.com'
  },
  units: ['sat', 'usd'],
  nuts: [4, 5, 7, 8, 9, 10, 11, 12],
  maxAmount: 100000,
  feeReserve: {
    percentFeeReserve: 4.0
  }
});
```

### Client: Discovering Mints

```typescript
interface MintInfo {
  url: string;
  name?: string;
  description?: string;
  contact?: {
    nostr?: string;
    email?: string;
    website?: string;
  };
  units?: string[];
  nuts?: number[];
  maxAmount?: number;
  feeReserve?: {
    percentFeeReserve: number;
  };
  operator?: string; // pubkey of the mint operator
  lastUpdated?: number;
}

async function discoverMints(options: {
  units?: string[];
  nuts?: number[];
  maxAmount?: number;
  limit?: number;
} = {}): Promise<MintInfo[]> {
  const filter = {
    kinds: [38000],
    limit: options.limit || 100
  };

  const events = await queryRelays(filter);
  const mints: MintInfo[] = [];

  for (const event of events) {
    try {
      const content = JSON.parse(event.content);
      const mintUrl = event.tags.find(tag => tag[0] === 'mint_url')?.[1];
      
      if (!mintUrl) continue;

      // Filter by criteria
      if (options.units && !options.units.some(unit => content.units?.includes(unit))) {
        continue;
      }
      
      if (options.nuts && !options.nuts.every(nut => content.nuts?.includes(nut))) {
        continue;
      }
      
      if (options.maxAmount && content.max_amount && content.max_amount < options.maxAmount) {
        continue;
      }

      mints.push({
        url: mintUrl,
        name: content.name,
        description: content.description,
        contact: content.contact,
        units: content.units,
        nuts: content.nuts,
        maxAmount: content.max_amount,
        feeReserve: content.fee_reserve,
        operator: event.pubkey,
        lastUpdated: event.created_at
      });
    } catch (error) {
      console.warn(`Failed to parse mint announcement: ${error}`);
    }
  }

  return mints.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
}

// Usage examples
const allMints = await discoverMints();

const satMints = await discoverMints({
  units: ['sat'],
  limit: 50
});

const advancedMints = await discoverMints({
  nuts: [11, 12], // Require P2PK and DLEQ support
  maxAmount: 50000
});
```

### Client: Mint Validation and Health Checks

```typescript
// Validate mint health and capabilities
async function validateMint(mintUrl: string): Promise<{
  isHealthy: boolean;
  info?: any;
  keysets?: any[];
  supportedNuts?: number[];
  error?: string;
}> {
  try {
    // Check mint info endpoint
    const infoResponse = await fetch(`${mintUrl}/v1/info`);
    if (!infoResponse.ok) {
      return { isHealthy: false, error: 'Mint info endpoint unavailable' };
    }
    
    const info = await infoResponse.json();
    
    // Check keysets endpoint  
    const keysetsResponse = await fetch(`${mintUrl}/v1/keysets`);
    if (!keysetsResponse.ok) {
      return { isHealthy: false, error: 'Mint keysets endpoint unavailable' };
    }
    
    const keysets = await keysetsResponse.json();
    
    return {
      isHealthy: true,
      info,
      keysets: keysets.keysets,
      supportedNuts: info.nuts || []
    };
  } catch (error) {
    return { 
      isHealthy: false, 
      error: `Mint validation failed: ${error.message}` 
    };
  }
}

// Enhanced mint discovery with health checks
async function discoverHealthyMints(options: {
  units?: string[];
  nuts?: number[];
  validateHealth?: boolean;
} = {}): Promise<(MintInfo & { healthStatus?: any })[]> {
  const mints = await discoverMints(options);
  
  if (!options.validateHealth) {
    return mints;
  }
  
  const healthChecks = await Promise.allSettled(
    mints.map(async (mint) => {
      const health = await validateMint(mint.url);
      return { ...mint, healthStatus: health };
    })
  );
  
  return healthChecks
    .filter((result): result is PromiseFulfilledResult<MintInfo & { healthStatus: any }> => 
      result.status === 'fulfilled' && result.value.healthStatus.isHealthy
    )
    .map(result => result.value);
}
```

### UI Components

```tsx
// Mint discovery and selection component
function MintDiscovery({ 
  onMintSelect, 
  requiredUnits = ['sat'] 
}: {
  onMintSelect: (mint: MintInfo) => void;
  requiredUnits?: string[];
}) {
  const [mints, setMints] = useState<MintInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    units: requiredUnits,
    nuts: [11, 12], // P2PK and DLEQ support
    validateHealth: true
  });

  useEffect(() => {
    async function loadMints() {
      setLoading(true);
      try {
        const discoveredMints = await discoverHealthyMints(filter);
        setMints(discoveredMints);
      } catch (error) {
        console.error('Failed to discover mints:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadMints();
  }, [filter]);

  if (loading) {
    return <div>Discovering mints...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">Available Mints</div>
      
      {mints.length === 0 ? (
        <div className="text-muted-foreground">
          No mints found matching your criteria
        </div>
      ) : (
        <div className="grid gap-3">
          {mints.map((mint) => (
            <Card key={mint.url} className="cursor-pointer hover:bg-muted/50">
              <CardContent className="p-4" onClick={() => onMintSelect(mint)}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-medium">{mint.name || 'Unnamed Mint'}</div>
                    <div className="text-sm text-muted-foreground">{mint.url}</div>
                    {mint.description && (
                      <div className="text-sm">{mint.description}</div>
                    )}
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {mint.units?.map(unit => (
                        <Badge key={unit} variant="secondary">{unit}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button size="sm">Select</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Mint status indicator
function MintHealthIndicator({ mintUrl }: { mintUrl: string }) {
  const [health, setHealth] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const result = await validateMint(mintUrl);
      setHealth(result);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, [mintUrl]);

  if (checking) {
    return <Badge variant="secondary">Checking...</Badge>;
  }

  if (!health) {
    return <Badge variant="destructive">Unknown</Badge>;
  }

  return (
    <Badge variant={health.isHealthy ? "default" : "destructive"}>
      {health.isHealthy ? "Healthy" : "Offline"}
    </Badge>
  );
}
```

## Security Considerations

**Mint Verification:**
- **Health Checks**: Always validate mint endpoints before use
- **Reputation**: Consider mint operator reputation and history
- **Capabilities**: Verify required NUT support before selection
- **Monitoring**: Continuously monitor mint health and availability

**Discovery Security:**
- **Event Validation**: Validate mint announcement events
- **Spam Prevention**: Implement rate limiting for mint queries
- **Trust Models**: Develop trust scoring for discovered mints
- **Fallback Options**: Maintain backup mint lists

**User Protection:**
- **Warning Systems**: Alert users about untrusted mints
- **Amount Limits**: Enforce maximum amounts for new mints
- **Multi-mint Strategy**: Encourage using multiple mints
- **Recovery Plans**: Provide mint failure recovery options

## Status

**Implementation Status in ZapTok**: 🚧 Partially Implemented

**Details**:
- ✅ Basic mint discovery through hardcoded trusted mints
- ✅ Mint health validation and connectivity checks
- ✅ Integration with NIP-60 wallet for mint selection
- ✅ UI components for mint management and selection
- ❌ Full NIP-87 compliance with kind 38000 event support
- ❌ Dynamic mint discovery from Nostr network
- ❌ Mint announcement publishing for operators
- ❌ Community-based mint reputation system
- 🚧 Manual mint configuration with validation
- 🚧 Multi-mint support for enhanced privacy and redundancy

**Next Steps**:
1. Implement kind 38000 event parsing for dynamic mint discovery
2. Add mint announcement publishing functionality for operators
3. Create reputation scoring system based on community feedback
4. Enhance mint discovery UI with filtering and sorting options
5. Add automated mint health monitoring and alerting
