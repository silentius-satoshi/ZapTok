/**
 * Essential NIP-01 types and utilities for event validation and serialization
 * This is a minimal version containing only the functions actively used in the codebase.
 */

import type { NostrEvent } from "@nostrify/nostrify";

// Nostr Filter interface for queries
export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  search?: string;
  [key: `#${string}`]: string[] | undefined;
}

// Client message types
export type ClientMessage = 
  | ['EVENT', NostrEvent]
  | ['REQ', string, ...NostrFilter[]]
  | ['CLOSE', string]
  | ['AUTH', NostrEvent]
  | ['COUNT', string, ...NostrFilter[]];

// Relay message types  
export type RelayMessage =
  | ['EVENT', string, NostrEvent]
  | ['OK', string, boolean, string]
  | ['EOSE', string]
  | ['CLOSED', string, string]
  | ['NOTICE', string]
  | ['AUTH', string]
  | ['COUNT', string, { count: number; approximate?: boolean }];

// NIP-01 error message prefixes
export const NIP01_ERROR_PREFIXES = {
  INVALID: 'invalid:',
  POW: 'pow:',
  RATE_LIMITED: 'rate-limited:',
  ERROR: 'error:',
  BLOCKED: 'blocked:',
  AUTH_REQUIRED: 'auth-required:',
  RESTRICTED: 'restricted:'
} as const;

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
export function validateEventStructure(event: unknown): event is NostrEvent {
  // Basic type checks
  if (!event || typeof event !== 'object') {
    return false;
  }

  const obj = event as Record<string, unknown>;

  // Required fields
  if (typeof obj.id !== 'string' || obj.id.length !== 64) {
    return false;
  }

  if (typeof obj.pubkey !== 'string' || obj.pubkey.length !== 64) {
    return false;
  }

  if (typeof obj.created_at !== 'number' || obj.created_at <= 0) {
    return false;
  }

  if (typeof obj.kind !== 'number' || obj.kind < 0) {
    return false;
  }

  if (!Array.isArray(obj.tags)) {
    return false;
  }

  if (typeof obj.content !== 'string') {
    return false;
  }

  if (typeof obj.sig !== 'string' || obj.sig.length !== 128) {
    return false;
  }

  // Validate tags structure
  for (const tag of obj.tags) {
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

/**
 * Validates a Nostr filter object
 */
export function validateFilter(filter: unknown): filter is NostrFilter {
  if (!filter || typeof filter !== 'object') {
    return false;
  }

  const obj = filter as Record<string, unknown>;

  // Optional string array fields
  const stringArrayFields = ['ids', 'authors'];
  for (const field of stringArrayFields) {
    if (obj[field] !== undefined) {
      if (!Array.isArray(obj[field]) || !(obj[field] as unknown[]).every(item => typeof item === 'string')) {
        return false;
      }
    }
  }

  // Optional number array field
  if (obj.kinds !== undefined) {
    if (!Array.isArray(obj.kinds) || !obj.kinds.every(item => typeof item === 'number' && item >= 0)) {
      return false;
    }
  }

  // Optional number fields
  const numberFields = ['since', 'until', 'limit'];
  for (const field of numberFields) {
    if (obj[field] !== undefined && (typeof obj[field] !== 'number' || obj[field] < 0)) {
      return false;
    }
  }

  // Optional string field
  if (obj.search !== undefined && typeof obj.search !== 'string') {
    return false;
  }

  // Tag filters (keys starting with #)
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('#')) {
      if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validates a client message
 */
export function validateClientMessage(message: unknown): message is ClientMessage {
  if (!Array.isArray(message) || message.length === 0) {
    return false;
  }

  const [type, ...args] = message;
  if (typeof type !== 'string') {
    return false;
  }

  switch (type) {
    case 'EVENT':
      return args.length === 1 && validateEventStructure(args[0]);
    case 'REQ':
      return args.length >= 1 && typeof args[0] === 'string' && 
             args.slice(1).every(filter => validateFilter(filter));
    case 'CLOSE':
      return args.length === 1 && typeof args[0] === 'string';
    case 'AUTH':
      return args.length === 1 && validateEventStructure(args[0]);
    case 'COUNT':
      return args.length >= 1 && typeof args[0] === 'string' && 
             args.slice(1).every(filter => validateFilter(filter));
    default:
      return false;
  }
}

/**
 * Validates a relay message
 */
export function validateRelayMessage(message: unknown): message is RelayMessage {
  if (!Array.isArray(message) || message.length === 0) {
    return false;
  }

  const [type, ...args] = message;
  if (typeof type !== 'string') {
    return false;
  }

  switch (type) {
    case 'EVENT':
      return args.length === 2 && typeof args[0] === 'string' && validateEventStructure(args[1]);
    case 'OK':
      return args.length === 3 && typeof args[0] === 'string' && 
             typeof args[1] === 'boolean' && typeof args[2] === 'string';
    case 'EOSE':
    case 'NOTICE':
    case 'AUTH':
      return args.length === 1 && typeof args[0] === 'string';
    case 'CLOSED':
      return args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string';
    case 'COUNT':
      return args.length === 2 && typeof args[0] === 'string' && 
             typeof args[1] === 'object' && args[1] !== null &&
             typeof (args[1] as Record<string, unknown>).count === 'number';
    default:
      return false;
  }
}

/**
 * Validates content serialization (basic check for valid JSON serialization)
 */
export function validateContentSerialization(content: unknown): boolean {
  try {
    if (typeof content === 'string') {
      // Already a string, check if it's valid
      return true;
    }
    // Try to serialize and deserialize
    const serialized = JSON.stringify(content);
    JSON.parse(serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Escapes content for NIP-01 compliance
 */
export function escapeContentForNIP01(content: string): string {
  // Basic escaping for JSON serialization
  return content
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Parses an OK message from a relay
 */
export function parseOKMessage(message: RelayMessage): { eventId: string; success: boolean; reason: string } | null {
  if (!Array.isArray(message) || message[0] !== 'OK' || message.length !== 4) {
    return null;
  }

  return {
    eventId: message[1] as string,
    success: message[2] as boolean,
    reason: message[3] as string
  };
}