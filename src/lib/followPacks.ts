// Categorized follow pack definitions for onboarding, inspired by Primal's approach.
// Future enhancement: fetch dynamic starter packs (kinds 39089 / 39092) via NIP-51.

export interface FollowPackAccount {
  pubkey: string; // hex pubkey
  name?: string;  // display name or handle
  nip05?: string; // nip05 identifier if available
  about?: string; // optional description
}

export interface FollowPack {
  id: string; // internal identifier
  title: string;
  description: string;
  accounts: FollowPackAccount[];
  category: 'bitcoin' | 'art' | 'tech' | 'finance' | 'food' | 'general';
  kind?: 39089 | 39092; // potential future mapping
}

// Real pubkeys from notable Nostr accounts (hex format)
export const FOLLOW_PACKS: FollowPack[] = [
  {
    id: 'bitcoin-pack',
    title: 'Bitcoin',
    description: 'Bitcoin developers, educators, and thought leaders',
    category: 'bitcoin',
    accounts: [
      { pubkey: '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2', name: 'jack', nip05: 'jack@cash.app' },
      { pubkey: '04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9', name: 'ODELL', nip05: 'odell@primal.net' },
      { pubkey: 'e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411', name: 'Gigi', nip05: 'gigi@primal.net' },
      { pubkey: 'eab0e756d32b80bcd464f3d844b8040303075a13eabc3599a762c9ac7ab91f4f', name: 'Lyn Alden', nip05: 'lyn@primal.net' },
      { pubkey: '85080d3bad70ccdcd7f74c29a44f55bb85cbcd3dd0cbb957da1d215bdb931204', name: 'preston', nip05: 'preston@primal.net' },
      { pubkey: '472f440f29ef996e92a186b8d320ff180c855903882e59d50de1b8bd5669301e', name: 'Marty Bent', nip05: 'martysbent@fountain.fm' },
      { pubkey: 'ef0c41ff10d2b9c5cd443abeb1d5a093ad9be1fd97a24b46b7a9eff5862ed14b', name: 'Jeff Booth', nip05: 'jeffbooth@primal.net' },
      { pubkey: '4379e76bfa76a80b8db9ea759211d90bb3e67b2202f8880cc4f5ffe2065061ad', name: 'Saifedean Ammous', nip05: 'saif@primal.net' }
    ]
  },
  {
    id: 'art-pack',
    title: 'Art & Creativity',
    description: 'Artists, designers, and creative minds on Nostr',
    category: 'art',
    accounts: [
      { pubkey: '6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93', name: 'Sebastien', nip05: 'sebastien@iris.to' },
      { pubkey: '1bc70a0148b3f316da33fe3c89f23e3e71ac4ff998027ec712b905cd24f6a411', name: 'miljan', nip05: 'miljan@primal.net' },
      { pubkey: 'c48e29f04b482cc01ca1f9ef8c86ef8318c059e0e9353235162f080f26e14c11', name: 'walker', nip05: 'walker@primal.net' },
      { pubkey: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d', name: 'fiatjaf', nip05: 'fiatjaf@fiatjaf.com' }
    ]
  },
  {
    id: 'tech-pack',
    title: 'Tech & Development',
    description: 'Developers, entrepreneurs, and tech innovators',
    category: 'tech',
    accounts: [
      { pubkey: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d', name: 'fiatjaf', nip05: 'fiatjaf@fiatjaf.com' },
      { pubkey: 'e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411', name: 'Gigi', nip05: 'gigi@primal.net' },
      { pubkey: '1bc70a0148b3f316da33fe3c89f23e3e71ac4ff998027ec712b905cd24f6a411', name: 'miljan', nip05: 'miljan@primal.net' },
      { pubkey: '460c25e682fda7832b52d1f22d3d22b3176d972f60dcdc3212ed8c92ef85065c', name: 'vitor', nip05: 'vitor@primal.net' }
    ]
  },
  {
    id: 'finance-pack',
    title: 'Finance & Economics',
    description: 'Financial analysts, economists, and market experts',
    category: 'finance',
    accounts: [
      { pubkey: '85080d3bad70ccdcd7f74c29a44f55bb85cbcd3dd0cbb957da1d215bdb931204', name: 'preston', nip05: 'preston@primal.net' },
      { pubkey: 'eab0e756d32b80bcd464f3d844b8040303075a13eabc3599a762c9ac7ab91f4f', name: 'Lyn Alden', nip05: 'lyn@primal.net' },
      { pubkey: '1f52b16e5ca201ef2dc030f9b651137672e52de1ab29c0b0f6b72ac80ab23c84', name: 'Dr. Jeff', nip05: 'drjeff@primal.net' },
      { pubkey: 'bf2376e17ba4ec269d10fcc996a4746b451152be9031fa48e74553dde5526bce', name: 'Caitlin Long', nip05: 'caitlin@nostrverified.com' },
      { pubkey: '9ea192de4c37dfab80a4840c4fafb7c8597f8b67db84709e16ac6a88e9fafe16', name: 'Lawrence Lepard', nip05: 'lawrence@nostrverified.com' },
      { pubkey: 'ac3f6afe17593f61810513dac9a1e544e87b9ce91b27d37b88ec58fbaa9014aa', name: 'Willy Woo', nip05: 'woonomic@nostrverified.com' },
      { pubkey: '8e0d3e3eb2881ec137a11debe736a9086715a5023f33b6b54931293f5ca4f97e', name: 'James Lavish', nip05: 'james@primal.net' }
    ]
  },
  {
    id: 'food-pack', 
    title: 'Food & Lifestyle',
    description: 'Food enthusiasts, chefs, and lifestyle content creators',
    category: 'food',
    accounts: [
      { pubkey: 'a8171781fd9e90ede3ea44ddca5d3abf828fe8eedeb0f3abb0dd3e563562e1fc', name: 'nobody', nip05: 'nobody@nostrverified.com' },
      { pubkey: 'cf45a6ba1363ad7ed213a078a710f9ea3f40ceb483f3bf11fb1eef8f4c50f1e3', name: 'ewelina', nip05: 'ewelina@nostrpurple.com' },
      { pubkey: '88cc134b1a65f54ef48acc1df3665063d3ea45f04eab8af4646e561c5ae99079', name: 'Ben Justman ❤️', nip05: 'ben@fountain.fm' }
    ]
  },
  {
    id: 'general-pack',
    title: 'General Interest',
    description: 'Popular accounts across various topics and interests',
    category: 'general',
    accounts: [
      { pubkey: '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2', name: 'jack', nip05: 'jack@cash.app' },
      { pubkey: '04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9', name: 'ODELL', nip05: 'odell@primal.net' },
      { pubkey: 'c48e29f04b482cc01ca1f9ef8c86ef8318c059e0e9353235162f080f26e14c11', name: 'walker', nip05: 'walker@primal.net' },
      { pubkey: '1bc70a0148b3f316da33fe3c89f23e3e71ac4ff998027ec712b905cd24f6a411', name: 'miljan', nip05: 'miljan@primal.net' }
    ]
  }
];

export function getFollowPackById(id: string | null | undefined): FollowPack | undefined {
  return FOLLOW_PACKS.find(p => p.id === id);
}

export function getFollowPacksByCategory(category: string): FollowPack[] {
  return FOLLOW_PACKS.filter(p => p.category === category);
}

export function getAllFollowPackCategories(): string[] {
  return [...new Set(FOLLOW_PACKS.map(p => p.category))];
}

// Helper to get all pubkeys from selected packs
export function getFollowPackPubkeys(packIds: string[]): string[] {
  const pubkeys = new Set<string>();
  packIds.forEach(id => {
    const pack = getFollowPackById(id);
    if (pack) {
      pack.accounts.forEach(account => pubkeys.add(account.pubkey));
    }
  });
  return Array.from(pubkeys);
}
