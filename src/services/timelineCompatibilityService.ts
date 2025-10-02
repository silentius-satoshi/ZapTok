import { timelineService } from './timelineService'
import { relayDistributionService, RelayList } from './relayDistributionService'
import { Event as NostrEvent } from 'nostr-tools'

/**
 * Compatibility service to bridge timeline service with existing patterns
 * Provides a gradual migration path from direct queries to timeline subscriptions
 */
export class TimelineCompatibilityService {
  
  /**
   * Create a relay list fetcher that works with existing relay service
   */
  createRelayFetcher(fetchRelayListFn: (pubkey: string) => Promise<any>): (pubkey: string) => Promise<RelayList> {
    return async (pubkey: string): Promise<RelayList> => {
      try {
        const relayList = await fetchRelayListFn(pubkey)
        
        // Handle different relay list formats
        if (relayList && typeof relayList === 'object') {
          return {
            read: Array.isArray(relayList.read) ? relayList.read : [],
            write: Array.isArray(relayList.write) ? relayList.write : [],
            originalRelays: Array.isArray(relayList.originalRelays) ? relayList.originalRelays : []
          }
        }
        
        // Fallback to empty relay list
        return { read: [], write: [], originalRelays: [] }
      } catch (error) {
        console.warn(`Failed to fetch relay list for ${pubkey}:`, error)
        return { read: [], write: [], originalRelays: [] }
      }
    }
  }

  /**
   * Subscribe to global video feed using timeline service
   */
  async subscribeToGlobalVideoFeed(
    relayUrl: string,
    callbacks: {
      onEvents: (events: NostrEvent[]) => void
      onNewEvent: (event: NostrEvent) => void
      onError?: (error: Error) => void
    }
  ): Promise<() => void> {
    try {
      const subRequests = relayDistributionService.generateGlobalFeedSubRequest(
        relayUrl,
        [1], // Text notes for now, will expand to video kinds
        200
      )

      const { closer } = await timelineService.subscribeTimeline(
        subRequests,
        {
          onEvents: (events, eosed) => {
            if (eosed || events.length > 0) {
              callbacks.onEvents(events)
            }
          },
          onNew: callbacks.onNewEvent,
          onClose: (url, reason) => {
            console.warn(`Relay ${url} closed: ${reason}`)
          }
        },
        { needSort: true }
      )

      return closer
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      callbacks.onError?.(err)
      return () => {} // Return noop closer
    }
  }

  /**
   * Subscribe to following feed using timeline service
   */
  async subscribeToFollowingFeed(
    userPubkey: string,
    followings: string[],
    relayFetcher: (pubkey: string) => Promise<RelayList>,
    callbacks: {
      onEvents: (events: NostrEvent[]) => void
      onNewEvent: (event: NostrEvent) => void
      onError?: (error: Error) => void
    }
  ): Promise<() => void> {
    try {
      const allPubkeys = [userPubkey, ...followings]
      
      const subRequests = await relayDistributionService.generateSubRequestsForPubkeys(
        allPubkeys,
        userPubkey,
        relayFetcher
      )

      const { closer } = await timelineService.subscribeTimeline(
        subRequests,
        {
          onEvents: (events, eosed) => {
            if (eosed || events.length > 0) {
              callbacks.onEvents(events)
            }
          },
          onNew: callbacks.onNewEvent,
          onClose: (url, reason) => {
            console.warn(`Relay ${url} closed: ${reason}`)
          }
        },
        { needSort: true }
      )

      return closer
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      callbacks.onError?.(err)
      return () => {} // Return noop closer
    }
  }

