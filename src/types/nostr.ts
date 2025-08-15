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