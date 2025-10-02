import { SimplePool, Filter, Event as NostrEvent, Relay } from 'nostr-tools'
import { AbstractRelay } from 'nostr-tools/abstract-relay'
import { sha256 } from '@noble/hashes/sha2'
import DataLoader from 'dataloader'
import { getReplaceableCoordinate, isReplaceableEvent } from '@/lib/event'
import { BIG_RELAY_URLS, isLocalNetworkUrl, normalizeRelayUrl } from '@/constants/relays'

type TimelineRef = [string, number] // [eventId, created_at]
type SubRequestFilter = Omit<Filter, 'since' | 'until'> & { limit: number }

export type FeedSubRequest = {
  urls: string[]
  filter: Omit<Filter, 'since' | 'until'>
}

type TimelineData = {
  refs: TimelineRef[]
  filter: SubRequestFilter
  urls: string[]
}

export interface TimelineCallbacks {
  onEvents: (events: NostrEvent[], eosed: boolean) => void
  onNew: (event: NostrEvent) => void
  onClose?: (url: string, reason: string) => void
}

export interface TimelineOptions {
  startLogin?: () => void
  needSort?: boolean
}

class TimelineService extends EventTarget {
  private pool: SimplePool
  private timelines: Record<string, TimelineData | string[] | undefined> = {}
  
  // Event caching system similar to proven patterns
  private eventCacheMap = new Map<string, Promise<NostrEvent | undefined>>()
  private replaceableEventCacheMap = new Map<string, NostrEvent>()
  
  // DataLoader for efficient event fetching
  private eventDataLoader = new DataLoader<string, NostrEvent | undefined>(
    (ids) => Promise.all(ids.map((id) => this._fetchEvent(id))),
    { cacheMap: this.eventCacheMap }
  )

  // DataLoader for big relay optimization
  private fetchEventFromBigRelaysDataloader = new DataLoader<string, NostrEvent | undefined>(
    this.fetchEventsFromBigRelays.bind(this),
    { cache: false, batchScheduleFn: (callback) => setTimeout(callback, 50) }
  )

  constructor() {
    super()
    this.pool = new SimplePool()
    this.pool.trackRelays = true
  }

