import type { TFeedInfo } from '@/providers/FeedProvider'

class LocalStorageService {
  private getKey(key: string, pubkey?: string): string {
    return pubkey ? `${key}_${pubkey}` : key
  }

  getFeedInfo(pubkey: string): TFeedInfo | null {
    try {
      const key = this.getKey('feedInfo', pubkey)
      const stored = localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to get feed info:', error)
    }
    return null
  }

  setFeedInfo(feedInfo: TFeedInfo, pubkey: string): void {
    try {
      const key = this.getKey('feedInfo', pubkey)
      localStorage.setItem(key, JSON.stringify(feedInfo))
    } catch (error) {
      console.error('Failed to set feed info:', error)
    }
  }

  removeFeedInfo(pubkey: string): void {
    try {
      const key = this.getKey('feedInfo', pubkey)
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove feed info:', error)
    }
  }

  // Generic storage methods
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error(`Failed to get ${key}:`, error)
    }
    return defaultValue || null
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to set ${key}:`, error)
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error)
    }
  }
}

const storage = new LocalStorageService()
export default storage