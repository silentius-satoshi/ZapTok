# Nostr-Native User Research & Early Access Collection

## Overview

This document outlines a proposed implementation for collecting user feedback, early access requests, and feature interest using native Nostr events instead of traditional centralized approaches. This would make ZapTok one of the first applications to leverage the decentralized Nostr network for user research and community engagement.

## Current State

The Pro Mode page currently stores early access signups and feedback in localStorage only, which means:
- Data is not accessible to developers
- No way to notify users when features are ready
- No analytics or insights into user demand

## Proposed Nostr-Native Solution

### Core Concept

Use Nostr's parameterized replaceable events to store user interest and feedback in a decentralized, user-controlled manner while still allowing ZapTok to collect insights and engage with interested users.

### Implementation Approaches

#### Approach 1: Custom Parameterized Replaceable Events (Recommended)

**Event Structure:**
```typescript
const ZAPTOK_PRO_INTEREST_KIND = 30100; // Custom kind for ZapTok Pro interest

await createEvent({
  kind: ZAPTOK_PRO_INTEREST_KIND,
  content: JSON.stringify({
    email: email.trim(), // Optional
    feedback: feedback.trim(),
    features_interested: ["advanced-compression", "batch-processing", "export"],
    timestamp: new Date().toISOString(),
    app_version: "1.0.0",
    user_context: {
      is_content_creator: true,
      primary_use_case: "social_media"
    }
  }),
  tags: [
    ["d", "pro-mode-interest"], // Makes it replaceable per user
    ["t", "zaptok-pro"],
    ["t", "early-access"],
    ["t", "video-compression"],
    ["alt", "ZapTok Pro Mode early access interest"],
    ["client", "ZapTok"]
  ]
});
```

**Benefits:**
- User controls their own data
- Replaceable (users can update preferences)
- Queryable by ZapTok developers
- Follows Nostr best practices
- No central database required

#### Approach 2: Encrypted Direct Messages

**Event Structure:**
```typescript
const zapTokPubkey = "npub1zaptok..."; // Dedicated ZapTok collection pubkey

const encryptedContent = await user.signer.nip44.encrypt(zapTokPubkey, JSON.stringify({
  type: "pro-mode-interest",
  email: email.trim(),
  feedback: feedback.trim(),
  timestamp: new Date().toISOString(),
  userPubkey: user.pubkey
}));

await createEvent({
  kind: 4, // Encrypted DM (NIP-04) or kind 1059 (Gift Wrap)
  content: encryptedContent,
  tags: [["p", zapTokPubkey]]
});
```

**Benefits:**
- Complete privacy through encryption
- Direct communication channel
- Uses existing NIP-04/NIP-44 infrastructure

