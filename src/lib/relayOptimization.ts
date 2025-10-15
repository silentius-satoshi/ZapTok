/**
 * Relay optimization utilities for contextual relay selection
 * Optimizes performance by using different relay sets for different use cases
 */

export type RelayContext = 'all' | 'wallet' | 'feed' | 'cashu-only' | 'none' | 'settings-cashu' | 'search-only';

export interface RelayCategory {
  wallet: string[]; // Optimized for wallet/Cashu operations
  feed: string[];   // Optimized for social feed content
  general: string[]; // General purpose relays
  search: string[]; // Lightweight relays good for user searches
}

/**
 * Categorized relay configuration
 * wallet: Fast, reliable relays good for financial operations
 * feed: Content-rich relays with good video/media support
 * general: Balanced relays good for both
 */
export const relayCategories: RelayCategory = {
  wallet: [
    'wss://relay.chorus.community', // Fast, reliable for wallet operations
    'wss://relay.nostr.band',       // Good indexing for history
  ],
  feed: [
    'wss://relay.damus.io',         // Great for social content
    'wss://relay.primal.net',       // Excellent media support
  ],
  general: [
    'wss://relay.nostr.band',       // Works well for both
    'wss://relay.chorus.community', // Versatile relay
  ],
  search: [
    'wss://relay.nostr.band',       // Excellent for user metadata
    'wss://relay.damus.io',         // Fast profile lookups
  ],
};

/**
 * Get optimal relays based on context
 */
export function getOptimalRelays(
  context: RelayContext,
  userRelays: string[] = []
): string[] {
  switch (context) {
    case 'cashu-only':
    case 'settings-cashu': {
      // Only the Cashu relay for wallet and Cashu-related operations
      return ['wss://relay.chorus.community'];
    }
    
    case 'none': {
      // No relays active (for settings pages)
      return [];
    }
    
    case 'wallet': {
      // For wallet operations, use only Cashu relay (same as cashu-only)
      return ['wss://relay.chorus.community'];
    }
      
    case 'feed': {
      // For feed operations, prioritize content-rich relays
      // Use user's relays that are in feed category, fallback to feed relays
      const feedRelays = userRelays.filter(url => 
        relayCategories.feed.includes(url) || relayCategories.general.includes(url)
      );
      return feedRelays.length > 0 ? feedRelays : relayCategories.feed;
    }
    
    case 'search-only': {
      // For user search operations, use lightweight relays optimized for metadata
      // Avoid heavy video/content relays to prevent unnecessary background fetching
      const searchRelays = userRelays.filter(url => 
        relayCategories.search.includes(url) || relayCategories.general.includes(url)
      );
      return searchRelays.length > 0 ? searchRelays : relayCategories.search;
    }
      
    case 'all':
    default:
      // Use all user relays or all available relays
      return userRelays.length > 0 ? userRelays : [
        ...relayCategories.wallet,
        ...relayCategories.feed
      ].filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates
  }
}

/**
 * Determine if relay switch is beneficial based on current context
 */
export function shouldSwitchRelays(
  currentContext: RelayContext,
  targetContext: RelayContext,
  currentRelays: string[]
): boolean {
  // Don't switch if already optimal
  if (currentContext === targetContext) return false;
  
  // Don't switch if using all relays
  if (currentContext === 'all') return false;
  
  // Get optimal relays for target context
  const optimalRelays = getOptimalRelays(targetContext, currentRelays);
  
  // Switch if we can reduce relay count while maintaining functionality
  return optimalRelays.length < currentRelays.length;
}

/**
 * Get relay context description for UI
 */
export function getRelayContextDescription(context: RelayContext): string {
  switch (context) {
    case 'cashu-only':
    case 'settings-cashu':
      return 'Cashu relay only (wallet operations)';
    case 'wallet':
      return 'Optimized for wallet operations (faster loading)';
    case 'feed':
      return 'Optimized for social feeds (better content discovery)';
    case 'search-only':
      return 'Optimized for user searches (minimal network usage)';
    case 'none':
      return 'No relays active (settings mode)';
    case 'all':
    default:
      return 'All relays (maximum compatibility)';
  }
}
