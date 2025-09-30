/**
 * Nostr URL utilities for ZapTok Comprehensive Sharing System
 * Provides URL conversion, validation, and sharing functionality
 * 
 * Implementation follows the strategy outlined in the ZapTok Comprehensive Sharing System
 * Implementation Guide, starting with Phase 1: Core njump.me QR Integration
 */

import { nip19 } from 'nostr-tools';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

/**
 * URL hierarchy strategy following the implementation guide
 * Priority order for sharing URLs:
 * 1. zaptok.social/{type}/{id}     // Primary - Brand building
 * 2. njump.me/{nostrId}            // Fallback - Universal access
 * 3. Raw Nostr identifier          // Technical users
 * 4. JSON export                   // Developers
 */

export interface ShareableURL {
  primary: string;
  fallback: string;
  raw: string;
  json?: string;
}

/**
 * Validate if a string is a valid Nostr identifier
 */
export function isValidNostrIdentifier(identifier: string): boolean {
  try {
    // Remove nostr: prefix if present
    const cleanIdentifier = identifier.startsWith('nostr:') ? identifier.slice(6) : identifier;
    
    // Check NIP-19 formats
    if (cleanIdentifier.match(/^(npub|nsec|note|nevent|nprofile|naddr)1[023456789acdefghjklmnpqrstuvwxyz]+$/)) {
      nip19.decode(cleanIdentifier);
      return true;
    }
    
    // Check hex format (64 char hex string for pubkeys/event IDs)
    if (cleanIdentifier.match(/^[0-9a-f]{64}$/i)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Convert any Nostr identifier to njump.me URL
 * Universal fallback that works with all Nostr clients
 */
export function toNjumpURL(identifier: string): string {
  // Remove nostr: prefix if present
  const cleanIdentifier = identifier.startsWith('nostr:') ? identifier.slice(6) : identifier;
  
  // Validate identifier
  if (!isValidNostrIdentifier(cleanIdentifier)) {
    throw new Error('Invalid Nostr identifier');
  }
  
  return `https://njump.me/${cleanIdentifier}`;
}

/**
 * Convert hex pubkey to npub and then to njump URL
 */
export function pubkeyToNjumpURL(pubkey: string): string {
  if (!pubkey.match(/^[0-9a-f]{64}$/i)) {
    throw new Error('Invalid pubkey format');
  }
  
  const npub = nip19.npubEncode(pubkey);
  return toNjumpURL(npub);
}

/**
 * Convert event to nevent and then to njump URL
 */
export function eventToNjumpURL(event: NostrEvent, relays?: string[]): string {
  const nevent = nip19.neventEncode({
    id: event.id,
    relays: relays || [],
    author: event.pubkey
  });
  
  return toNjumpURL(nevent);
}

/**
 * Convert addressable event to naddr and then to njump URL
 */
export function naddrToNjumpURL(kind: number, pubkey: string, identifier: string, relays?: string[]): string {
  const naddr = nip19.naddrEncode({
    kind,
    pubkey,
    identifier,
    relays: relays || []
  });
  
  return toNjumpURL(naddr);
}

/**
 * ZapTok-specific URL generation (Phase 2 implementation)
 * Currently returns njump.me URLs as fallback
 */
export function toZapTokURL(identifier: string): string {
  // Phase 2: Implement zaptok.social URL structure
  // For now, fallback to njump.me
  return toNjumpURL(identifier);
}

/**
 * Generate comprehensive shareable URLs for any Nostr entity
 * Follows the URL hierarchy strategy from the implementation guide
 */
export function generateShareableURLs(identifier: string, metadata?: {
  type?: 'profile' | 'video' | 'event';
  relays?: string[];
  eventData?: NostrEvent;
}): ShareableURL {
  const cleanIdentifier = identifier.startsWith('nostr:') ? identifier.slice(6) : identifier;
  
  if (!isValidNostrIdentifier(cleanIdentifier)) {
    throw new Error('Invalid Nostr identifier');
  }
  
  // Primary URL (Phase 2: will be zaptok.social)
  const primary = toZapTokURL(cleanIdentifier);
  
  // Fallback URL (njump.me for universal access)
  const fallback = toNjumpURL(cleanIdentifier);
  
  // Raw identifier (for technical users)
  const raw = cleanIdentifier.startsWith('nostr:') ? cleanIdentifier : `nostr:${cleanIdentifier}`;
  
  // JSON export (for developers)
  let json: string | undefined;
  if (metadata?.eventData) {
    json = JSON.stringify(metadata.eventData, null, 2);
  }
  
  return {
    primary,
    fallback,
    raw,
    json
  };
}

/**
 * Enhanced QR generation with automatic njump.me conversion
 * Phase 1 core functionality for universal QR accessibility
 */
export function generateQRData(identifier: string, options?: {
  preferRaw?: boolean;
  includeNostrPrefix?: boolean;
}): string {
  const cleanIdentifier = identifier.startsWith('nostr:') ? identifier.slice(6) : identifier;
  
  if (!isValidNostrIdentifier(cleanIdentifier)) {
    throw new Error('Invalid Nostr identifier');
  }
  
  // For QR codes, prefer njump.me URLs for better universal compatibility
  // unless specifically requested to use raw format
  if (options?.preferRaw) {
    return options.includeNostrPrefix ? `nostr:${cleanIdentifier}` : cleanIdentifier;
  }
  
  // Default: Use njump.me URL for maximum compatibility
  return toNjumpURL(cleanIdentifier);
}

/**
 * Profile-specific URL generation with metadata
 */
export function generateProfileShareURL(pubkey: string, metadata?: NostrMetadata, relays?: string[]): ShareableURL {
  // Use nprofile for richer metadata if available
  let identifier: string;
  
  if (relays && relays.length > 0) {
    identifier = nip19.nprofileEncode({
      pubkey,
      relays: relays.slice(0, 3) // Limit to 3 relays for QR size
    });
  } else {
    identifier = nip19.npubEncode(pubkey);
  }
  
  return generateShareableURLs(identifier, {
    type: 'profile',
    relays
  });
}

/**
 * Video/Event-specific URL generation
 */
export function generateVideoShareURL(event: NostrEvent, relays?: string[]): ShareableURL {
  try {
    const nevent = nip19.neventEncode({
      id: event.id,
      relays: relays || [],
      author: event.pubkey
    });
    
    return generateShareableURLs(nevent, {
      type: 'video',
      relays,
      eventData: event
    });
  } catch (error) {
    // Fallback to basic URL for invalid events (e.g., test data)
    const fallbackUrl = `https://njump.me/${event.id}`;
    const rawIdentifier = `nostr:${event.id}`;
    return {
      primary: fallbackUrl,
      fallback: fallbackUrl,
      raw: rawIdentifier,
      json: JSON.stringify(event, null, 2)
    };
  }
}

/**
 * Format detection and smart processing
 * Auto-detects various input formats and normalizes them
 */
export function detectAndNormalizeNostrURL(input: string): {
  type: 'npub' | 'note' | 'nevent' | 'nprofile' | 'naddr' | 'hex' | 'unknown';
  identifier: string;
  isValid: boolean;
  njumpURL?: string;
} {
  const trimmed = input.trim();
  
  try {
    // Remove various prefixes
    const cleanInput = trimmed
      .replace(/^nostr:/, '')
      .replace(/^https?:\/\/njump\.me\//, '')
      .replace(/^https?:\/\/[^/]+\//, ''); // Remove any domain
    
    // Detect type
    let type: 'npub' | 'note' | 'nevent' | 'nprofile' | 'naddr' | 'hex' | 'unknown' = 'unknown';
    
    if (cleanInput.startsWith('npub1')) type = 'npub';
    else if (cleanInput.startsWith('note1')) type = 'note';
    else if (cleanInput.startsWith('nevent1')) type = 'nevent';
    else if (cleanInput.startsWith('nprofile1')) type = 'nprofile';
    else if (cleanInput.startsWith('naddr1')) type = 'naddr';
    else if (cleanInput.match(/^[0-9a-f]{64}$/i)) type = 'hex';
    
    // Validate
    const isValid = isValidNostrIdentifier(cleanInput);
    
    // Generate njump URL if valid
    let njumpURL: string | undefined;
    if (isValid) {
      njumpURL = toNjumpURL(cleanInput);
    }
    
    return {
      type,
      identifier: cleanInput,
      isValid,
      njumpURL
    };
  } catch {
    return {
      type: 'unknown',
      identifier: trimmed,
      isValid: false
    };
  }
}

/**
 * Dual display utility for showing both URL and raw identifier
 * Used in QR modals and sharing interfaces
 */
export interface DualDisplay {
  label: string;
  value: string;
  copyValue: string;
  isURL: boolean;
}

export function generateDualDisplay(identifier: string): DualDisplay[] {
  const normalized = detectAndNormalizeNostrURL(identifier);
  
  if (!normalized.isValid) {
    return [{
      label: 'Invalid Identifier',
      value: identifier,
      copyValue: identifier,
      isURL: false
    }];
  }
  
  const displays: DualDisplay[] = [];
  
  // Add njump URL
  if (normalized.njumpURL) {
    displays.push({
      label: 'Universal Link',
      value: normalized.njumpURL,
      copyValue: normalized.njumpURL,
      isURL: true
    });
  }
  
  // Add raw identifier
  displays.push({
    label: 'Nostr Identifier',
    value: `nostr:${normalized.identifier}`,
    copyValue: `nostr:${normalized.identifier}`,
    isURL: false
  });
  
  return displays;
}