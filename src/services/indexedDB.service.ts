/**
 * IndexedDB service for persistent storage with TTL management
 * Comprehensive IndexedDB architecture for enterprise-grade caching
 */

import { NostrEvent } from '@nostrify/nostrify';
import { RelayListConfig } from './relayList.service';

type TValue<T = any> = {
  key: string;
  value: T | null;
  addedAt: number;
};

const StoreNames = {
  RELAY_LIST_EVENTS: 'relayListEvents',
  RELAY_INFOS: 'relayInfos',
  FAVORITE_RELAY_EVENTS: 'favoriteRelayEvents',
  RELAY_SET_EVENTS: 'relaySetEvents',
  PROFILE_EVENTS: 'profileEvents', // Phase 6.1: Profile caching (Jumble pattern)
  FOLLOW_LIST_EVENTS: 'followListEvents', // Phase 6.2: Contact list caching (kind 3)
  VIDEO_EVENTS: 'videoEvents', // Phase 6.3: Video metadata caching (kinds 21, 22)
  THUMBNAIL_BLOBS: 'thumbnailBlobs', // Phase 6.4: Thumbnail image caching (blob storage)
} as const;

export interface TRelayInfo {
  url: string;
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: {
    auth_required?: boolean;
    payment_required?: boolean;
  };
}

