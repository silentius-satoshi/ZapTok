// ZapTok Service Worker - Lightning & Nostr PWA
const CACHE_VERSION = 'zaptok-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Files to cache for offline functionality
const CACHE_STATIC_NAME = 'zaptok-static-v3';
const CACHE_DYNAMIC_NAME = 'zaptok-dynamic-v3';

// Static assets to cache during install
const STATIC_FILES = [
  '/',
  '/manifest.webmanifest',
  '/images/ZapTok-v3.png',
  // Add other critical assets as needed
];

// Network-first cache strategy for dynamic content
const NETWORK_FIRST_PATTERNS = [
  /^https:\/\/.*\.nostr\.band/, // Nostr relay content
  /^wss?:\/\/.*/, // WebSocket connections
  /api/, // API calls
];

// Cache-first strategy for static assets
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:css|js)$/,
  /fonts\//,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing ZapTok Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ZapTok Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('zaptok-') && 
                     !cacheName.includes(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Cache cleanup complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip WebSocket upgrades
  if (request.headers.get('upgrade') === 'websocket') {
    return;
  }

  // Determine caching strategy
  const shouldNetworkFirst = NETWORK_FIRST_PATTERNS.some(pattern => 
    pattern.test(request.url)
  );
  
  const shouldCacheFirst = CACHE_FIRST_PATTERNS.some(pattern => 
    pattern.test(request.url)
  );

  if (shouldNetworkFirst) {
    event.respondWith(networkFirst(request));
  } else if (shouldCacheFirst) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Network-first strategy (for dynamic content)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url, error);
    throw error;
  }
}

// Stale-while-revalidate strategy (for general content)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW] Network request failed:', request.url);
      return null;
    });
  
  return cachedResponse || fetchPromise;
}

// Background sync for failed Lightning/Cashu transactions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'cashu-transaction-sync') {
    event.waitUntil(syncCashuTransactions());
  } else if (event.tag === 'lightning-payment-sync') {
    event.waitUntil(syncLightningPayments());
  }
});

// Sync failed Cashu transactions when back online
async function syncCashuTransactions() {
  try {
    console.log('[SW] Syncing failed Cashu transactions');
    
    // Get pending transactions from IndexedDB
    const pendingTransactions = await getPendingCashuTransactions();
    
    for (const transaction of pendingTransactions) {
      try {
        // Retry the transaction
        await retryTransaction(transaction);
        console.log('[SW] Successfully synced Cashu transaction:', transaction.id);
        
        // Remove from pending queue
        await removePendingTransaction(transaction.id);
        
        // Notify the app
        await notifyClients({
          type: 'cashu-transaction-synced',
          transaction
        });
      } catch (error) {
        console.error('[SW] Failed to sync Cashu transaction:', transaction.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Cashu transaction sync failed:', error);
  }
}

// Sync failed Lightning payments when back online
async function syncLightningPayments() {
  try {
    console.log('[SW] Syncing failed Lightning payments');
    
    // Implementation for Lightning payment sync
    // This would integrate with your Lightning infrastructure
    
  } catch (error) {
    console.error('[SW] Lightning payment sync failed:', error);
  }
}

// Push notification handling for Lightning/Cashu events
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
  }
  
  const options = {
    badge: '/images/ZapTok-v3.png',
    icon: '/images/ZapTok-v3.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: []
  };
  
  let title = 'ZapTok';
  let body = 'You have a new notification';
  
  // Handle different notification types
  switch (data.type) {
    case 'lightning-payment':
      title = '⚡ Lightning Payment';
      body = `Received ${data.amount} sats${data.from ? ` from ${data.from}` : ''}`;
      options.actions = [
        { action: 'view', title: 'View Payment' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
      break;
      
    case 'cashu-token':
      title = '🥜 Cashu Token';
      body = `New ${data.amount} sat token${data.from ? ` from ${data.from}` : ''}`;
      options.actions = [
        { action: 'redeem', title: 'Redeem Token' },
        { action: 'view', title: 'View Details' }
      ];
      break;
      
    case 'zap':
      title = '⚡ Zap Received';
      body = `${data.amount} sats zapped to your content!`;
      options.actions = [
        { action: 'view', title: 'View Content' },
        { action: 'thank', title: 'Send Thanks' }
      ];
      break;
      
    case 'comment':
      title = '💬 New Comment';
      body = data.preview || 'Someone commented on your video';
      options.actions = [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View Video' }
      ];
      break;
      
    default:
      title = data.title || title;
      body = data.body || body;
  }
  
  options.title = title;
  options.body = body;
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action, event.notification.data);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  let url = '/';
  
  // Handle different actions
  switch (event.action) {
    case 'view':
      if (data.url) {
        url = data.url;
      } else if (data.type === 'lightning-payment') {
        url = '/wallet';
      } else if (data.type === 'cashu-token') {
        url = '/wallet';
      } else if (data.videoId) {
        url = `/video/${data.videoId}`;
      }
      break;
      
    case 'redeem':
      if (data.type === 'cashu-token') {
        url = `/wallet?redeem=${data.token}`;
      }
      break;
      
    case 'reply':
      if (data.videoId) {
        url = `/video/${data.videoId}?reply=true`;
      }
      break;
      
    case 'thank':
      if (data.zapperPubkey) {
        url = `/profile/${data.zapperPubkey}?thank=true`;
      }
      break;
      
    default:
      // Default click action
      if (data.url) {
        url = data.url;
      }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'notification-action',
              action: event.action,
              data: data,
              url: url
            });
            return;
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Utility functions for IndexedDB operations
async function getPendingCashuTransactions() {
  // Implementation would use IndexedDB to get pending transactions
  return [];
}

async function removePendingTransaction(transactionId) {
  // Implementation would remove transaction from IndexedDB
}

async function retryTransaction(transaction) {
  // Implementation would retry the failed transaction
}

// Notify all clients about events
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

console.log('[SW] ZapTok Service Worker loaded');
