import { FeedSubRequest } from './timelineService'

// Big relays list (similar to Jumble's BIG_RELAY_URLS)
export const BIG_RELAY_URLS = [
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://nostr.wine',
]

export interface RelayList {
  read: string[]
  write: string[]
  originalRelays: string[]
}

/**
 * Smart relay distribution service based on Jumble's approach
 * Optimizes relay usage by distributing authors across their preferred relays
 */
export class RelayDistributionService {
  
  /**
   * Generate optimized sub-requests for multiple pubkeys
   * Based on Jumble's generateSubRequestsForPubkeys method
   */
  async generateSubRequestsForPubkeys(
    pubkeys: string[], 
    myPubkey?: string | null,
    relayFetcher?: (pubkey: string) => Promise<RelayList>
  ): Promise<FeedSubRequest[]> {
    
    // Safari optimization - use single request to avoid connection issues
    // Based on Jumble's Safari-specific handling
    if (this.isSafari()) {
      let urls = BIG_RELAY_URLS
      
      if (myPubkey && relayFetcher) {
        try {
          const relayList = await relayFetcher(myPubkey)
          urls = relayList.read.concat(BIG_RELAY_URLS).slice(0, 5)
        } catch (error) {
          console.warn('Failed to fetch user relay list, using big relays:', error)
        }
      }
      
      console.log(`📊 [RelayDistribution] Safari optimization: Using single request for ${pubkeys.length} users across ${urls.length} relays`)
      return [{ urls, filter: { authors: pubkeys } }]
    }

    // If no relay fetcher provided, use big relays for all authors
    if (!relayFetcher) {
      console.log(`📊 [RelayDistribution] No relay fetcher provided, using big relays for ${pubkeys.length} users`)
      return [{ urls: BIG_RELAY_URLS, filter: { authors: pubkeys } }]
    }

    try {
      // Fetch relay lists for all pubkeys
      const relayLists = await Promise.all(
        pubkeys.map(async (pubkey) => {
          try {
            return await relayFetcher(pubkey)
          } catch {
            // Fallback to empty relay list if fetch fails
            return { read: [], write: [], originalRelays: [] }
          }
        })
      )

      // Group pubkeys by their preferred relays
      const relayToPubkeys: Record<string, Set<string>> = {}
      
      relayLists.forEach((relayList, index) => {
        const pubkey = pubkeys[index]
        // Use write relays (where users publish) as primary, fallback to read
        const userRelays = relayList.write.length > 0 ? relayList.write : relayList.read
        
        userRelays.slice(0, 4).forEach((url) => {
          if (!relayToPubkeys[url]) {
            relayToPubkeys[url] = new Set()
          }
          relayToPubkeys[url].add(pubkey)
        })
      })

      // If no relay preferences found, use big relays
      if (Object.keys(relayToPubkeys).length === 0) {
        console.log(`📊 [RelayDistribution] No relay preferences found for any users, using big relays for ${pubkeys.length} users`)
        return [{ urls: BIG_RELAY_URLS, filter: { authors: pubkeys } }]
      }

      // Optimize relay distribution (Jumble's optimization logic)
      const coveredCount = new Map<string, number>()
      const relayCount = Object.keys(relayToPubkeys).length
      let removedRelays = 0

      // Remove redundant relays if users are already well-covered
      Object.entries(relayToPubkeys)
        .sort(([, a], [, b]) => b.size - a.size) // Sort by pubkey count descending
        .forEach(([url, pubkeySet]) => {
          if (
            relayCount > 10 &&
            pubkeySet.size < 10 &&
            Array.from(pubkeySet).every((pubkey) => (coveredCount.get(pubkey) ?? 0) >= 2)
          ) {
            // Remove this relay as users are already covered by other relays
            delete relayToPubkeys[url]
            removedRelays++
          } else {
            // Track coverage for each pubkey
            pubkeySet.forEach((pubkey) => {
              coveredCount.set(pubkey, (coveredCount.get(pubkey) ?? 0) + 1)
            })
          }
        })

      // Log optimization results
      if (removedRelays > 0) {
        console.log(`📊 [RelayDistribution] Optimization: Removed ${removedRelays} redundant relays, kept ${Object.keys(relayToPubkeys).length}`)
      }

      // Convert to sub-requests
      const subRequests = Object.entries(relayToPubkeys).map(([url, authors]) => ({
        urls: [url],
        filter: { authors: Array.from(authors) }
      }))

      // Log distribution results for debugging
      const totalAuthors = subRequests.reduce((sum, req) => sum + req.filter.authors.length, 0)
      console.log(`📊 [RelayDistribution] Distributed ${pubkeys.length} users across ${subRequests.length} relays (${totalAuthors} total subscriptions)`)
      
      // Ensure we have at least one sub-request
      if (subRequests.length === 0) {
        console.log('📊 [RelayDistribution] No relay preferences found, using big relays for all users')
        return [{ urls: BIG_RELAY_URLS, filter: { authors: pubkeys } }]
      }

      return subRequests
      
    } catch (error) {
      console.error('Error generating sub-requests for pubkeys:', error)
      console.log(`📊 [RelayDistribution] Error fallback: Using big relays for ${pubkeys.length} users`)
      // Fallback to big relays if optimization fails
      return [{ urls: BIG_RELAY_URLS, filter: { authors: pubkeys } }]
    }
  }

