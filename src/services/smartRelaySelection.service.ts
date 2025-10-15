import { isSafari } from '@/lib/browser';
import connectionPoolService from './connectionPool.service';
import relayListService, { RelayListConfig } from './relayList.service';

interface SubRequest {
  urls: string[];
  filter: any;
}

/**
 * SmartRelaySelectionService - Intelligent relay selection for optimal query routing
 * Based on production patterns for dynamic relay selection and query optimization
 */
class SmartRelaySelectionService {
  private static instance: SmartRelaySelectionService;

  // Production-grade relay URLs for fallback
  private readonly BIG_RELAY_URLS = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://nostr.mom'
  ];

  public static getInstance(): SmartRelaySelectionService {
    if (!SmartRelaySelectionService.instance) {
      SmartRelaySelectionService.instance = new SmartRelaySelectionService();
    }
    return SmartRelaySelectionService.instance;
  }

  /**
   * Generate optimized subscription requests for multiple pubkeys
   * Mimics Jumble's sophisticated relay selection strategy
   */
  async generateSubRequestsForPubkeys(
    pubkeys: string[], 
    myPubkey?: string | null
  ): Promise<SubRequest[]> {
    // Safari optimization - use fewer connections to prevent slowdowns
    if (isSafari()) {
      let urls = this.BIG_RELAY_URLS;
      
      if (myPubkey) {
        const relayList = await relayListService.getUserRelayList(myPubkey);
        // Combine user's read relays with big relays, limit to 5 for Safari
        urls = relayList.read.concat(this.BIG_RELAY_URLS).slice(0, 5);
      }
      
      return [{ urls, filter: { authors: pubkeys } }];
    }

    // Full optimization for other browsers
    const relayLists = await relayListService.getUserRelayLists(pubkeys);

    // Group pubkeys by their write relays for efficient batching
    const relayToAuthorsMap = new Map<string, Set<string>>();

    relayLists.forEach((relayList, index) => {
      const pubkey = pubkeys[index];
      
      // Use write relays (where the user publishes) to find their content
      relayList.write.slice(0, 4).forEach((url) => {
        if (!relayToAuthorsMap.has(url)) {
          relayToAuthorsMap.set(url, new Set());
        }
        relayToAuthorsMap.get(url)!.add(pubkey);
      });
    });

    // Convert grouped data into optimized sub-requests
    const subRequests: SubRequest[] = [];

    for (const [url, authorSet] of relayToAuthorsMap.entries()) {
      // Sort relay URLs by health for better connection success
      const healthSortedUrls = connectionPoolService.sortRelaysByHealth([url]);
      
      subRequests.push({
        urls: healthSortedUrls,
        filter: { authors: Array.from(authorSet) }
      });
    }

    // If no specific relay mappings found, fallback to big relays
    if (subRequests.length === 0) {
      const healthSortedBigRelays = connectionPoolService.sortRelaysByHealth(this.BIG_RELAY_URLS);
      subRequests.push({
        urls: healthSortedBigRelays.slice(0, 3), // Limit for performance
        filter: { authors: pubkeys }
      });
    }

    return subRequests;
  }

  /**
   * Select optimal relays for a specific event based on seen history
   */
  async selectRelaysForEvent(
    eventId: string, 
    authorPubkey: string,
    fallbackRelays: string[] = []
  ): Promise<string[]> {
    // First, check where this event was previously seen
    const seenRelays = connectionPoolService.getSeenEventRelayUrls(eventId);
    
    if (seenRelays.length > 0) {
      // Sort seen relays by health and return top performers
      return connectionPoolService.sortRelaysByHealth(seenRelays).slice(0, 3);
    }

    // If not seen before, use author's relay list
    const authorRelayList = await relayListService.getUserRelayList(authorPubkey);
    const candidateRelays = [
      ...authorRelayList.read.slice(0, 2), // Author's read relays
      ...authorRelayList.write.slice(0, 2), // Author's write relays
      ...fallbackRelays.slice(0, 2), // Provided fallbacks
      ...this.BIG_RELAY_URLS.slice(0, 2) // Big relays as final fallback
    ];

    // Remove duplicates and sort by health
    const uniqueRelays = Array.from(new Set(candidateRelays));
    return connectionPoolService.sortRelaysByHealth(uniqueRelays).slice(0, 4);
  }

  /**
   * Select relays for publishing based on user's write relays and health
   */
  async selectRelaysForPublishing(
    authorPubkey: string,
    additionalRelays: string[] = []
  ): Promise<string[]> {
    const authorRelayList = await relayListService.getUserRelayList(authorPubkey);
    
    // Combine write relays with additional specified relays
    const candidateRelays = [
      ...authorRelayList.write,
      ...additionalRelays,
      ...this.BIG_RELAY_URLS.slice(0, 2) // Ensure some big relays for discovery
    ];

    // Remove duplicates and sort by health
    const uniqueRelays = Array.from(new Set(candidateRelays));
    return connectionPoolService.sortRelaysByHealth(uniqueRelays);
  }

  /**
   * Get relays optimized for reply fetching
   */
  async selectRelaysForReplies(
    rootEventId: string,
    rootAuthorPubkey: string,
    currentUserPubkey?: string
  ): Promise<string[]> {
    // Get relays where root event was seen
    const seenRelays = connectionPoolService.getSeenEventRelayUrls(rootEventId);
    
    // Get root author's relay list
    const rootAuthorRelays = await relayListService.getUserRelayList(rootAuthorPubkey);
    
    // Get current user's relay list if available
    let currentUserRelays: RelayListConfig | null = null;
    if (currentUserPubkey) {
      currentUserRelays = await relayListService.getUserRelayList(currentUserPubkey);
    }

    // Combine all relevant relays
    const candidateRelays = [
      ...seenRelays, // Where the root event was seen (highest priority)
      ...rootAuthorRelays.read.slice(0, 3), // Where root author reads
      ...(currentUserRelays?.read.slice(0, 2) || []), // Where current user reads
      ...this.BIG_RELAY_URLS.slice(0, 2) // Big relays for discovery
    ];

    // Remove duplicates and sort by health
    const uniqueRelays = Array.from(new Set(candidateRelays));
    return connectionPoolService.sortRelaysByHealth(uniqueRelays).slice(0, 6);
  }

  /**
   * Get relays optimized for search queries
   */
  async selectRelaysForSearch(userPubkey?: string): Promise<string[]> {
    let candidateRelays = [...this.BIG_RELAY_URLS]; // Start with big relays (likely to support search)

    if (userPubkey) {
      const userRelayList = await relayListService.getUserRelayList(userPubkey);
      // Add user's read relays (they might have search-enabled relays)
      candidateRelays = [
        ...userRelayList.read.slice(0, 3),
        ...candidateRelays
      ];
    }

    // Remove duplicates and sort by health
    const uniqueRelays = Array.from(new Set(candidateRelays));
    return connectionPoolService.sortRelaysByHealth(uniqueRelays).slice(0, 4);
  }

  /**
   * Adaptive relay selection based on query type and context
   */
  async selectOptimalRelays(
    queryType: 'profile' | 'posts' | 'replies' | 'search' | 'publish',
    context: {
      userPubkey?: string;
      targetPubkey?: string;
      eventId?: string;
      additionalRelays?: string[];
    }
  ): Promise<string[]> {
    switch (queryType) {
      case 'profile':
      case 'posts':
        if (context.targetPubkey) {
          const relayList = await relayListService.getUserRelayList(context.targetPubkey);
          const candidateRelays = [
            ...relayList.write.slice(0, 3), // Where they publish
            ...relayList.read.slice(0, 2), // Where they read
            ...this.BIG_RELAY_URLS.slice(0, 2)
          ];
          const uniqueRelays = Array.from(new Set(candidateRelays));
          return connectionPoolService.sortRelaysByHealth(uniqueRelays).slice(0, 5);
        }
        break;

      case 'replies':
        if (context.eventId && context.targetPubkey) {
          return this.selectRelaysForReplies(
            context.eventId,
            context.targetPubkey,
            context.userPubkey
          );
        }
        break;

      case 'search':
        return this.selectRelaysForSearch(context.userPubkey);

      case 'publish':
        if (context.userPubkey) {
          return this.selectRelaysForPublishing(
            context.userPubkey,
            context.additionalRelays
          );
        }
        break;
    }

    // Fallback to big relays
    return connectionPoolService.sortRelaysByHealth(this.BIG_RELAY_URLS).slice(0, 3);
  }
}

// Export singleton instance
const smartRelaySelectionService = SmartRelaySelectionService.getInstance();
export default smartRelaySelectionService;