  /**
   * Generate stable timeline key for caching (from Jumble's approach)
   */
  private generateTimelineKey(urls: string[], filter: Filter): string {
    const stableFilter: any = {}
    Object.entries(filter)
      .sort()
      .forEach(([key, value]) => {
        if (Array.isArray(value)) {
          stableFilter[key] = [...value].sort()
        } else {
          stableFilter[key] = value
        }
      })
    
    const paramsStr = JSON.stringify({
      urls: [...urls].sort(),
      filter: stableFilter
    })
    
    const encoder = new TextEncoder()
    const data = encoder.encode(paramsStr)
    const hashBuffer = sha256(data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Generate key for multiple timeline subscriptions
   */
  private generateMultipleTimelinesKey(subRequests: FeedSubRequest[]): string {
    const keys = subRequests.map(({ urls, filter }) => this.generateTimelineKey(urls, filter))
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(keys.sort()))
    const hashBuffer = sha256(data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Main timeline subscription method (based on Jumble's subscribeTimeline)
   */
  async subscribeTimeline(
    subRequests: FeedSubRequest[],
    callbacks: TimelineCallbacks,
    options: TimelineOptions = {}
  ): Promise<{ closer: () => void; timelineKey: string }> {
    const { onEvents, onNew, onClose } = callbacks
    const { startLogin, needSort = true } = options

    const newEventIdSet = new Set<string>()
    const requestCount = subRequests.length
    const threshold = Math.floor(requestCount / 2)
    let eventIdSet = new Set<string>()
    let events: NostrEvent[] = []
    let eosedCount = 0

    // Create individual timeline subscriptions
    const subs = await Promise.all(
      subRequests.map(({ urls, filter }) => {
        return this._subscribeTimeline(
          urls,
          { ...filter, limit: filter.limit || 200 } as SubRequestFilter,
          {
            onEvents: (_events, _eosed) => {
              if (_eosed) {
                eosedCount++
              }

              // Deduplicate and merge events (Jumble's approach)
              _events.forEach((evt) => {
                if (eventIdSet.has(evt.id)) return
                eventIdSet.add(evt.id)
                events.push(evt)
                this.addEventToCache(evt)
              })

              // Sort by created_at and limit
              events = events.sort((a, b) => b.created_at - a.created_at).slice(0, filter.limit || 200)
              eventIdSet = new Set(events.map((evt) => evt.id))

              // Emit when threshold reached (Jumble's threshold strategy)
              if (eosedCount >= threshold) {
                onEvents(events, eosedCount >= requestCount)
              }
            },
            onNew: (evt) => {
              if (newEventIdSet.has(evt.id)) return
              newEventIdSet.add(evt.id)
              this.addEventToCache(evt)
              onNew(evt)
            },
            onClose
          },
          { startLogin, needSort }
        )
      })
    )

    // Generate combined timeline key
    const key = this.generateMultipleTimelinesKey(subRequests)
    this.timelines[key] = subs.map((sub) => sub.timelineKey)

    return {
      closer: () => {
        subs.forEach((sub) => sub.closer())
      },
      timelineKey: key
    }
  }

  /**
   * Individual timeline subscription (based on Jumble's _subscribeTimeline)
   */
  private async _subscribeTimeline(
    urls: string[],
    filter: SubRequestFilter,
    callbacks: TimelineCallbacks,
    options: TimelineOptions = {}
  ): Promise<{ closer: () => void; timelineKey: string }> {
    const { onEvents, onNew, onClose } = callbacks
    const { startLogin, needSort = true } = options

    const relays = Array.from(new Set(urls))
    const key = this.generateTimelineKey(relays, filter)
    const timeline = this.timelines[key] as TimelineData | undefined
    
    let cachedEvents: NostrEvent[] = []
    let since: number | undefined

    // Use cached timeline if available (Jumble's caching strategy)
    if (timeline && timeline.refs && timeline.refs.length && needSort) {
      cachedEvents = await this.loadEventsFromRefs(timeline.refs.slice(0, filter.limit))
      if (cachedEvents.length) {
        onEvents([...cachedEvents], false)
        since = cachedEvents[0].created_at + 1
      }
    }

    // Subscribe to live updates
    let events: NostrEvent[] = []
    let eosedAt: number | null = null
    
    const subCloser = this.subscribe(relays, since ? { ...filter, since } : filter, {
      startLogin,
      onevent: (evt: NostrEvent) => {
        this.addEventToCache(evt)
        
        if (!eosedAt) {
          // Not eosed yet, push to events
          events.push(evt)
        } else if (evt.created_at > eosedAt) {
          // New event after EOSE
          onNew(evt)
        }
      },
      oneose: (eosed) => {
        if (!eosed) return
        eosedAt = Date.now() / 1000

        // Sort and cache events (Jumble's approach)
        if (needSort && events.length) {
          events = events.sort((a, b) => b.created_at - a.created_at).slice(0, filter.limit)
          
          // Update timeline cache
          this.timelines[key] = {
            refs: events.map((evt) => [evt.id, evt.created_at]),
            filter,
            urls: relays
          }
        }

        onEvents([...events.concat(cachedEvents).slice(0, filter.limit)], true)
      },
      onclose: onClose
    })

    return {
      closer: subCloser.close,
      timelineKey: key
    }
  }

  /**
   * Core subscription method (based on Jumble's subscribe)
   */
  subscribe(
    urls: string[],
    filter: Filter | Filter[],
    callbacks: {
      onevent?: (evt: NostrEvent) => void
      oneose?: (eosed: boolean) => void
      onclose?: (url: string, reason: string) => void
      startLogin?: () => void
      onAllClose?: (reasons: string[]) => void
    }
  ): { close: () => void } {
    const { onevent, oneose, onclose, startLogin, onAllClose } = callbacks
    const relays = Array.from(new Set(urls))
    const filters = Array.isArray(filter) ? filter : [filter]
    
    const knownIds = new Set<string>()
    let startedCount = 0
    let eosedCount = 0
    let eosed = false
    let closedCount = 0
    const closeReasons: string[] = []

    const subPromises = relays.map(async (url) => {
      try {
        startedCount++
        const relay = await this.pool.ensureRelay(url, { connectionTimeout: 5000 })
        
        if (!relay) {
          if (!eosed) {
            eosedCount++
            eosed = eosedCount >= startedCount
            oneose?.(eosed)
          }
          return { close: () => {} }
        }

        return relay.subscribe(filters, {
          receivedEvent: (relay, id) => {
            this.trackEventSeenOn(id, relay)
          },
          alreadyHaveEvent: (id: string) => {
            const have = knownIds.has(id)
            if (have) return true
            knownIds.add(id)
            return false
          },
          onevent: (evt: NostrEvent) => {
            onevent?.(evt)
          },
          oneose: () => {
            if (eosed) return
            eosedCount++
            eosed = eosedCount >= startedCount
            oneose?.(eosed)
          },
          onclose: (reason: string) => {
            // Handle auth-required (from Jumble's approach)
            if (reason.startsWith('auth-required') && startLogin) {
              startLogin()
              return
            }

            closedCount++
            closeReasons.push(reason)
            onclose?.(url, reason)
            
            if (closedCount >= startedCount) {
              onAllClose?.(closeReasons)
            }
          }
        })
      } catch (error) {
        console.error(`Failed to connect to relay ${url}:`, error)
        return { close: () => {} }
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
   * Add event to cache (from Jumble's caching system)
   */
  private addEventToCache(event: NostrEvent) {
    this.eventDataLoader.prime(event.id, Promise.resolve(event))
    
    if (isReplaceableEvent(event.kind)) {
      const coordinate = getReplaceableCoordinate(event.kind, event.pubkey, event.tags)
      const cachedEvent = this.replaceableEventCacheMap.get(coordinate)
      if (!cachedEvent || event.created_at > cachedEvent.created_at) {
        this.replaceableEventCacheMap.set(coordinate, event)
      }
    }
  }

  /**
   * Track which relay an event was seen on
   */
  private trackEventSeenOn(eventId: string, relay: AbstractRelay) {
    let set = this.pool.seenOn.get(eventId)
    if (!set) {
      set = new Set()
      this.pool.seenOn.set(eventId, set)
    }
    set.add(relay)
  }

  /**
   * Query events from relays (core method)
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
   * Load events from timeline refs
   */
  private async loadEventsFromRefs(refs: TimelineRef[]): Promise<NostrEvent[]> {
    const events: NostrEvent[] = []
    const eventPromises = refs.map(([id]) => this.eventDataLoader.load(id))
    const results = await Promise.all(eventPromises)
    
    for (const event of results) {
      if (event) events.push(event)
    }
    
    return events
  }

  /**
   * Fetch single event (placeholder for now)
   */
  private async _fetchEvent(id: string): Promise<NostrEvent | undefined> {
    // This would implement event fetching logic similar to Jumble
    // For now, return undefined - will be implemented in later phases
    return undefined
  }

  /**
   * Load more timeline events
   */
  async loadMoreTimeline(key: string, until: number, limit: number): Promise<NostrEvent[]> {
    const timeline = this.timelines[key]
    if (!timeline) return []

    if (Array.isArray(timeline)) {
      // Multiple timelines - load from each and merge
      const timelines = await Promise.all(
        timeline.map((timelineKey) => this._loadMoreTimeline(timelineKey, until, limit))
      )

      const eventIdSet = new Set<string>()
      const events: NostrEvent[] = []
      
      timelines.forEach((timelineEvents) => {
        timelineEvents.forEach((evt) => {
          if (eventIdSet.has(evt.id)) return
          eventIdSet.add(evt.id)
          events.push(evt)
        })
      })
      
      return events.sort((a, b) => b.created_at - a.created_at).slice(0, limit)
    }

    return this._loadMoreTimeline(key, until, limit)
  }

  /**
   * Load more from individual timeline
   */
  private async _loadMoreTimeline(key: string, until: number, limit: number): Promise<NostrEvent[]> {
    const timeline = this.timelines[key] as TimelineData | undefined
    if (!timeline) return []

    // Filter refs by until timestamp and load events
    const filteredRefs = timeline.refs.filter(([, created_at]) => created_at < until)
    const limitedRefs = filteredRefs.slice(0, limit)
    
    return this.loadEventsFromRefs(limitedRefs)
  }

  /**
   * Emit new event (for external integrations)
   */
  emitNewEvent(event: NostrEvent) {
    this.dispatchEvent(new CustomEvent('newEvent', { detail: event }))
  }

  /**
   * Get seen event relay URLs
   */
  getSeenEventRelayUrls(eventId: string): string[] {
    const relays = Array.from(this.pool.seenOn.get(eventId)?.values() || [])
    return relays.map((relay) => relay.url)
  }

  /**
   * Get event hints (excluding local network URLs)
   */
  getEventHints(eventId: string): string[] {
    return this.getSeenEventRelayUrls(eventId).filter((url) => !isLocalNetworkUrl(url))
  }

  /**
   * Fetch events from big relays (DataLoader optimization)
   */
  private async fetchEventsFromBigRelays(ids: readonly string[]): Promise<(NostrEvent | undefined)[]> {
    const events = await this.query([...BIG_RELAY_URLS], {
      ids: Array.from(new Set(ids)),
      limit: ids.length
    })
    
    const eventsMap = new Map<string, NostrEvent>()
    for (const event of events) {
      eventsMap.set(event.id, event)
    }

    return ids.map((id) => eventsMap.get(id))
  }

  /**
   * Determine target relays with big relay fallback
   */
  async determineTargetRelays(event: NostrEvent, options: {
    specifiedRelayUrls?: string[]
    additionalRelayUrls?: string[]
  } = {}): Promise<string[]> {
    const { specifiedRelayUrls, additionalRelayUrls = [] } = options

    let relays: string[]
    if (specifiedRelayUrls?.length) {
      relays = specifiedRelayUrls
    } else {
      // Default to big relays if no specific relays provided
      relays = [...BIG_RELAY_URLS, ...additionalRelayUrls]
    }

    // Normalize relay URLs
    return Array.from(new Set(relays.map(normalizeRelayUrl)))
  }
}

// Export singleton instance
export const timelineService = new TimelineService()
export default timelineService