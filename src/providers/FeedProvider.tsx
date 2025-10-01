import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useNostr } from '@nostrify/react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useFavoriteRelays } from './FavoriteRelaysProvider'
import storage from '@/services/local-storage.service'

export type TFeedType = 'relay' | 'relays' | 'following' | 'bookmarks'

export type TFeedInfo = {
  feedType: TFeedType
  id?: string | null
}

type TFeedContext = {
  feedInfo: TFeedInfo
  relayUrls: string[]
  isReady: boolean
  switchFeed: (
    feedType: TFeedType,
    options?: { activeRelaySetId?: string; pubkey?: string; relay?: string | null }
  ) => Promise<void>
}

const FeedContext = createContext<TFeedContext | undefined>(undefined)

export const useFeed = () => {
  const context = useContext(FeedContext)
  if (!context) {
    throw new Error('useFeed must be used within a FeedProvider')
  }
  return context
}

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const { nostr } = useNostr()
  const { user } = useCurrentUser()
  const { relaySets } = useFavoriteRelays()

  const [feedInfo, setFeedInfo] = useState<TFeedInfo>(() => {
    const pubkey = user?.pubkey
    if (!pubkey) {
      return { feedType: 'relay' }
    }
    
    const storedFeedInfo = storage.getFeedInfo?.(pubkey)
    return storedFeedInfo || { feedType: 'relay' }
  })

  const isInitializedRef = useRef(false)

  // Load feed info when user changes
  useEffect(() => {
    const pubkey = user?.pubkey
    if (!pubkey) {
      setFeedInfo({ feedType: 'relay' })
      return
    }

    if (!isInitializedRef.current) {
      const storedFeedInfo = storage.getFeedInfo?.(pubkey)
      if (storedFeedInfo) {
        setFeedInfo(storedFeedInfo)
      }
      isInitializedRef.current = true
    }
  }, [user?.pubkey])

  // Get relay URLs based on current feed
  const relayUrls = (() => {
    switch (feedInfo.feedType) {
      case 'relay': {
        // Single relay from a relay set
        const relaySet = relaySets.find(set => set.id === feedInfo.id)
        return relaySet ? [relaySet.relayUrls[0]] : ['wss://relay.nostr.band']
      }
      case 'relays': {
        // Multiple relays from a relay set
        const relaySet = relaySets.find(set => set.id === feedInfo.id)
        return relaySet ? relaySet.relayUrls : ['wss://relay.nostr.band']
      }
      case 'following': {
        // Use all available relays for following feed
        return relaySets.length > 0 
          ? relaySets.flatMap(set => set.relayUrls)
          : ['wss://relay.nostr.band']
      }
      case 'bookmarks': {
        // Use all available relays for bookmarks
        return relaySets.length > 0 
          ? relaySets.flatMap(set => set.relayUrls)
          : ['wss://relay.nostr.band']
      }
      default:
        return ['wss://relay.nostr.band']
    }
  })()

  const switchFeed = async (
    feedType: TFeedType,
    options?: { activeRelaySetId?: string; pubkey?: string; relay?: string | null }
  ) => {
    const pubkey = user?.pubkey || options?.pubkey
    let newFeedInfo: TFeedInfo

    if (feedType === 'relay' && options?.activeRelaySetId) {
      newFeedInfo = { feedType, id: options.activeRelaySetId }
    } else if (feedType === 'relays' && options?.activeRelaySetId) {
      newFeedInfo = { feedType, id: options.activeRelaySetId }
    } else if (feedType === 'following') {
      newFeedInfo = { feedType }
    } else if (feedType === 'bookmarks') {
      newFeedInfo = { feedType }
    } else {
      newFeedInfo = { feedType: 'relay' }
    }

    setFeedInfo(newFeedInfo)

    // Persist to storage
    if (pubkey && storage.setFeedInfo) {
      storage.setFeedInfo(newFeedInfo, pubkey)
    }
  }

  const contextValue: TFeedContext = {
    feedInfo,
    relayUrls,
    isReady: true,
    switchFeed,
  }

  return (
    <FeedContext.Provider value={contextValue}>
      {children}
    </FeedContext.Provider>
  )
}