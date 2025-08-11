NIP-02
======

Contact List and Petnames
--------------------------

`final` `mandatory`

A special event with kind `3`, meaning "contact list" is defined as having a list of `p` tags, one for each of the followed/known profiles one is following.

Each tag entry should contain the key for the profile, a relay URL where events from that key can be found (can be set to an empty string if not needed), and a local name (also called "petname") for that profile (can also be set to an empty string or not provided), i.e., `["p", <32-bytes hex key>, <main relay URL>, <petname>]`.

The `.content` is not used.

## Event Structure

```json
{
  "kind": 3,
  "created_at": <unix timestamp>,
  "tags": [
    ["p", "91cf9..4e5ca", "wss://alicerelay.com/", "alice"],
    ["p", "14aeb..8dad4", "wss://bobrelay.com/nostr", "bob"],
    ["p", "612ae..e610f", "ws://carolrelay.com/ws", "carol"]
  ],
  "content": "",
  ...
}
```

## Tag Format

The `p` tag format for contact list entries:

```
["p", <pubkey>, <relay_url>, <petname>]
```

- **pubkey** (required): 32-byte hex public key of the contact
- **relay_url** (optional): Primary relay URL for this contact (can be empty string)  
- **petname** (optional): Local nickname/display name for this contact (can be empty string)

## Usage Guidelines

### Contact Management
- **One contact list per user**: Each user should maintain a single kind 3 event
- **Replaceable event**: Newer contact lists replace older ones
- **Complete list**: Each contact list should contain all current contacts
- **Idempotent updates**: Safe to republish the same contact list

### Relay Hints
- **Primary relay**: Include the main relay where this contact is most active
- **Optional field**: Can be empty string if no specific relay preference
- **Client discovery**: Helps clients find events from contacts more efficiently
- **Not authoritative**: Contacts may use other relays not listed

### Petnames
- **Local names**: Personal nicknames that don't affect global namespace
- **Privacy friendly**: Local-only, not shared with the contact
- **Display enhancement**: Improves user experience with familiar names
- **Collision safe**: Multiple users can have same petname for different contacts

## Client Implementation

### Publishing Contact Lists

```typescript
// Create and publish contact list
async function publishContactList(contacts: Contact[]): Promise<void> {
  const tags = contacts.map(contact => [
    'p',
    contact.pubkey,
    contact.relay || '',
    contact.petname || ''
  ]);

  const event = {
    kind: 3,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: ''
  };

  const signedEvent = await signEvent(event);
  await publishEvent(signedEvent);
}
```

### Reading Contact Lists

```typescript
// Fetch and parse contact list
async function getContactList(pubkey: string): Promise<Contact[]> {
  const filter = {
    kinds: [3],
    authors: [pubkey],
    limit: 1
  };

  const events = await queryEvents(filter);
  if (!events.length) return [];

  const latestEvent = events[0];
  return latestEvent.tags
    .filter(tag => tag[0] === 'p')
    .map(tag => ({
      pubkey: tag[1],
      relay: tag[2] || null,
      petname: tag[3] || null
    }));
}
```

### Contact Operations

```typescript
// Add contact to list
function addContact(
  currentContacts: Contact[],
  newContact: Contact
): Contact[] {
  const exists = currentContacts.find(c => c.pubkey === newContact.pubkey);
  if (exists) {
    // Update existing contact
    return currentContacts.map(c =>
      c.pubkey === newContact.pubkey ? { ...c, ...newContact } : c
    );
  } else {
    // Add new contact
    return [...currentContacts, newContact];
  }
}

// Remove contact from list
function removeContact(
  currentContacts: Contact[],
  pubkeyToRemove: string
): Contact[] {
  return currentContacts.filter(c => c.pubkey !== pubkeyToRemove);
}
```

## Following/Followers Implementation

### Following Detection
```typescript
// Check if user A follows user B
async function isFollowing(userA: string, userB: string): Promise<boolean> {
  const contacts = await getContactList(userA);
  return contacts.some(contact => contact.pubkey === userB);
}

// Get all users that a given user follows
async function getFollowing(pubkey: string): Promise<string[]> {
  const contacts = await getContactList(pubkey);
  return contacts.map(contact => contact.pubkey);
}
```

### Followers Discovery
```typescript
// Find followers by scanning contact lists
async function getFollowers(pubkey: string): Promise<string[]> {
  const filter = {
    kinds: [3],
    '#p': [pubkey]
  };

  const events = await queryEvents(filter);
  return events.map(event => event.pubkey);
}

// Get mutual connections
async function getMutualFollows(userA: string, userB: string): Promise<string[]> {
  const [followingA, followingB] = await Promise.all([
    getFollowing(userA),
    getFollowing(userB)
  ]);

  return followingA.filter(pubkey => followingB.includes(pubkey));
}
```

## Social Graph Operations

### Network Analysis
```typescript
// Calculate follow metrics
interface FollowMetrics {
  following: number;
  followers: number;
  mutualFollows: number;
  followRatio: number;
}

async function calculateFollowMetrics(
  userPubkey: string,
  currentUserPubkey?: string
): Promise<FollowMetrics> {
  const [following, followers, mutualFollows] = await Promise.all([
    getFollowing(userPubkey),
    getFollowers(userPubkey),
    currentUserPubkey ? getMutualFollows(userPubkey, currentUserPubkey) : []
  ]);

  return {
    following: following.length,
    followers: followers.length,
    mutualFollows: mutualFollows.length,
    followRatio: followers.length / Math.max(following.length, 1)
  };
}
```

