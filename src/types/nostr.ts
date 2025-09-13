export interface NostrEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey: string;
  id?: string;
  sig?: string;
}

export interface NostrEventContent extends NostrEvent {
  id: string;
  sig: string;
}

export interface TDraftEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at?: number;
  pubkey?: string;
}

export interface TProfile {
  pubkey: string;
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud06?: string;
  lud16?: string;
  lightningAddress?: string;
  website?: string;
  [key: string]: any;
}