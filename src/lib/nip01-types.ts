/**
 * Essential NIP-01 types and utilities for event validation and serialization
 * This is a minimal version containing only the functions actively used in the codebase.
 */

import type { NostrEvent } from "@nostrify/nostrify";

export interface SerializableEvent {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

/**
 * Validates the basic structure of a Nostr event according to NIP-01
 */
export function validateEventStructure(event: any): event is NostrEvent {
  // Basic type checks
  if (!event || typeof event !== 'object') {
    return false;
  }

  // Required fields
  if (typeof event.id !== 'string' || event.id.length !== 64) {
    return false;
  }

  if (typeof event.pubkey !== 'string' || event.pubkey.length !== 64) {
    return false;
  }

  if (typeof event.created_at !== 'number' || event.created_at <= 0) {
    return false;
  }

  if (typeof event.kind !== 'number' || event.kind < 0) {
    return false;
  }

  if (!Array.isArray(event.tags)) {
    return false;
  }

  if (typeof event.content !== 'string') {
    return false;
  }

  if (typeof event.sig !== 'string' || event.sig.length !== 128) {
    return false;
  }

  // Validate tags structure
  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.length === 0) {
      return false;
    }
    if (!tag.every(item => typeof item === 'string')) {
      return false;
    }
  }

  return true;
}

/**
 * Serializes event data for ID calculation according to NIP-01
 */
export function serializeEventForId(event: SerializableEvent): string {
  const serializable = [
    0, // Reserved for future use
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content
  ];
  
  return JSON.stringify(serializable);
}