class IndexedDBService {
  static instance: IndexedDBService;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
      IndexedDBService.instance.init();
    }
    return IndexedDBService.instance;
  }

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open('zaptok', 6); // Version 6: Added THUMBNAIL_BLOBS

        request.onerror = (event) => {
          reject(event);
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = () => {
          const db = request.result;

          // Create object stores with keyPath
          if (!db.objectStoreNames.contains(StoreNames.RELAY_LIST_EVENTS)) {
            db.createObjectStore(StoreNames.RELAY_LIST_EVENTS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(StoreNames.RELAY_INFOS)) {
            db.createObjectStore(StoreNames.RELAY_INFOS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(StoreNames.FAVORITE_RELAY_EVENTS)) {
            db.createObjectStore(StoreNames.FAVORITE_RELAY_EVENTS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(StoreNames.RELAY_SET_EVENTS)) {
            db.createObjectStore(StoreNames.RELAY_SET_EVENTS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(StoreNames.PROFILE_EVENTS)) {
            db.createObjectStore(StoreNames.PROFILE_EVENTS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(StoreNames.FOLLOW_LIST_EVENTS)) {
            db.createObjectStore(StoreNames.FOLLOW_LIST_EVENTS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(StoreNames.VIDEO_EVENTS)) {
            db.createObjectStore(StoreNames.VIDEO_EVENTS, { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains(StoreNames.THUMBNAIL_BLOBS)) {
            db.createObjectStore(StoreNames.THUMBNAIL_BLOBS, { keyPath: 'key' });
          }

          this.db = db;
        };
      });

      // Start cleanup after initialization
      setTimeout(() => this.cleanUp(), 1000 * 60); // 1 minute
    }
    return this.initPromise;
  }

  /**
   * Store NIP-65 relay list event
   */
  async putRelayListEvent(event: NostrEvent): Promise<NostrEvent> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_LIST_EVENTS, 'readwrite');
      const store = transaction.objectStore(StoreNames.RELAY_LIST_EVENTS);
      const key = event.pubkey;

      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        const oldValue = getRequest.result as TValue<NostrEvent> | undefined;
        if (oldValue?.value && oldValue.value.created_at >= event.created_at) {
          transaction.commit();
          return resolve(oldValue.value);
        }

        const putRequest = store.put(this.formatValue(key, event));
        putRequest.onsuccess = () => {
          transaction.commit();
          resolve(event);
        };

        putRequest.onerror = (event) => {
          transaction.commit();
          reject(event);
        };
      };

      getRequest.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Get NIP-65 relay list event for user
   */
  async getRelayListEvent(pubkey: string): Promise<NostrEvent | null> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_LIST_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.RELAY_LIST_EVENTS);
      const request = store.get(pubkey);

      request.onsuccess = () => {
        transaction.commit();
        resolve((request.result as TValue<NostrEvent>)?.value || null);
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Store relay information (NIP-11)
   */
  async putRelayInfo(relayInfo: TRelayInfo): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_INFOS, 'readwrite');
      const store = transaction.objectStore(StoreNames.RELAY_INFOS);

      const putRequest = store.put(this.formatValue(relayInfo.url, relayInfo));
      putRequest.onsuccess = () => {
        transaction.commit();
        resolve();
      };

      putRequest.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Get relay information
   */
  async getRelayInfo(url: string): Promise<TRelayInfo | null> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_INFOS, 'readonly');
      const store = transaction.objectStore(StoreNames.RELAY_INFOS);
      const request = store.get(url);

      request.onsuccess = () => {
        transaction.commit();
        resolve((request.result as TValue<TRelayInfo>)?.value || null);
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Store favorite relay event (kind 30378)
   */
  async putFavoriteRelayEvent(event: NostrEvent): Promise<NostrEvent> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.FAVORITE_RELAY_EVENTS, 'readwrite');
      const store = transaction.objectStore(StoreNames.FAVORITE_RELAY_EVENTS);
      const key = event.pubkey;

      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        const oldValue = getRequest.result as TValue<NostrEvent> | undefined;
        if (oldValue?.value && oldValue.value.created_at >= event.created_at) {
          transaction.commit();
          return resolve(oldValue.value);
        }

        const putRequest = store.put(this.formatValue(key, event));
        putRequest.onsuccess = () => {
          transaction.commit();
          resolve(event);
        };

        putRequest.onerror = (event) => {
          transaction.commit();
          reject(event);
        };
      };

      getRequest.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Get favorite relay event for user
   */
  async getFavoriteRelayEvent(pubkey: string): Promise<NostrEvent | null> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.FAVORITE_RELAY_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.FAVORITE_RELAY_EVENTS);
      const request = store.get(pubkey);

      request.onsuccess = () => {
        transaction.commit();
        resolve((request.result as TValue<NostrEvent>)?.value || null);
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Store profile event (kind 0) - Phase 6.1: Jumble pattern
   * Only stores if newer than existing cached profile
   */
  async putProfileEvent(event: NostrEvent): Promise<NostrEvent> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.PROFILE_EVENTS, 'readwrite');
      const store = transaction.objectStore(StoreNames.PROFILE_EVENTS);
      const key = event.pubkey;

      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        const oldValue = getRequest.result as TValue<NostrEvent> | undefined;

        // Only store if newer (replaceable event logic)
        if (oldValue?.value && oldValue.value.created_at >= event.created_at) {
          transaction.commit();
          return resolve(oldValue.value);
        }

        const putRequest = store.put(this.formatValue(key, event));
        putRequest.onsuccess = () => {
          transaction.commit();
          resolve(event);
        };

        putRequest.onerror = (event) => {
          transaction.commit();
          reject(event);
        };
      };

      getRequest.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Get profile event by pubkey - Phase 6.1: Jumble pattern
   */
  async getProfileEvent(pubkey: string): Promise<NostrEvent | null> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.PROFILE_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.PROFILE_EVENTS);
      const request = store.get(pubkey);

      request.onsuccess = () => {
        transaction.commit();
        resolve((request.result as TValue<NostrEvent>)?.value || null);
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Iterate all profile events - Phase 6.1: For FlexSearch rebuild
   */
  async iterateProfileEvents(callback: (event: NostrEvent) => Promise<void>): Promise<void> {
    await this.initPromise;
    if (!this.db) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(StoreNames.PROFILE_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.PROFILE_EVENTS);
      const request = store.openCursor();

      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const value = (cursor.value as TValue<NostrEvent>).value;
          if (value) {
            await callback(value);
          }
          cursor.continue();
        } else {
          transaction.commit();
          resolve();
        }
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Count profile events - Phase 6.1: For FlexSearch metrics
   */
  async countProfileEvents(): Promise<number> {
    await this.initPromise;
    if (!this.db) {
      return 0;
    }

    return new Promise<number>((resolve, reject) => {
      const transaction = this.db!.transaction(StoreNames.PROFILE_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.PROFILE_EVENTS);
      const request = store.count();

      request.onsuccess = () => {
        transaction.commit();
        resolve(request.result);
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Store follow list event (kind 3) - Phase 6.2: Contact list caching
   */
  async putFollowListEvent(event: NostrEvent): Promise<NostrEvent> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.FOLLOW_LIST_EVENTS, 'readwrite');
      const store = transaction.objectStore(StoreNames.FOLLOW_LIST_EVENTS);
      const key = event.pubkey;

      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        const oldValue = getRequest.result as TValue<NostrEvent> | undefined;

        // Only store if newer (replaceable event logic for kind 3)
        if (oldValue?.value && oldValue.value.created_at >= event.created_at) {
          transaction.commit();
          return resolve(oldValue.value);
        }

        const putRequest = store.put(this.formatValue(key, event));
        putRequest.onsuccess = () => {
          transaction.commit();
          resolve(event);
        };

        putRequest.onerror = (event) => {
          transaction.commit();
          reject(event);
        };
      };

      getRequest.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Get follow list event by pubkey - Phase 6.2: Offline-first contact lists
   */
  async getFollowListEvent(pubkey: string): Promise<NostrEvent | null> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.FOLLOW_LIST_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.FOLLOW_LIST_EVENTS);
      const request = store.get(pubkey);

      request.onsuccess = () => {
        transaction.commit();
        resolve((request.result as TValue<NostrEvent>)?.value || null);
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Store video event (kinds 21, 22) - Phase 6.3: Video metadata caching
   * Uses event ID as key since videos are regular events (not replaceable)
   */
  async putVideoEvent(event: NostrEvent): Promise<NostrEvent> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.VIDEO_EVENTS, 'readwrite');
      const store = transaction.objectStore(StoreNames.VIDEO_EVENTS);
      const key = event.id; // Use event ID as key (videos are regular events)

      const putRequest = store.put(this.formatValue(key, event));
      putRequest.onsuccess = () => {
        transaction.commit();
        resolve(event);
      };

      putRequest.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Get video event by event ID - Phase 6.3: Offline-first video metadata
   */
  async getVideoEvent(eventId: string): Promise<NostrEvent | null> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.VIDEO_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.VIDEO_EVENTS);
      const request = store.get(eventId);

      request.onsuccess = () => {
        transaction.commit();
        const value = request.result as TValue<NostrEvent> | undefined;
        
        // Check TTL (7 days)
        if (value?.value && value.addedAt > Date.now() - 1000 * 60 * 60 * 24 * 7) {
          resolve(value.value);
        } else {
          resolve(null);
        }
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Get video events by author pubkey - Phase 6.3: Offline profile video feeds
   * Scans all cached videos and filters by author
   */
  async getVideoEventsByAuthor(pubkey: string, limit: number = 20): Promise<NostrEvent[]> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.VIDEO_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.VIDEO_EVENTS);
      const request = store.openCursor();
      const results: NostrEvent[] = [];
      const ttl = Date.now() - 1000 * 60 * 60 * 24 * 7; // 7 days

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          const value = cursor.value as TValue<NostrEvent>;
          
          // Filter by author and check TTL
          if (value.value && value.value.pubkey === pubkey && value.addedAt > ttl) {
            results.push(value.value);
          }
          
          cursor.continue();
        } else {
          transaction.commit();
          
          // Sort by created_at descending (newest first)
          results.sort((a, b) => b.created_at - a.created_at);
          resolve(results);
        }
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Get recent video events - Phase 6.3: Offline feed population
   * Returns most recently cached videos across all authors
   */
  async getRecentVideoEvents(limit: number = 30): Promise<NostrEvent[]> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.VIDEO_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.VIDEO_EVENTS);
      const request = store.openCursor();
      const results: NostrEvent[] = [];
      const ttl = Date.now() - 1000 * 60 * 60 * 24 * 7; // 7 days

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const value = cursor.value as TValue<NostrEvent>;
          
          // Check TTL
          if (value.value && value.addedAt > ttl) {
            results.push(value.value);
          }
          
          cursor.continue();
        } else {
          transaction.commit();
          
          // Sort by created_at descending (newest first) and limit
          results.sort((a, b) => b.created_at - a.created_at);
          resolve(results.slice(0, limit));
        }
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Count cached video events - Phase 6.3: Metrics
   */
  async countVideoEvents(): Promise<number> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.VIDEO_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.VIDEO_EVENTS);
      const request = store.count();

      request.onsuccess = () => {
        transaction.commit();
        resolve(request.result);
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Format value with metadata for storage
   */
  private formatValue<T>(key: string, value: T): TValue<T> {
    return {
      key,
      value,
      addedAt: Date.now()
    };
  }

  /**
   * Clean up expired data
   * Following Jumble's TTL management pattern
   */
  private async cleanUp() {
    await this.initPromise;
    if (!this.db) return;

    const stores = [
      {
        name: StoreNames.RELAY_LIST_EVENTS,
        expirationTimestamp: Date.now() - 1000 * 60 * 60 * 24 // 1 day
      },
      {
        name: StoreNames.RELAY_INFOS,
        expirationTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 7 // 1 week
      },
      {
        name: StoreNames.FAVORITE_RELAY_EVENTS,
        expirationTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 30 // 1 month
      },
      {
        name: StoreNames.RELAY_SET_EVENTS,
        expirationTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 30 // 1 month
      },
      {
        name: StoreNames.PROFILE_EVENTS,
        expirationTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 7 // 7 days
      },
      {
        name: StoreNames.FOLLOW_LIST_EVENTS,
        expirationTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 7 // 7 days
      },
      {
        name: StoreNames.VIDEO_EVENTS,
        expirationTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 7 // 7 days
      }
    ];

    const transaction = this.db.transaction(
      stores.map(store => store.name),
      'readwrite'
    );

    await Promise.allSettled(
      stores.map(({ name, expirationTimestamp }) => {
        if (expirationTimestamp < 0) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
          const store = transaction.objectStore(name);
          const request = store.openCursor();

          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              const value: TValue = cursor.value;
              if (value.addedAt < expirationTimestamp) {
                cursor.delete();
              }
              cursor.continue();
            } else {
              resolve();
            }
          };

          request.onerror = (event) => {
            reject(event);
          };
        });
      })
    );
  }

  /**
   * Get all stored relay infos for cache warming
   */
  async getAllRelayInfos(): Promise<TRelayInfo[]> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_INFOS, 'readonly');
      const store = transaction.objectStore(StoreNames.RELAY_INFOS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as TValue<TRelayInfo>[];
        const relayInfos = results.map(item => item.value).filter(Boolean) as TRelayInfo[];
        resolve(relayInfos);
      };

      request.onerror = (event) => {
        reject(event);
      };
    });
  }

  /**
   * Get all stored relay list events for cache warming
   */
  async getAllRelayListEvents(): Promise<Array<{ pubkey: string; event: NostrEvent }>> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_LIST_EVENTS, 'readonly');
      const store = transaction.objectStore(StoreNames.RELAY_LIST_EVENTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as TValue<NostrEvent>[];
        const events = results
          .map(item => ({ pubkey: item.key, event: item.value }))
          .filter(item => item.event) as Array<{ pubkey: string; event: NostrEvent }>;
        resolve(events);
      };

      request.onerror = (event) => {
        reject(event);
      };
    });
  }

  /**
   * Delete specific relay info
   */
  async deleteRelayInfo(url: string): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_INFOS, 'readwrite');
      const store = transaction.objectStore(StoreNames.RELAY_INFOS);
      const request = store.delete(url);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(event);
      };
    });
  }

  /**
   * Delete relay list event for specific user
   */
  async deleteRelayListEvent(pubkey: string): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_LIST_EVENTS, 'readwrite');
      const store = transaction.objectStore(StoreNames.RELAY_LIST_EVENTS);
      const request = store.delete(pubkey);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(event);
      };
    });
  }

  /**
   * Clear all relay lists
   */
  async clearRelayLists(): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_LIST_EVENTS, 'readwrite');
      const store = transaction.objectStore(StoreNames.RELAY_LIST_EVENTS);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(event);
      };
    });
  }

  /**
   * Clear all relay infos
   */
  async clearRelayInfos(): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.RELAY_INFOS, 'readwrite');
      const store = transaction.objectStore(StoreNames.RELAY_INFOS);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(event);
      };
    });
  }

  /**
   * Phase 6.4: Thumbnail blob caching
   * Store thumbnail image blob for offline access
   */
  async putThumbnailBlob(url: string, blob: Blob): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.THUMBNAIL_BLOBS, 'readwrite');
      const store = transaction.objectStore(StoreNames.THUMBNAIL_BLOBS);

      const putRequest = store.put(this.formatValue(url, blob));
      putRequest.onsuccess = () => {
        transaction.commit();
        resolve();
      };

      putRequest.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }

  /**
   * Phase 6.4: Get cached thumbnail blob
   * Returns blob if cached and not expired (7-day TTL)
   */
  async getThumbnailBlob(url: string): Promise<Blob | null> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject('database not initialized');
      }

      const transaction = this.db.transaction(StoreNames.THUMBNAIL_BLOBS, 'readonly');
      const store = transaction.objectStore(StoreNames.THUMBNAIL_BLOBS);
      const request = store.get(url);

      request.onsuccess = () => {
        transaction.commit();
        const value = request.result as TValue<Blob> | undefined;
        
        // Check TTL (7 days)
        if (value?.value && value.addedAt > Date.now() - 1000 * 60 * 60 * 24 * 7) {
          resolve(value.value);
        } else {
          resolve(null);
        }
      };

      request.onerror = (event) => {
        transaction.commit();
        reject(event);
      };
    });
  }
}

const indexedDBService = IndexedDBService.getInstance();
export default indexedDBService;