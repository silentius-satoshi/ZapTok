NIP-01
======

Basic protocol flow description
-------------------------------

`mandatory` `final`

For most applications, the core protocol flow will be driven by a feedback loop, where users request data from relays, and relays respond with their data, and users then decide whether to:
- a) change their request to get more data from the same relay
- b) change their request to get different data from the same relay
- c) change their request to get the same or different data from a different relay

This is analogous to how HTTP works with web servers, except this is subscription-based, which means the information will be immediately sent to the user once it's available instead of the user having to continuously polling for it.

## Events and signatures

Each user has a keypair. Signatures, public keys, and encodings are done according to the [Schnorr signatures standard for the curve `secp256k1`](https://bips.xyz/340).

The only object type that exists is the **event**, which has the following format on the wire:

```json
{
  "id": <32-bytes lowercase hex-encoded sha256 of the serialized event data>,
  "pubkey": <32-bytes lowercase hex-encoded public key of the event creator>,
  "created_at": <unix timestamp in seconds>,
  "kind": <integer between 0 and 65535>,
  "tags": [
    [<arbitrary string>...],
    // ...
  ],
  "content": <arbitrary string>,
  "sig": <64-bytes lowercase hex-encoded signature of the sha256 hash of the serialized event data, which is the same as the "id" field>
}
```

To obtain the **event.id**, we:
1. Serialize the event using JSON with keys in a specific order: `[0, event.pubkey, event.created_at, event.kind, event.tags, event.content]`
2. UTF-8 encode the result
3. Compute the SHA-256 hash
4. Encode as lowercase hex

To obtain the **event.sig**, we sign the **event.id** (which is the hash) with the private key and encode the result as lowercase hex.

Events can have a `kind` between `0` and `65535`. This NIP defines no specific kinds, they are detailed in other NIPs.

### Tags

Tags are an array of arrays of arbitrary strings, with some conventions around them. The first element of the tag array is referred to as the tag **name** or **key** and the second as the tag **value**. So tags with an empty tag array, e.g. `["sometag"]`, are valid. Tags array can be empty.

### Event Kinds

Event kinds are classified into ranges:
- for kind `n` such that `1000 <= n < 10000`, events are **regular** which means they're all expected to be stored by relays.
- for kind `n` such that `10000 <= n < 20000` **or** `n == 0 || n == 3`, events are **replaceable**, which means that, for each combination of `pubkey` and `kind`, only the latest one is expected to be stored by relays, older versions are expected to be discarded.
- for kind `n` such that `20000 <= n < 30000`, events are **ephemeral**, which means they are not expected to be stored by relays.
- for kind `n` such that `30000 <= n < 40000`, events are **parameterized replaceable**, which means that, for each combination of `pubkey`, `kind` and the `d` tag's first value, only the latest one is expected to be stored by relays, older versions are expected to be discarded.

These are just conventions and relay implementations may differ.

### Content

The `content` field is arbitrary and can contain anything, but in most cases it will be a string of some kind. For structured data, JSON is recommended but not required.

## Communication between clients and relays

Relays expose a websocket endpoint to which clients can connect. Clients SHOULD open a single websocket connection to each relay and use it for all their subscriptions and event publishing.

### From client to relay: sending events and creating subscriptions

Clients can send 3 types of messages, which must be JSON arrays, according to the following patterns:

  * `["EVENT", <event JSON as defined above>]`, used to publish events.
  * `["REQ", <subscription_id>, <filters1>, <filters2>, ...]`, used to request events and subscribe to new updates.
  * `["CLOSE", <subscription_id>]`, used to stop previous subscriptions.

`<subscription_id>` is an arbitrary, non-empty string of max length 64 chars. It represents a subscription per connection. Relays MUST manage `<subscription_id>`s independently for each WebSocket connection; the same `<subscription_id>` can be used on other connections without interference.

`<filtersX>` is a JSON object that determines what events will be sent in that subscription, it can have the following attributes:

```json
{
  "ids": <a list of event ids>,
  "authors": <a list of lowercase pubkeys, the pubkey of an event must be one of these>,
  "kinds": <a list of a kind numbers>,
  "#<single-letter (a-zA-Z)>": <a list of tag values, for #e — a list of event ids, for #p — a list of pubkeys, etc.>,
  "since": <an integer unix timestamp in seconds, events must be newer than this to pass>,
  "until": <an integer unix timestamp in seconds, events must be older than this to pass>,
  "limit": <maximum number of events to return in the initial query>
}
```

Upon receiving a `REQ` message, the relay SHOULD query its internal database and return events that match the filter, then store that filter and send again all future events it receives that match it. The `CLOSE` message SHOULD stop that previous subscription.

Filter attributes containing lists (`ids`, `authors`, `kinds` and tag filters like `#e`) are JSON arrays with one or more values.  The `ids`, `authors`, `kinds` and tag filter lists are OR'd together and the individual filters are AND'd together. A single filter may define multiple attribute. The `limit` property of a filter is only valid for the initial query and MUST be ignored afterwards. When `limit: n` is present it is assumed that the events returned in the initial query will be the last `n` events ordered by the `created_at`. It is safe to return less events than `limit` specifies, but it is expected that relays do not return (much) more events than requested so clients don't get unnecessarily overwhelmed by data.

### From relay to client: sending events and notices

Relays can send 5 types of messages, which must also be JSON arrays, according to the following patterns:

  * `["EVENT", <subscription_id>, <event JSON as defined above>]`, used to send events requested by clients.
  * `["OK", <event_id>, <true|false>, <message>]`, used to indicate acceptance or denial of an `EVENT` message.
  * `["EOSE", <subscription_id>]`, used to indicate the **end of stored events** and the beginning of events newly received in real-time.
  * `["CLOSED", <subscription_id>, <message>]`, used to indicate that a subscription was ended on the relay side.
  * `["NOTICE", <message>]`, used to send human-readable error messages or other things to clients.

This NIP defines no rules for how `NOTICE` messages should be sent or treated.

`OK` messages SHOULD be sent in response to `EVENT` messages received from clients, they provide feedback about whether an event was accepted or rejected. The `<message>` field SHOULD provide more information about the decision that was made and SHOULD start with a machine-readable single-word prefix followed by a colon, as described below.

Machine-readable prefixes that SHOULD be used:
  * `duplicate:` — the event already exists
  * `pow:` — insufficient proof-of-work
  * `blocked:` — the pubkey or network address has been blocked or rate-limited
  * `rate-limited:` — the client has reached some kind of rate limit
  * `invalid:` — the event is invalid and could not be saved
  * `restricted:` — the relay does not allow this event kind
  * `mute:` — the pubkey has been muted

`CLOSED` messages SHOULD be sent in response to a `REQ` when the relay refuses to fulfill it. It can also be sent when a relay decides to kill a subscription on its side before a client has disconnected or sent a `CLOSE`. This message uses the same machine-readable prefixes as `OK`.

### Relay-side event handling

When a relay receives an `EVENT` message from a client, it SHOULD attempt to verify:
- That the signature is valid according to the Schnorr signature standard
- That the event is not a duplicate of an event it has already seen
- That the event `id` field is the SHA256 of the serialized event
- That the event is of a kind it will accept

If the verification fails the relay MUST send an `OK` message back with a `false` status and the appropriate machine-readable prefix describing the issue.

If the verification succeeds, the relay MUST also send back an `OK` message with a `true` status. The relay can then store the event and forward it to all clients that have requested events matching the event with active subscriptions.

## Basic Event Kinds

  - `0`: **metadata**: the `content` is set to a stringified JSON object `{name: <username>, about: <string>, picture: <url>, ...}` describing the user who created the event. A relay may delete older events once a new one comes in.
  - `1`: **text note**: the `content` is set to the **plaintext** content of a note (anything the user wants to say). Content that must be parsed, such as Markdown and HTML, should not be used. Clients should also not parse content as those.
  - `7`: **reaction**: a "reaction" to another event. The `content` may contain a "reaction" emoji, and it MUST contain `e` and `p` tags like this example:

```json
{
  "kind": 7,
  "content": "+",
  "tags": [
    ["e", "b1a649ebe8b435ec71d3784793f3bbf4b93e64e17568a741aecd4c7ddeafce30"],
    ["p", "79c2cae114ea28a981e7559b4fe7854a473521a8d22a66bbab9fa248eb820ff6"]
  ],
  "pubkey": "79c2cae114ea28a981e7559b4fe7854a473521a8d22a66bbab9fa248eb820ff6",
  "created_at": 1682630000
}
```

The `content` MAY be an emoji, or [NIP-30](30.md) custom emoji, or other reaction content. The client should display this content when showing the reaction on the event. If the `content` is an empty string then the client may display some other indicator like a heart icon.

Tags reference an `e` event being reacted to and `p` pubkey whose event is being reacted to (and will be notified). The `e` tag and `p` tag can each be omitted if using [NIP-10](10.md) tagged mentions. Using [NIP-10](10.md) tags, an `e` tag SHOULD be marked with `"reply"` marker. Any `e` tags labeled `"mention"` are person or events mentioned in the reaction, and any `p` tags labeled `"mention"` are persons mentioned in the reaction.

## Implementation Notes

### Event ID Generation
The event ID is generated by:
1. Creating a JSON array: `[0, pubkey, created_at, kind, tags, content]`
2. Serializing to UTF-8 bytes
3. Computing SHA-256 hash
4. Encoding as lowercase hexadecimal

### Signature Generation  
The signature is generated by:
1. Taking the event ID (32-byte hash)
2. Signing with Schnorr signature algorithm using secp256k1
3. Encoding as lowercase hexadecimal (64 bytes)

### Tag Conventions
- **Single-letter tags**: `e`, `p`, `t`, `r`, `a`, `d`, etc.
- **Multi-character tags**: `nonce`, `subject`, `client`, `title`, etc.
- **Indexable tags**: Only single-letter tags are indexed by relays
- **Tag structure**: `["name", "value", "relay", "marker", ...]`

### Filter Best Practices
- **Use limits**: Always specify reasonable limits to avoid overwhelming
- **Combine filters**: Use multiple filter objects for complex queries
- **Efficient queries**: Prefer specific authors/kinds over broad searches
- **Relay-level filtering**: Use indexed tags for better performance

## Security Considerations

### Event Validation
- **Signature verification**: Always verify Schnorr signatures
- **ID validation**: Ensure event ID matches computed hash
- **Timestamp checks**: Validate reasonable timestamp ranges
- **Kind validation**: Check kind ranges and permissions

### DoS Protection
- **Rate limiting**: Implement per-connection rate limits
- **Size limits**: Enforce maximum event and filter sizes
- **Subscription limits**: Limit active subscriptions per connection
- **Content filtering**: Filter spam and malicious content

## Related NIPs
- **NIP-02**: Contact lists and petnames
- **NIP-05**: Mapping Nostr keys to DNS identifiers  
- **NIP-07**: Browser extension interface
- **NIP-19**: bech32-encoded entities
- **NIP-25**: Reactions (extends basic reaction format)

## Status

**Implementation Status in ZapTok**: ✅ Fully Implemented

**Details**:
- ✅ Event structure validation
- ✅ WebSocket communication  
- ✅ Event signing and verification
- ✅ Filter queries
- ✅ Basic event kinds (0, 1, 7)
- ✅ Tag processing
- ✅ Relay message handling
- ✅ Subscription management