### Contact Synchronization
```typescript
// Sync contact list across devices
async function syncContactList(): Promise<void> {
  const localContacts = await getLocalContactList();
  const remoteContacts = await getContactList(getCurrentUserPubkey());

  // Merge contacts, preferring local updates
  const merged = mergeContactLists(localContacts, remoteContacts);
  
  if (contactListChanged(localContacts, merged)) {
    await publishContactList(merged);
    await saveLocalContactList(merged);
  }
}

function mergeContactLists(local: Contact[], remote: Contact[]): Contact[] {
  const combined = new Map<string, Contact>();

  // Add remote contacts first
  remote.forEach(contact => {
    combined.set(contact.pubkey, contact);
  });

  // Override with local contacts (local takes precedence)
  local.forEach(contact => {
    combined.set(contact.pubkey, contact);
  });

  return Array.from(combined.values());
}
```

## Privacy Considerations

### Petname Privacy
- **Local only**: Petnames are not shared with contacts or other users
- **Client storage**: Store petnames locally, not in the published event
- **Optional sharing**: Some clients may allow petname sharing as separate feature
- **Respect boundaries**: Don't assume petnames indicate real-world relationships

### Contact List Privacy
- **Public by default**: Contact lists are publicly visible events
- **Consider implications**: Following patterns reveal social connections
- **Selective sharing**: Some clients may support private contact lists
- **Relay selection**: Choose relays carefully for contact list publication

### Social Graph Analysis
- **Data mining concerns**: Public contact lists enable network analysis
- **Correlation attacks**: Following patterns can be used for identification
- **Recommend privacy**: Educate users about contact list visibility
- **Client options**: Consider providing privacy-focused contact management

## Performance Optimization

### Caching Strategies
```typescript
// Efficient contact list caching
class ContactListCache {
  private cache = new Map<string, { contacts: Contact[], timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getContactList(pubkey: string): Promise<Contact[]> {
    const cached = this.cache.get(pubkey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.contacts;
    }

    const contacts = await fetchContactList(pubkey);
    this.cache.set(pubkey, { contacts, timestamp: now });
    return contacts;
  }

  invalidate(pubkey: string): void {
    this.cache.delete(pubkey);
  }
}
```

### Batch Operations
```typescript
// Batch fetch multiple contact lists
async function batchGetContactLists(pubkeys: string[]): Promise<Map<string, Contact[]>> {
  const filter = {
    kinds: [3],
    authors: pubkeys
  };

  const events = await queryEvents(filter);
  const result = new Map<string, Contact[]>();

  // Group events by author and take most recent
  const latestEvents = new Map<string, any>();
  events.forEach(event => {
    const current = latestEvents.get(event.pubkey);
    if (!current || event.created_at > current.created_at) {
      latestEvents.set(event.pubkey, event);
    }
  });

  // Parse contact lists
  latestEvents.forEach((event, pubkey) => {
    const contacts = parseContactTags(event.tags);
    result.set(pubkey, contacts);
  });

  return result;
}
```

## Error Handling

### Validation
```typescript
// Validate contact list event
function validateContactList(event: any): boolean {
  if (event.kind !== 3) return false;
  if (event.content !== '') return false;
  
  // Validate p tags
  for (const tag of event.tags) {
    if (tag[0] === 'p') {
      if (!tag[1] || typeof tag[1] !== 'string') return false;
      if (!/^[0-9a-f]{64}$/i.test(tag[1])) return false;
      if (tag[2] && typeof tag[2] !== 'string') return false;
      if (tag[3] && typeof tag[3] !== 'string') return false;
    }
  }
  
  return true;
}
```

### Recovery Strategies
```typescript
// Handle corrupted contact lists
async function recoverContactList(pubkey: string): Promise<Contact[]> {
  try {
    return await getContactList(pubkey);
  } catch (error) {
    console.warn('Contact list recovery needed:', error);
    
    // Try to recover from backup
    const backup = await getBackupContactList(pubkey);
    if (backup) return backup;
    
    // Fallback to empty list
    return [];
  }
}
```

## Migration and Compatibility

### Legacy Format Support
```typescript
// Handle legacy contact list formats
function parseContactTags(tags: string[][]): Contact[] {
  return tags
    .filter(tag => tag[0] === 'p')
    .map(tag => ({
      pubkey: tag[1],
      relay: tag[2] || null,
      petname: tag[3] || null
    }))
    .filter(contact => contact.pubkey && /^[0-9a-f]{64}$/i.test(contact.pubkey));
}
```

## Best Practices

### For Client Developers
1. **Validate thoroughly**: Always validate pubkeys and tag formats
2. **Cache wisely**: Implement appropriate caching with invalidation
3. **Handle errors**: Graceful fallbacks for corrupted contact lists
4. **Respect privacy**: Consider contact list visibility implications
5. **Sync carefully**: Merge local and remote contact lists intelligently

### For Users
1. **Review carefully**: Understand that contact lists are public
2. **Update regularly**: Keep contact lists current for best experience
3. **Use petnames**: Personalize your contact experience with local names
4. **Consider privacy**: Be aware of social graph visibility

## Related NIPs

- **NIP-01**: Basic event structure and validation
- **NIP-19**: Bech32 encoding for sharing contact references
- **NIP-05**: DNS verification (complements contact identification)
- **NIP-65**: Relay list metadata (enhances relay discovery)

## Status

**Implementation Status in ZapTok**: ✅ Fully Implemented

**Details**:
- ✅ Contact list publishing and reading (kind 3)
- ✅ Following/followers detection and metrics
- ✅ Petname support for local contact naming
- ✅ Relay hints for efficient contact discovery
- ✅ Social graph analysis and mutual connections
- ✅ Contact list caching and performance optimization
- ✅ Contact management UI (follow/unfollow buttons)
- ✅ Following list modal with contact details
- ✅ Contact list synchronization across devices
- ✅ Privacy-conscious implementation with user education
