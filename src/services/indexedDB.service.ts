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
        const request = window.indexedDB.open('zaptok', 4); // Version 4: Added FOLLOW_LIST_EVENTS

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
}

const indexedDBService = IndexedDBService.getInstance();
export default indexedDBService;