NIP-61
======

Nutzaps
-------

`draft` `optional`

A Nutzap is a P2PK Cashu token in which the payment itself is the receipt.

# High-level flow
Alice wants to nutzap 1 sat to Bob because of an event `event-id-1` she liked.

## Alice nutzaps Bob
1. Alice fetches event `kind:10019` from Bob to see the mints Bob trusts.
2. She mints a token at that mint (or swaps some tokens she already had in that mint) P2PK-locked to the pubkey Bob has listed in his `kind:10019`.
3. She publishes a `kind:9321` event to the relays Bob indicated with the proofs she minted.

## Bob receives the nutzap
1. At some point, Bob's client fetches `kind:9321` events p-tagging him from his relays.
2. Bob's client swaps the token into his wallet.

# Nutzap informational event
```jsonc
{
    "kind": 10019,
    "tags": [
        [ "relay", "wss://relay1" ],
        [ "relay", "wss://relay2" ],
        [ "mint", "https://mint1", "usd", "sat" ],
        [ "mint", "https://mint2", "sat" ],
        [ "pubkey", "<p2pk-pubkey>" ]
    ]
}
```

* `kind:10019` is an event that is useful for others to know how to send money to the user.
* `relay`: relays where the user will be reading token events from. If a user wants to send money to the user, they should write to these relays.
* `mint`: mints the user is explicitly agreeing to use to receive funds on. Clients SHOULD not send money on mints not listed here or risk burning their money. Additional markers can be used to list the supported base units of the mint.
* `pubkey`: Public key that MUST be used to P2PK-lock receiving nutzaps -- implementations MUST NOT use the target user's main Nostr public key. This public key corresponds to the `privkey` field encrypted in a user's [nip-60](60.md) _wallet event_.

## Nutzap event
Event `kind:9321` is a nutzap event published by the sender, p-tagging the recipient. The outputs are P2PK-locked to the public key the recipient indicated in their `kind:10019` event.

Clients MUST prefix the public key they P2PK-lock with `"02"` (for nostr<>cashu compatibility).

```jsonc
{
    "kind": 9321,
    "content": "Thanks for this great idea.",
    "pubkey": "<sender-pubkey>",
    "tags": [
        [ "proof", "{\"amount\":1,\"C\":\"02277c66191736eb72fce9d975d08e3191f8f96afb73ab1eec37e4465683066d3f\",\"id\":\"000a93d6f8a1d2c4\",\"secret\":\"[\\\"P2PK\\\",{\\\"nonce\\\":\\\"b00bdd0467b0090a25bdf2d2f0d45ac4e355c482c1418350f273a04fedaaee83\\\",\\\"data\\\":\\\"02eaee8939e3565e48cc62967e2fde9d8e2a4b3ec0081f29eceff5c64ef10ac1ed\\\"}]\"}" ],
        [ "u", "https://stablenut.umint.cash" ],
        [ "e", "<nutzapped-event-id>", "<relay-hint>" ],
        [ "p", "e9fbced3a42dcf551486650cc752ab354347dd413b307484e4fd1818ab53f991" ], // recipient of nutzap
    ]
}
```

* `.content` is an optional comment for the nutzap
* `.tags`:
  * `proof` is one or more proofs P2PK-locked to the public key the recipient specified in their `kind:10019` event and including a DLEQ proof.
  * `u` is the mint the URL of the mint EXACTLY as specified by the recipient's `kind:10019`.
  * `p` is the Nostr identity public key of nutzap recipient.
  * `e` is the event that is being nutzapped, if any.

# Sending a nutzap

* The sender fetches the recipient's `kind:10019`.
* The sender mints/swaps ecash on one of the recipient's listed mints.
* The sender P2PK-locks to the recipient's specified public key in their `kind:10019`

# Receiving nutzaps

Clients should REQ for nutzaps:
* Filtering with `#u` for mints they expect to receive ecash from.
  * this is to prevent even interacting with mints the user hasn't explicitly signaled.
* Filtering with `since` of the most recent `kind:7376` event the same user has created.
  * this can be used as a marker of the nutzaps that have already been swaped by the user -- clients might choose to use other kinds of markers, including internal state -- this is just a guidance of one possible approach.

`{ "kinds": [9321], "#p": ["my-pubkey"], "#u": ["<mint-1>", "<mint-2>"], "since": <latest-created_at-of-kind-7376> }`.

Upon receiving a new nutzap, the client should swap the tokens into a wallet the user controls, either a [NIP-60](60.md) wallet, their own LN wallet or anything else.

