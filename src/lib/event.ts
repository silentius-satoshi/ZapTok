import { Event as NostrEvent } from 'nostr-tools'

/**
 * Check if an event kind is replaceable
 * Based on NIP-16 and NIP-33
 */
export function isReplaceableEvent(kind: number): boolean {
  // Replaceable events: 10000 <= kind < 20000
  // Addressable events: 30000 <= kind < 40000
  return (kind >= 10000 && kind < 20000) || (kind >= 30000 && kind < 40000)
}

/**
 * Get replaceable coordinate for an event
 * Format: kind:pubkey:d-tag
 */
export function getReplaceableCoordinate(kind: number, pubkey: string, tags: string[][]): string {
  const dTag = tags.find(([name]) => name === 'd')?.[1] || ''
  return `${kind}:${pubkey}:${dTag}`
}

/**
 * Get replaceable coordinate from event
 */
export function getReplaceableCoordinateFromEvent(event: NostrEvent): string {
  return getReplaceableCoordinate(event.kind, event.pubkey, event.tags)
}

/**
 * Compare events by created_at (for sorting)
 * Returns > 0 if a is newer, < 0 if b is newer, 0 if equal
 */
export function compareEvents(a: NostrEvent, b: NostrEvent): number {
  return b.created_at - a.created_at
}

/**
 * Get the latest event from an array
 */
export function getLatestEvent(events: NostrEvent[]): NostrEvent | undefined {
  if (events.length === 0) return undefined
  return events.reduce((latest, current) => 
    current.created_at > latest.created_at ? current : latest
  )
}

/**
 * Check if event is a deletion event (kind 5)
 */
export function isDeletionEvent(event: NostrEvent): boolean {
  return event.kind === 5
}

/**
 * Get event IDs that this deletion event deletes
 */
export function getDeletedEventIds(deletionEvent: NostrEvent): string[] {
  if (!isDeletionEvent(deletionEvent)) return []
  
  return deletionEvent.tags
    .filter(([tagName]) => tagName === 'e')
    .map(([, eventId]) => eventId)
    .filter(Boolean)
}

/**
 * Extract referenced event IDs from an event
 */
export function getReferencedEventIds(event: NostrEvent): string[] {
  return event.tags
    .filter(([tagName]) => tagName === 'e')
    .map(([, eventId]) => eventId)
    .filter(Boolean)
}

/**
 * Extract referenced pubkeys from an event
 */
export function getReferencedPubkeys(event: NostrEvent): string[] {
  return event.tags
    .filter(([tagName]) => tagName === 'p')
    .map(([, pubkey]) => pubkey)
    .filter(Boolean)
}

/**
 * Check if event is a repost (kind 6 or kind 16)
 */
export function isRepostEvent(event: NostrEvent): boolean {
  return event.kind === 6 || event.kind === 16
}

/**
 * Check if event is a reaction (kind 7)
 */
export function isReactionEvent(event: NostrEvent): boolean {
  return event.kind === 7
}

/**
 * Check if event is a zap receipt (kind 9735)
 */
export function isZapReceiptEvent(event: NostrEvent): boolean {
  return event.kind === 9735
}

/**
 * Check if event is a text note (kind 1)
 */
export function isTextNoteEvent(event: NostrEvent): boolean {
  return event.kind === 1
}

/**
 * Get d-tag value from event (for addressable events)
 */
export function getDTagValue(event: NostrEvent): string | undefined {
  return event.tags.find(([name]) => name === 'd')?.[1]
}

/**
 * Create a simple event identifier for caching
 */
export function createEventIdentifier(event: NostrEvent): string {
  if (isReplaceableEvent(event.kind)) {
    return getReplaceableCoordinateFromEvent(event)
  }
  return event.id
}

/**
 * Check if two events are the same (for deduplication)
 */
export function isSameEvent(a: NostrEvent, b: NostrEvent): boolean {
  return a.id === b.id
}

/**
 * Get event mention type (root, reply, or mention)
 */
export function getEventMentionType(event: NostrEvent, targetEventId: string): 'root' | 'reply' | 'mention' | null {
  const eTag = event.tags.find(([name, id]) => name === 'e' && id === targetEventId)
  if (!eTag) return null
  
  const marker = eTag[3]
  if (marker === 'root') return 'root'
  if (marker === 'reply') return 'reply'
  return 'mention'
}

/**
 * Check if event has required fields for validity
 */
export function isValidEvent(event: any): event is NostrEvent {
  return (
    event &&
    typeof event.id === 'string' &&
    typeof event.pubkey === 'string' &&
    typeof event.created_at === 'number' &&
    typeof event.kind === 'number' &&
    typeof event.content === 'string' &&
    Array.isArray(event.tags) &&
    typeof event.sig === 'string'
  )
}