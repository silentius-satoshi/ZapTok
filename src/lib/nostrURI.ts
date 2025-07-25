import { nip19 } from 'nostr-tools';

/**  
 * Parse a nostr: URI and return routing information
 * Handles both full nostr: URIs and just NIP-19 identifiers
 */
export function parseNostrURI(uri: string): {
  type: string;
  data: unknown;
  identifier: string;
  route: string;
} | null {
  try {
    // Remove nostr: prefix if present
    const identifier = uri.startsWith('nostr:') ? uri.slice(6) : uri;
    
    // Decode the NIP-19 identifier
    const decoded = nip19.decode(identifier);
    
    // Generate appropriate route based on type
    let route = '/';
    
    switch (decoded.type) {
      case 'npub':
      case 'nprofile': {
        // Both npub and nprofile route to profiles
        const pubkey = decoded.type === 'npub' ? decoded.data : (decoded.data as { pubkey: string }).pubkey;
        route = `/profile/${pubkey}`;
        break;
      }
        
      case 'note':
      case 'nevent':
      case 'naddr':
        // Other entity types go to the generic entity viewer
        route = `/${identifier}`;
        break;
        
      case 'nsec':
        // Private keys shouldn't be routed - this is a security concern
        console.warn('Attempted to route to nsec - this should not happen');
        return null;
        
      default:
        // Unknown type
        route = `/${identifier}`;
    }
    
    return {
      type: decoded.type,
      data: decoded.data,
      identifier,
      route,
    };
  } catch (error) {
    console.error('Failed to parse Nostr URI:', uri, error);
    return null;
  }
}

/**
 * Generate a nostr: URI from NIP-19 data
 * Used for creating shareable links with proper nostr: protocol
 */
export function generateNostrURI(type: string, data: Record<string, unknown>): string | null {
  try {
    let identifier: string;
    
    switch (type) {
      case 'npub': {
        if (typeof data.pubkey === 'string') {
          identifier = nip19.npubEncode(data.pubkey);
        } else {
          return null;
        }
        break;
      }
        
      case 'nprofile': {
        if (typeof data.pubkey === 'string') {
          identifier = nip19.nprofileEncode({
            pubkey: data.pubkey,
            relays: Array.isArray(data.relays) ? data.relays as string[] : undefined
          });
        } else {
          return null;
        }
        break;
      }
        
      case 'note': {
        if (typeof data.id === 'string') {
          identifier = nip19.noteEncode(data.id);
        } else {
          return null;
        }
        break;
      }
        
      case 'nevent': {
        if (typeof data.id === 'string') {
          identifier = nip19.neventEncode({
            id: data.id,
            relays: Array.isArray(data.relays) ? data.relays as string[] : undefined,
            author: typeof data.author === 'string' ? data.author : undefined
          });
        } else {
          return null;
        }
        break;
      }
        
      case 'naddr': {
        if (
          typeof data.identifier === 'string' &&
          typeof data.pubkey === 'string' &&
          typeof data.kind === 'number'
        ) {
          identifier = nip19.naddrEncode({
            identifier: data.identifier,
            pubkey: data.pubkey,
            kind: data.kind,
            relays: Array.isArray(data.relays) ? data.relays as string[] : undefined
          });
        } else {
          return null;
        }
        break;
      }
        
      default:
        return null;
    }
    
    return `nostr:${identifier}`;
  } catch (error) {
    console.error('Error generating nostr URI:', error);
    return null;
  }
}

/**
 * Check if a string is a valid NIP-19 identifier
 */
export function isValidNIP19(identifier: string): boolean {
  try {
    nip19.decode(identifier);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract all nostr: URIs from text content
 */
export function extractNostrURIs(text: string): string[] {
  const regex = /nostr:(npub1|note1|nprofile1|nevent1|naddr1)([023456789acdefghjklmnpqrstuvwxyz]+)/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[0]); // Full match including 'nostr:' prefix
  }
  
  return matches;
}
