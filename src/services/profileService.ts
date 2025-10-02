import { SimplePool, Filter, Event as NostrEvent } from 'nostr-tools'
import { AbstractRelay } from 'nostr-tools/abstract-relay'
import { sha256 } from '@noble/hashes/sha2'
import DataLoader from 'dataloader'
import { LRUCache } from 'lru-cache'
import { BIG_RELAY_URLS, isLocalNetworkUrl, normalizeRelayUrl } from '@/constants/relays'

type ProfileData = {
  event?: NostrEvent
  metadata?: {
    name?: string
    about?: string
    picture?: string
    banner?: string
    website?: string
    lud06?: string
    lud16?: string
    nip05?: string
    display_name?: string
  }
}

class ProfileService extends EventTarget {
  private pool: SimplePool
  private profileCache = new LRUCache<string, ProfileData>({ max: 1000, ttl: 1000 * 60 * 10 }) // 10 min cache
  private profileDataLoader: DataLoader<string, ProfileData>
  private profileFromBigRelaysDataloader: DataLoader<string, NostrEvent | null>

  // Track which relays we've seen events on
  private eventSeenOn = new Map<string, Set<AbstractRelay>>()

  constructor() {
    super()
    this.pool = new SimplePool()
    this.pool.trackRelays = true

    // DataLoader for batch profile fetching
    this.profileDataLoader = new DataLoader<string, ProfileData>(
      async (pubkeys: readonly string[]) => {
        return Promise.all(pubkeys.map(pubkey => this._fetchProfile(pubkey)))
      },
      {
        cache: false, // We handle our own caching
        batchScheduleFn: (callback) => setTimeout(callback, 50) // Batch requests
      }
    )

    // Big relay DataLoader for profile optimization (proven pattern)
    this.profileFromBigRelaysDataloader = new DataLoader<string, NostrEvent | null>(
      this.fetchProfilesFromBigRelays.bind(this),
      {
        batchScheduleFn: (callback) => setTimeout(callback, 50),
        maxBatchSize: 500,
        cacheKeyFn: (pubkey) => pubkey
      }
    )
  }

  /**
   * Fetch profile data for a pubkey (main interface)
   */
  async fetchProfile(pubkey: string, skipCache = false): Promise<ProfileData> {
    if (!pubkey) return {}

    // Return cached data if available and not skipping cache
    if (!skipCache && this.profileCache.has(pubkey)) {
      return this.profileCache.get(pubkey)!
    }

    try {
      const profile = await this.profileDataLoader.load(pubkey)

      // Cache the result
      if (profile) {
        this.profileCache.set(pubkey, profile)
      }

      return profile
    } catch (error) {
      console.error('Profile fetch error:', error)
      return {}
    }
  }

  /**
   * Internal profile fetching (Jumble-inspired)
   */
  private async _fetchProfile(pubkey: string): Promise<ProfileData> {
    const defaultProfile: ProfileData = {}

    try {
      // Use default relays for profile fetching
      const relayUrls = [
        'wss://relay.nostr.band',
        'wss://nos.lol',
        'wss://relay.damus.io',
        'wss://relay.snort.social'
      ]

      const filter: Filter = {
        kinds: [0],
        authors: [pubkey],
        limit: 1
      }

      // Query with timeout (Jumble pattern)
      const events = await this.queryWithTimeout(relayUrls, filter, 3000)

      if (!events.length) {
        return defaultProfile
      }

      // Get the most recent profile event
      const profileEvent = events.sort((a, b) => b.created_at - a.created_at)[0]

      // Parse metadata
      let metadata = {}
      try {
        if (profileEvent.content) {
          metadata = JSON.parse(profileEvent.content)
        }
      } catch (error) {
        console.warn('Failed to parse profile metadata:', error)
      }

      return {
        event: profileEvent,
        metadata
      }
    } catch (error) {
      console.error(`Failed to fetch profile for ${pubkey}:`, error)
      return defaultProfile
    }
  }

  /**
   * Query with timeout wrapper (Jumble pattern)
   */
  private async queryWithTimeout(
    urls: string[],
    filter: Filter,
    timeoutMs: number = 3000
  ): Promise<NostrEvent[]> {
    return new Promise<NostrEvent[]>((resolve, reject) => {
      const events: NostrEvent[] = []
      const timeoutId = setTimeout(() => {
        resolve(events) // Return what we have on timeout
      }, timeoutMs)

      const sub = this.pool.subscribe(urls, filter, {
        onevent: (event: NostrEvent) => {
          events.push(event)
          this.trackEventSeenOn(event.id, sub)
        },
        oneose: () => {
          clearTimeout(timeoutId)
          resolve(events)
        },
        onclose: () => {
          clearTimeout(timeoutId)
          resolve(events)
        }
      })

      // Ensure cleanup
      setTimeout(() => {
        try {
          sub.close()
        } catch (e) {
          // Ignore close errors
        }
      }, timeoutMs + 100)
    })
  }