  /**
   * Subscribe to author profile events using timeline service
   */
  async subscribeToAuthorEvents(
    pubkey: string,
    relayFetcher: (pubkey: string) => Promise<RelayList>,
    callbacks: {
      onEvents: (events: NostrEvent[]) => void
      onNewEvent: (event: NostrEvent) => void
      onError?: (error: Error) => void
    },
    kinds: number[] = [0] // Profile metadata by default
  ): Promise<() => void> {
    try {
      const relayList = await relayFetcher(pubkey)
      
      const subRequests = relayDistributionService.generateProfileSubRequest(
        pubkey,
        relayList,
        kinds,
        10 // Small limit for profile queries
      )

      const { closer } = await timelineService.subscribeTimeline(
        subRequests,
        {
          onEvents: (events, eosed) => {
            if (eosed || events.length > 0) {
              callbacks.onEvents(events)
            }
          },
          onNew: callbacks.onNewEvent,
          onClose: (url, reason) => {
            console.warn(`Relay ${url} closed: ${reason}`)
          }
        },
        { needSort: true }
      )

      return closer
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      callbacks.onError?.(err)
      return () => {} // Return noop closer
    }
  }

  /**
   * Subscribe to notifications using timeline service
   */
  async subscribeToNotifications(
    userPubkey: string,
    relayFetcher: (pubkey: string) => Promise<RelayList>,
    callbacks: {
      onEvents: (events: NostrEvent[]) => void
      onNewEvent: (event: NostrEvent) => void
      onError?: (error: Error) => void
    }
  ): Promise<() => void> {
    try {
      const relayList = await relayFetcher(userPubkey)
      
      const notificationKinds = [1, 6, 7, 9735, 16] // text notes, reposts, reactions, zaps, generic reposts
      const urls = relayList.read.length > 0 ? relayList.read.slice(0, 5) : relayDistributionService.deduplicateRelayUrls([])

      const subRequests = [{
        urls: urls.length > 0 ? urls : ['wss://relay.primal.net', 'wss://relay.nostr.band'],
        filter: {
          '#p': [userPubkey],
          kinds: notificationKinds,
          limit: 100
        }
      }]

      const { closer } = await timelineService.subscribeTimeline(
        subRequests,
        {
          onEvents: (events, eosed) => {
            // Filter out self-events for notifications
            const filteredEvents = events.filter(event => event.pubkey !== userPubkey)
            if (eosed || filteredEvents.length > 0) {
              callbacks.onEvents(filteredEvents)
            }
          },
          onNew: (event) => {
            // Only notify about events from others
            if (event.pubkey !== userPubkey) {
              callbacks.onNewEvent(event)
            }
          },
          onClose: (url, reason) => {
            console.warn(`Notification relay ${url} closed: ${reason}`)
          }
        },
        { needSort: true }
      )

      return closer
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      callbacks.onError?.(err)
      return () => {} // Return noop closer
    }
  }

  /**
   * Convert direct query pattern to timeline subscription
   * This helps migrate existing hooks gradually
   */
  async convertQueryToTimeline(
    relayUrls: string[],
    filter: any,
    callbacks: {
      onEvents: (events: NostrEvent[]) => void
      onNewEvent?: (event: NostrEvent) => void
      onError?: (error: Error) => void
    }
  ): Promise<() => void> {
    try {
      const subRequests = [{
        urls: relayUrls,
        filter: {
          ...filter,
          limit: filter.limit || 100
        }
      }]

      const { closer } = await timelineService.subscribeTimeline(
        subRequests,
        {
          onEvents: (events, eosed) => {
            if (eosed || events.length > 0) {
              callbacks.onEvents(events)
            }
          },
          onNew: callbacks.onNewEvent || (() => {}),
          onClose: (url, reason) => {
            console.warn(`Query relay ${url} closed: ${reason}`)
          }
        },
        { needSort: true }
      )

      return closer
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      callbacks.onError?.(err)
      return () => {} // Return noop closer
    }
  }

  /**
   * Get timeline service instance for advanced usage
   */
  getTimelineService() {
    return timelineService
  }

  /**
   * Get relay distribution service instance
   */
  getRelayDistributionService() {
    return relayDistributionService
  }
}

// Export singleton instance
export const timelineCompatibilityService = new TimelineCompatibilityService()
export default timelineCompatibilityService