## Updating nutzap-redemption history
When claiming a token the client SHOULD create a `kind:7376` event and `e` tag the original nutzap event. This is to record that this token has already been claimed (and shouldn't be attempted again) and as signaling to the recipient that the ecash has been redeemed.

Multiple `kind:9321` events can be tagged in the same `kind:7376` event.

```jsonc
{
    "kind": 7376,
    "content": nip44_encrypt([
        [ "direction", "in" ], // in = received, out = sent
        [ "amount", "1" ],
        [ "e", "<7375-event-id>", "<relay-hint>", "created" ] // new token event that was created
    ]),
    "tags": [
        [ "e", "<9321-event-id>", "<relay-hint>", "redeemed" ], // nutzap event that has been redeemed
        [ "p", "<sender-pubkey>" ] // pubkey of the author of the 9321 event (nutzap sender)
    ]
}
```

Events that redeem a nutzap SHOULD be published to the sender's [NIP-65](65.md) "read" relays.

## Verifying a Cashu Zap
When listing or counting zaps received by any given event, observer clients SHOULD:

* check that the receiving user has issued a `kind:10019` tagging the mint where the cashu has been minted.
* check that the token is locked to the pubkey the user has listed in their `kind:10019`.
* look at the `u` tag and check that the token is issued in one of the mints listed in the `kind:10019`.
* locally verify the DLEQ proof of the tokens being sent.

All these checks can be done offline (as long as the observer has the receiver mints' keyset and their `kind:10019` event), so the process should be reasonably fast.

## Final Considerations
1. Clients SHOULD guide their users to use NUT-11 (P2PK) and NUT-12 (DLEQ proofs) compatible-mints in their `kind:10019` event to avoid receiving nutzaps anyone can spend.
2. Clients SHOULD normalize and deduplicate mint URLs as described in NIP-65.
3. A nutzap event MUST include proofs in one of the mints the recipient has listed in their `kind:10019` and published to the NIP-65 relays of the recipient, failure to do so may result in the recipient donating the tokens to the mint since the recipient might never see the event.

## Implementation Guide

### Sending Nutzaps
```typescript
// Example nutzap sending implementation
async function sendNutzap(
  recipient: string,
  amount: number,
  eventId?: string,
  comment?: string
): Promise<string> {
  // 1. Fetch recipient's nutzap configuration
  const recipientConfig = await fetchNutzapConfig(recipient);
  if (!recipientConfig) {
    throw new Error('Recipient does not accept nutzaps');
  }

  // 2. Select compatible mint
  const mint = selectCompatibleMint(recipientConfig.mints);
  if (!mint) {
    throw new Error('No compatible mints found');
  }

  // 3. Mint P2PK-locked tokens
  const cashuWallet = getCashuWallet(mint);
  const proofs = await cashuWallet.mintP2PK({
    amount,
    pubkey: recipientConfig.pubkey // P2PK lock to recipient's nutzap pubkey
  });

  // 4. Create and publish nutzap event
  const nutzapEvent = {
    kind: 9321,
    content: comment || '',
    tags: [
      ...proofs.map(proof => ['proof', JSON.stringify(proof)]),
      ['u', mint],
      ['p', recipient],
      ...(eventId ? [['e', eventId]] : [])
    ],
    created_at: Math.floor(Date.now() / 1000)
  };

  const signedEvent = await signEvent(nutzapEvent);
  await publishToRelays(signedEvent, recipientConfig.relays);
  
  return signedEvent.id;
}
```

### Receiving Nutzaps
```typescript
// Example nutzap receiving implementation
async function receiveNutzaps(userPubkey: string): Promise<NutzapEvent[]> {
  const userConfig = await getUserNutzapConfig(userPubkey);
  
  const filter = {
    kinds: [9321],
    '#p': [userPubkey],
    '#u': userConfig.mints,
    since: getLastProcessedTimestamp()
  };

  const events = await queryRelays(filter, userConfig.relays);
  const validNutzaps = [];

  for (const event of events) {
    if (await validateNutzap(event, userConfig)) {
      await redeemNutzap(event, userConfig.privkey);
      validNutzaps.push(event);
    }
  }

  return validNutzaps;
}

async function validateNutzap(event: NostrEvent, config: NutzapConfig): Promise<boolean> {
  // 1. Verify event structure
  if (event.kind !== 9321) return false;

  // 2. Extract and validate proofs
  const proofTags = event.tags.filter(tag => tag[0] === 'proof');
  if (proofTags.length === 0) return false;

  // 3. Verify mint is trusted
  const mintTag = event.tags.find(tag => tag[0] === 'u');
  if (!mintTag || !config.mints.includes(mintTag[1])) return false;

  // 4. Verify P2PK lock to our pubkey
  for (const proofTag of proofTags) {
    const proof = JSON.parse(proofTag[1]);
    if (!isP2PKLockedToUs(proof, config.pubkey)) return false;
  }

  // 5. Verify DLEQ proofs
  for (const proofTag of proofTags) {
    const proof = JSON.parse(proofTag[1]);
    if (!await verifyDLEQProof(proof, mintTag[1])) return false;
  }

  return true;
}
```

### Nutzap Configuration Management
```typescript
// Publishing nutzap configuration (kind 10019)
async function publishNutzapConfig(config: {
  relays: string[];
  mints: string[];
  pubkey: string;
}): Promise<void> {
  const configEvent = {
    kind: 10019,
    content: '',
    tags: [
      ...config.relays.map(relay => ['relay', relay]),
      ...config.mints.map(mint => ['mint', mint]),
      ['pubkey', config.pubkey]
    ],
    created_at: Math.floor(Date.now() / 1000)
  };

  const signedEvent = await signEvent(configEvent);
  await publishToRelays(signedEvent, config.relays);
}

// Fetching nutzap configuration
async function fetchNutzapConfig(userPubkey: string): Promise<NutzapConfig | null> {
  const filter = {
    kinds: [10019],
    authors: [userPubkey],
    limit: 1
  };

  const events = await queryRelays(filter);
  if (events.length === 0) return null;

  const event = events[0];
  return {
    relays: event.tags.filter(tag => tag[0] === 'relay').map(tag => tag[1]),
    mints: event.tags.filter(tag => tag[0] === 'mint').map(tag => tag[1]),
    pubkey: event.tags.find(tag => tag[0] === 'pubkey')?.[1] || ''
  };
}
```

### UI Integration
```tsx
// Nutzap button component
function NutzapButton({ 
  recipient, 
  eventId, 
  amount = 21 
}: {
  recipient: string;
  eventId?: string;
  amount?: number;
}) {
  const [sending, setSending] = useState(false);
  const { sendNutzap } = useNutzaps();

  const handleNutzap = async () => {
    setSending(true);
    try {
      await sendNutzap(recipient, amount, eventId);
      toast.success(`Sent ${amount} sats via nutzap!`);
    } catch (error) {
      toast.error(`Failed to send nutzap: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Button 
      onClick={handleNutzap} 
      disabled={sending}
      variant="ghost" 
      size="sm"
    >
      {sending ? <Loader2 className="animate-spin" /> : <Zap />}
      {amount} sats
    </Button>
  );
}
```

## Security Considerations

**Token Security:**
- **P2PK Locking**: Always lock tokens to recipient's dedicated nutzap pubkey
- **DLEQ Proofs**: Include DLEQ proofs to prevent mint fraud
- **Mint Validation**: Only use mints explicitly trusted by recipient
- **Double-spend Prevention**: Verify tokens before accepting

**Privacy Protection:**
- **Separate Keys**: Use dedicated keypairs for nutzap operations
- **Mint Selection**: Consider using multiple mints for privacy
- **Relay Distribution**: Distribute nutzaps across multiple relays
- **Amount Obfuscation**: Consider amount blinding techniques

**Network Security:**
- **Relay Trust**: Verify relay authenticity and integrity
- **Event Validation**: Validate all nutzap events before processing
- **Rate Limiting**: Implement rate limits to prevent spam
- **Error Handling**: Handle network failures gracefully

## Status

**Implementation Status in ZapTok**: ✅ Fully Implemented

**Details**:
- ✅ Nutzap configuration management (kind 10019) with mint and relay preferences
- ✅ Nutzap event creation and publishing (kind 9321) with P2PK-locked proofs
- ✅ Automatic nutzap detection and redemption for users
- ✅ DLEQ proof verification for security validation
- ✅ Integration with NIP-60 wallets for token management
- ✅ Multi-mint support for enhanced privacy and redundancy
- ✅ Real-time nutzap notifications and processing
- ✅ UI components for sending and receiving nutzaps
- ✅ Transaction history integration with spending records
- ✅ Comprehensive validation for mint compatibility and token authenticity
- ✅ Error handling and retry logic for network resilience