  /**
   * Track which relay an event was seen on (Jumble pattern)
   */
  private trackEventSeenOn(eventId: string, relay: any) {
    if (!this.eventSeenOn.has(eventId)) {
      this.eventSeenOn.set(eventId, new Set())
    }
    this.eventSeenOn.get(eventId)!.add(relay)
  }

  /**
   * Get relay hints for an event (Jumble pattern)
   */
  getEventHints(eventId: string): string[] {
    const relays = this.eventSeenOn.get(eventId)
    if (!relays) return []
    return Array.from(relays).map((relay: any) => relay.url).filter(Boolean)
  }

  /**
   * Batch fetch multiple profiles (optimized)
   */
  async fetchProfiles(pubkeys: string[]): Promise<Record<string, ProfileData>> {
    const results = await Promise.all(
      pubkeys.map(async (pubkey) => ({
        pubkey,
        profile: await this.fetchProfile(pubkey)
      }))
    )

    return results.reduce((acc, { pubkey, profile }) => {
      acc[pubkey] = profile
      return acc
    }, {} as Record<string, ProfileData>)
  }

  /**
   * Clear cache for a specific pubkey
   */
  invalidateProfile(pubkey: string) {
    this.profileCache.delete(pubkey)
    this.profileDataLoader.clear(pubkey)
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.profileCache.clear()
    this.profileDataLoader.clearAll()
  }

  /**
   * Fetch profiles from big relays (DataLoader optimization)
   */
  private async fetchProfilesFromBigRelays(pubkeys: readonly string[]): Promise<(NostrEvent | null)[]> {
    const events = await this.query([...BIG_RELAY_URLS], {
      authors: Array.from(new Set(pubkeys)),
      kinds: [0] // Profile metadata events
    })

    const eventsMap = new Map<string, NostrEvent>()
    for (const event of events) {
      const existing = eventsMap.get(event.pubkey)
      if (!existing || existing.created_at < event.created_at) {
        eventsMap.set(event.pubkey, event)
      }
    }

    return pubkeys.map((pubkey) => eventsMap.get(pubkey) || null)
  }

  /**
   * Query events from relays
   */
  private async query(urls: string[], filter: Filter | Filter[], onevent?: (evt: NostrEvent) => void): Promise<NostrEvent[]> {
    return await new Promise<NostrEvent[]>((resolve) => {
      const events: NostrEvent[] = []
      const sub = this.subscribe(urls, filter, {
        onevent(evt) {
          onevent?.(evt)
          events.push(evt)
        },
        oneose: (eosed) => {
          if (eosed) {
            sub.close()
            resolve(events)
          }
        },
        onclose: () => {
          resolve(events)
        }
      })
    })
  }

  /**
   * Subscribe to relay events with AUTH handling
   */
  private subscribe(
    urls: string[],
    filter: Filter | Filter[],
    callbacks: {
      onevent?: (evt: NostrEvent) => void
      oneose?: (eosed: boolean) => void
      onclose?: (url: string, reason: string) => void
    }
  ) {
    const relays = Array.from(new Set(urls.map(normalizeRelayUrl)))
    const filters = Array.isArray(filter) ? filter : [filter]

    const _knownIds = new Set<string>()
    let startedCount = 0
    let eosedCount = 0
    let eosed = false

    const subPromises: Promise<{ close: () => void }>[] = []

    relays.forEach((url) => {
      subPromises.push(startSub())

      async function startSub() {
        startedCount++
        const relay = await profileService.pool.ensureRelay(url, { connectionTimeout: 5000 }).catch(() => {
          return undefined
        })

        if (!relay) {
          if (!eosed) {
            eosedCount++
            eosed = eosedCount >= startedCount
            callbacks.oneose?.(eosed)
          }
          return { close: () => {} }
        }

        return relay.subscribe(filters, {
          receivedEvent: (relay, id) => {
            profileService.trackEventSeenOn(id, relay)
          },
          alreadyHaveEvent: (id: string) => {
            const have = _knownIds.has(id)
            if (have) return true
            _knownIds.add(id)
            return false
          },
          onevent: (evt: NostrEvent) => {
            callbacks.onevent?.(evt)
          },
          oneose: () => {
            if (eosed) return
            eosedCount++
            eosed = eosedCount >= startedCount
            callbacks.oneose?.(eosed)
          },
          onclose: (reason: string) => {
            callbacks.onclose?.(url, reason)
          }
        })
      }
    })

    return {
      close: () => {
        subPromises.forEach((subPromise) => {
          subPromise.then((sub) => sub.close()).catch(() => {})
        })
      }
    }
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats() {
    return {
      profileCacheSize: this.profileCache.size,
      profileCacheHits: this.profileCache.calculatedSize,
      eventSeenOnSize: this.eventSeenOn.size
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService()
export default profileService