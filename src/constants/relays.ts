/**
 * Big relay URLs for fallback and global discovery
 * Based on proven high-performance relays
 */
export const BIG_RELAY_URLS = [
  'wss://relay.damus.io/',
  'wss://nos.lol/',
  'wss://relay.nostr.band/',
  'wss://nostr.mom/'
] as const

/**
 * Searchable relay URLs that support NIP-50 search
 */
export const SEARCHABLE_RELAY_URLS = [
  'wss://relay.nostr.band/',
  'wss://search.nos.today/'
] as const

/**
 * Check if URL is a local network address
 */
export function isLocalNetworkUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Check for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true
    }
    
    // Check for private IP ranges
    if (hostname.match(/^192\.168\.\d+\.\d+$/)) return true
    if (hostname.match(/^10\.\d+\.\d+\.\d+$/)) return true
    if (hostname.match(/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/)) return true
    
    // Check for .onion (Tor) addresses
    if (hostname.endsWith('.onion')) return true
    
    return false
  } catch {
    return false
  }
}

/**
 * Normalize relay URL to ensure consistent format
 */
export function normalizeRelayUrl(url: string): string {
  try {
    const normalized = url.trim()
    if (!normalized.startsWith('ws://') && !normalized.startsWith('wss://')) {
      return `wss://${normalized}`
    }
    
    // Ensure trailing slash
    const urlObj = new URL(normalized)
    if (!urlObj.pathname || urlObj.pathname === '/') {
      urlObj.pathname = '/'
    }
    
    return urlObj.toString()
  } catch {
    return url
  }
}