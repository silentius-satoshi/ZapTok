import { createContext, useContext, useState, useEffect } from 'react'
import { useAppContext } from '@/hooks/useAppContext'

export type TRelaySet = {
  id: string
  name: string
  relayUrls: string[]
}

type TFavoriteRelaysContext = {
  favoriteRelays: string[]
  relaySets: TRelaySet[]
  addRelay: (url: string) => void
  removeRelay: (url: string) => void
  addRelaySet: (relaySet: TRelaySet) => void
  updateRelaySet: (relaySet: TRelaySet) => void
  deleteRelaySet: (id: string) => void
}

const FavoriteRelaysContext = createContext<TFavoriteRelaysContext | undefined>(undefined)

export const useFavoriteRelays = () => {
  const context = useContext(FavoriteRelaysContext)
  if (!context) {
    throw new Error('useFavoriteRelays must be used within a FavoriteRelaysProvider')
  }
  return context
}

export function FavoriteRelaysProvider({ children }: { children: React.ReactNode }) {
  const { config, addRelay: addRelayToConfig, removeRelay: removeRelayFromConfig } = useAppContext()
  const [relaySets, setRelaySets] = useState<TRelaySet[]>([])

  // Load relay sets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('relaysets')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setRelaySets(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to load relay sets:', error)
    }
  }, [])

  // Save relay sets to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('relaysets', JSON.stringify(relaySets))
    } catch (error) {
      console.error('Failed to save relay sets:', error)
    }
  }, [relaySets])

  const addRelay = (url: string) => {
    addRelayToConfig(url)
  }

  const removeRelay = (url: string) => {
    removeRelayFromConfig(url)
  }

  const addRelaySet = (relaySet: TRelaySet) => {
    setRelaySets(prev => [...prev.filter(set => set.id !== relaySet.id), relaySet])
  }

  const updateRelaySet = (relaySet: TRelaySet) => {
    setRelaySets(prev => prev.map(set => set.id === relaySet.id ? relaySet : set))
  }

  const deleteRelaySet = (id: string) => {
    setRelaySets(prev => prev.filter(set => set.id !== id))
  }

  return (
    <FavoriteRelaysContext.Provider
      value={{
        favoriteRelays: config.relayUrls,
        relaySets,
        addRelay,
        removeRelay,
        addRelaySet,
        updateRelaySet,
        deleteRelaySet,
      }}
    >
      {children}
    </FavoriteRelaysContext.Provider>
  )
}