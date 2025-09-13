export const Kind = {
  Metadata: 0,
  Text: 1,
  RecommendRelay: 2,
  Contacts: 3,
  EventDeletion: 5,
  Repost: 6,
  Reaction: 7,
  Blossom: 10063,
  // Add other kinds as needed
} as const;

// ZapTok developer configuration
export const ZAPTOK_CONFIG = {
  // Replace with actual developer pubkey
  DEV_PUBKEY: '3f9296e008ada9a328d176d7fe69d6ebb82dd2d47305229de17f1868e6da5a3d',
  // Replace with actual Lightning address
  LIGHTNING_ADDRESS: 'zaptok@strike.me',
  // Default relay for NIP-57 zaps
  DEFAULT_RELAY_URL: 'wss://relay.nostr.band',
  // Donation preset amounts in sats
  DONATION_PRESETS: [21, 77, 210, 777, 1000, 2100, 5000, 10000, 21000, 50000, 100000, 210000],
} as const;

// Big relay URLs for zap requests (following Jumble's pattern)
export const BIG_RELAY_URLS = [
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://relay.primal.net'
];

// Pubkeys for ZapTok (following Jumble's naming convention)
export const CODY_PUBKEY = '3f9296e008ada9a328d176d7fe69d6ebb82dd2d47305229de17f1868e6da5a3d'; // ZapTok dev pubkey
export const JUMBLE_PUBKEY = '3f9296e008ada9a328d176d7fe69d6ebb82dd2d47305229de17f1868e6da5a3d'; // Same for now, can be changed later