**Drawbacks:**
- Less semantic fit (DMs aren't really for this use case)
- Harder to query and analyze

#### Approach 3: Hybrid Anonymous + Authenticated

**For Logged-in Users:**
```typescript
// Use parameterized replaceable event
await createEvent({
  kind: ZAPTOK_PRO_INTEREST_KIND,
  content: JSON.stringify({ email, feedback, timestamp }),
  tags: [["d", "pro-mode-interest"], ["t", "zaptok-pro"]]
});
```

**For Anonymous Users:**
```typescript
// Create temporary keypair or fall back to traditional form service
const tempKeypair = generateSecretKey();
// Create event with temporary identity
// OR fallback to Formspree/similar service
```

## Technical Implementation

### Frontend Integration

**Form Handler:**
```typescript
const handleInterestSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!user) {
    toast({
      title: 'Please log in',
      description: 'Connect your Nostr account to express interest in Pro features.',
    });
    return;
  }

  try {
    await createEvent({
      kind: ZAPTOK_PRO_INTEREST_KIND,
      content: JSON.stringify({
        email: email.trim(),
        feedback: feedback.trim(),
        timestamp: new Date().toISOString(),
        features_interested: getSelectedFeatures()
      }),
      tags: [
        ["d", "pro-mode-interest"],
        ["t", "zaptok-pro"],
        ["t", "early-access"],
        ["alt", "ZapTok Pro Mode early access interest"],
        ["client", "ZapTok"]
      ]
    });

    setIsSubmitted(true);
    toast({
      title: 'Interest recorded on Nostr!',
      description: 'Your Pro Mode interest has been saved to the decentralized network.',
    });
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to record interest. Please try again.',
      variant: 'destructive'
    });
  }
};
```

### Data Collection Script

**Querying Interest Events:**
```typescript
// Collect all pro mode interest events
async function collectProModeInterest() {
  const interests = await nostr.query([{
    kinds: [ZAPTOK_PRO_INTEREST_KIND],
    "#t": ["zaptok-pro"],
    limit: 1000
  }]);

  const analytics = {
    total_interested: interests.length,
    emails_provided: 0,
    top_features: {},
    feedback_themes: []
  };

  interests.forEach(event => {
    try {
      const data = JSON.parse(event.content);
      
      if (data.email) {
        analytics.emails_provided++;
      }
      
      // Analyze feedback for common themes
      if (data.feedback) {
        analytics.feedback_themes.push({
          pubkey: event.pubkey,
          feedback: data.feedback,
          timestamp: data.timestamp
        });
      }
      
      // Track feature interest
      if (data.features_interested) {
        data.features_interested.forEach(feature => {
          analytics.top_features[feature] = (analytics.top_features[feature] || 0) + 1;
        });
      }
    } catch (error) {
      console.warn('Failed to parse interest event:', event.id);
    }
  });

  return analytics;
}
```

### User Notification System

**When Pro Features Are Ready:**
```typescript
async function notifyInterestedUsers() {
  const interests = await collectProModeInterest();
  
  // Method 1: Send encrypted notifications
  for (const event of interests) {
    const data = JSON.parse(event.content);
    if (data.email) {
      await sendEncryptedNotification(event.pubkey, {
        type: "pro-mode-available",
        message: "ZapTok Pro Mode features are now available!",
        features: ["advanced-compression", "batch-processing"],
        upgrade_url: "https://zaptok.app/pro"
      });
    }
  }
  
  // Method 2: Public announcement
  await createEvent({
    kind: 1,
    content: "🚀 ZapTok Pro Mode is now LIVE! Advanced video compression features are available for all users who expressed early interest. #ZapTokPro #VideoCompression #Nostr",
    tags: [
      ["t", "zaptok-pro-launch"],
      ["t", "zaptok"],
      ["t", "video-compression"]
    ]
  });
}
```

## Privacy & User Control

### Data Ownership
- Users own their interest events
- Can delete or update preferences at any time
- No central database storing personal information
- Email addresses encrypted in event content

### Pseudonymous Participation
- Users can participate with just their Nostr identity
- No requirement to provide real-world contact information
- Feedback tied to pubkey, not personal identity

### Transparency
- All events publicly queryable (content may be encrypted)
- Open source collection and analysis scripts
- Users can see exactly what data is being collected

## Benefits of Nostr-Native Approach

### For Users
- **Control**: Own and control their data
- **Privacy**: Encrypted or pseudonymous participation
- **Portability**: Data not locked in ZapTok's systems
- **Transparency**: Can see what data is collected

### For ZapTok
- **Innovation**: First app to use Nostr for user research
- **Community**: Deeper integration with Nostr ecosystem
- **Insights**: Rich, queryable feedback data
- **Engagement**: Direct communication channel with users

### For Nostr Ecosystem
- **Use Case**: Demonstrates Nostr beyond social media
- **Adoption**: Shows practical business applications
- **Tooling**: Creates patterns other apps can follow

## Implementation Phases

### Phase 1: Basic Interest Collection
- Implement parameterized replaceable events
- Simple form integration
- Basic querying script

### Phase 2: Enhanced Analytics
- Structured feature interest tracking
- Feedback sentiment analysis
- User engagement metrics

### Phase 3: Notification System
- Encrypted user notifications
- Public announcement events
- Community engagement features

### Phase 4: Advanced Features
- Anonymous participation support
- Real-time interest tracking
- Community voting on features

## Technical Considerations

### Kind Number Selection
- Use custom kind in 30000-39999 range (addressable/replaceable)
- Coordinate with NIP registry to avoid conflicts
- Document in project NIP.md file
- Generate unique kind using: `mcp_nostr_generate_kind({ range: "addressable" })`

### NIP Development Process
1. **Research existing NIPs**: Use `mcp_nostr_read_nips_index` to check for existing solutions
2. **Generate custom kind**: Use `mcp_nostr_generate_kind` for new kind number
3. **Document in NIP.md**: Create or update project's NIP documentation
4. **Event validation**: Implement validator functions for required tags/content

### Relay Strategy
- Ensure events published to major relays (relay.nostr.band, relay.damus.io, nos.lol)
- Consider dedicated ZapTok relay for reliability
- Monitor relay acceptance of custom kinds
- Implement relay-level filtering: `#t: ["zaptok-pro"]` for efficient queries
- Use multiple relays to prevent data loss

### Event Publishing Implementation
```typescript
// Hook integration with existing useNostrPublish
const { mutate: createEvent } = useNostrPublish();

const publishInterestEvent = async (interestData) => {
  try {
    await createEvent({
      kind: ZAPTOK_PRO_INTEREST_KIND,
      content: JSON.stringify(interestData),
      tags: [
        ["d", "pro-mode-interest"], // Replaceable per user
        ["t", "zaptok-pro"],        // Relay-indexed category
        ["t", "early-access"],      // Additional category
        ["alt", "ZapTok Pro Mode early access interest"], // NIP-31 alt text
        ["client", "ZapTok"]        // Client identification
      ]
    });
  } catch (error) {
    // Fallback to localStorage
    console.warn('Nostr publish failed, using localStorage fallback');
    localStorage.setItem('zaptok-pro-interest', JSON.stringify(interestData));
    throw error;
  }
};
```

### Error Handling & Fallbacks
- Graceful fallback to localStorage if Nostr fails
- Clear user feedback on success/failure states
- Retry mechanisms for network issues
- Handle relay connection timeouts
- Validate event structure before publishing

### Data Migration Strategy
```typescript
// Migrate existing localStorage data to Nostr
async function migrateLocalStorageToNostr() {
  const localData = localStorage.getItem('zaptok-pro-interest');
  if (localData && user.pubkey) {
    try {
      const interests = JSON.parse(localData);
      
      for (const interest of interests) {
        await publishInterestEvent({
          ...interest,
          migrated_from_localStorage: true,
          migration_timestamp: new Date().toISOString()
        });
      }
      
      // Clear localStorage after successful migration
      localStorage.removeItem('zaptok-pro-interest');
    } catch (error) {
      console.warn('Migration failed:', error);
    }
  }
}
```

### Authentication Integration
```typescript
// Require user login for Nostr events
const { user } = useCurrentUser();

if (!user) {
  // Show login prompt or fallback to anonymous collection
  return <LoginPrompt message="Connect your Nostr account to join Pro Mode early access" />;
}
```

### Query Optimization
```typescript
// Efficient querying with proper filters
const queryUserResearch = async () => {
  return await nostr.query([
    {
      kinds: [ZAPTOK_PRO_INTEREST_KIND],
      "#t": ["zaptok-pro"],           // Relay-level filter
      "#d": ["pro-mode-interest"],    // Specific identifier
      limit: 500,                     // Reasonable limit
      since: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Last 30 days
    }
  ], { 
    signal: AbortSignal.timeout(5000) // 5 second timeout
  });
};
```

### Event Validation
```typescript
// Validate interest events before processing
function validateInterestEvent(event: NostrEvent): boolean {
  // Check kind
  if (event.kind !== ZAPTOK_PRO_INTEREST_KIND) return false;
  
  // Check required tags
  const dTag = event.tags.find(([name]) => name === 'd')?.[1];
  const hasZapTokTag = event.tags.some(([name, value]) => name === 't' && value === 'zaptok-pro');
  
  if (!dTag || dTag !== 'pro-mode-interest' || !hasZapTokTag) return false;
  
  // Validate content structure
  try {
    const content = JSON.parse(event.content);
    return content.timestamp && typeof content.feedback === 'string';
  } catch {
    return false;
  }
}
```

### Security Considerations
- Validate all event content before processing
- Sanitize user input in feedback fields
- Implement rate limiting for event publishing
- Monitor for spam or abuse patterns
- Consider content moderation for public events

### Performance Optimization
- Cache query results to avoid repeated relay requests
- Implement pagination for large result sets
- Use background workers for heavy analytics processing
- Optimize JSON parsing and validation
- Batch process multiple events efficiently

## Future Extensions

### Community Features
- Public feature request voting
- Community discussion events
- Beta tester recruitment

### Analytics Integration
- Nostr-native analytics events
- Usage pattern tracking
- Performance feedback collection

### Cross-App Collaboration
- Standardized user research event kinds
- Shared feedback pools across Nostr apps
- Community-driven feature prioritization

## Conclusion

This Nostr-native approach would position ZapTok as an innovator in decentralized user research while providing valuable insights for product development. It aligns with the platform's decentralized philosophy and creates new possibilities for community-driven feature development.

The implementation can start simple (basic interest collection) and evolve into a comprehensive community engagement system that other Nostr applications could adopt and standardize.