  /**
   * Generate sub-requests for a single relay (global feed)
   */
  generateGlobalFeedSubRequest(relayUrl: string, kinds: number[] = [1], limit: number = 200): FeedSubRequest[] {
    return [{
      urls: [relayUrl],
      filter: { kinds, limit }
    }]
  }

  /**
   * Generate sub-requests for multiple relays (relay set)
   */
  generateRelaySetSubRequest(relayUrls: string[], kinds: number[] = [1], limit: number = 200): FeedSubRequest[] {
    return [{
      urls: relayUrls,
      filter: { kinds, limit }
    }]
  }

  /**
   * Generate sub-requests for hashtag search
   */
  generateHashtagSubRequest(relayUrls: string[], hashtag: string, kinds: number[] = [1], limit: number = 200): FeedSubRequest[] {
    return [{
      urls: relayUrls,
      filter: { kinds, '#t': [hashtag], limit }
    }]
  }

  /**
   * Generate sub-requests for search query
   */
  generateSearchSubRequest(relayUrls: string[], searchQuery: string, kinds: number[] = [1], limit: number = 200): FeedSubRequest[] {
    return [{
      urls: relayUrls,
      filter: { kinds, search: searchQuery, limit }
    }]
  }

  /**
   * Generate sub-requests for profile events
   */
  generateProfileSubRequest(
    pubkey: string, 
    relayList: RelayList, 
    kinds: number[] = [1], 
    limit: number = 200
  ): FeedSubRequest[] {
    const urls = relayList.write.length > 0 
      ? relayList.write.concat(BIG_RELAY_URLS).slice(0, 8)
      : BIG_RELAY_URLS.slice(0, 5)

    return [{
      urls,
      filter: { authors: [pubkey], kinds, limit }
    }]
  }

  /**
   * Detect Safari browser (from Jumble's isSafari check)
   */
  private isSafari(): boolean {
    if (typeof navigator === 'undefined') return false
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  }

  /**
   * Normalize relay URL
   */
  normalizeRelayUrl(url: string): string {
    try {
      const normalized = url.trim().toLowerCase()
      if (!normalized.startsWith('ws://') && !normalized.startsWith('wss://')) {
        return `wss://${normalized}`
      }
      return normalized
    } catch {
      return url
    }
  }

  /**
   * Validate relay URL
   */
  isValidRelayUrl(url: string): boolean {
    try {
      const normalized = this.normalizeRelayUrl(url)
      const urlObj = new URL(normalized)
      return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:'
    } catch {
      return false
    }
  }

  /**
   * Remove duplicate relay URLs
   */
  deduplicateRelayUrls(urls: string[]): string[] {
    const seen = new Set<string>()
    const result: string[] = []
    
    for (const url of urls) {
      const normalized = this.normalizeRelayUrl(url)
      if (!seen.has(normalized)) {
        seen.add(normalized)
        result.push(normalized)
      }
    }
    
    return result
  }

  /**
   * Merge multiple relay lists
   */
  mergeRelayLists(...relayLists: RelayList[]): RelayList {
    const allRead = relayLists.flatMap(list => list.read)
    const allWrite = relayLists.flatMap(list => list.write)
    const allOriginal = relayLists.flatMap(list => list.originalRelays)

    return {
      read: this.deduplicateRelayUrls(allRead),
      write: this.deduplicateRelayUrls(allWrite),
      originalRelays: this.deduplicateRelayUrls(allOriginal)
    }
  }
}

// Export singleton instance
export const relayDistributionService = new RelayDistributionService()
export default relayDistributionService