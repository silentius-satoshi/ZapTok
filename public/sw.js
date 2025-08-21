// ZapTok Service Worker - Lightning & Nostr PWA
const CACHE_VERSION = 'zaptok-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Files to cache for offline functionality
const CACHE_STATIC_NAME = 'zaptok-static-v3';
const CACHE_DYNAMIC_NAME = 'zaptok-dynamic-v3';

// Static assets to cache during install
const STATIC_FILES = [
  '/ZapTok/',
  '/ZapTok/manifest.webmanifest',
  '/ZapTok/images/ZapTok-v3.png',
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
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
        // Don't prevent installation due to cache failures
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.allSettled(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('zaptok-') &&
                     !cacheName.includes(CACHE_VERSION);
            })
            .map((cacheName) => {
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Cache cleanup failed:', error);
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip WebSocket upgrades
  if (request.headers.get('upgrade') === 'websocket') {
    return;
  }

  // Skip HEAD requests to avoid cache errors
  if (request.method === 'HEAD') {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    console.error('[SW] Invalid URL, letting browser handle:', request.url);
    return;
  }

  // Skip malformed URLs that contain metadata mixed into the URL path
  // These appear to be video URLs with metadata appended incorrectly
  if (url.pathname.includes(' x ') || url.pathname.includes(' m ') ||
      url.pathname.includes(' image ') || url.pathname.includes(' fallback ') ||
      url.pathname.includes(' service ')) {
    console.log('[SW] Skipping malformed media URL:', request.url);
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
    event.respondWith(
      networkFirst(request).catch(error => {
        console.error('[SW] Network-first strategy failed:', error);
        return new Response('Network error', { status: 408 });
      })
    );
  } else if (shouldCacheFirst) {
    event.respondWith(
      cacheFirst(request).catch(error => {
        console.error('[SW] Cache-first strategy failed:', error);
        return new Response('Cache error', { status: 500 });
      })
    );
  } else {
    event.respondWith(
      staleWhileRevalidate(request).catch(error => {
        console.error('[SW] Stale-while-revalidate strategy failed:', error);
        return new Response('Service error', { status: 500 });
      })
    );
  }
});

// Network-first strategy (for dynamic content)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok && networkResponse.status < 400) {
      try {
        const cache = await caches.open(DYNAMIC_CACHE);
        // Only cache GET requests with valid responses
        if (request.method === 'GET') {
          await cache.put(request, networkResponse.clone());
        }
      } catch (cacheError) {
        console.log('[SW] Failed to cache response:', cacheError);
      }
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    try {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    } catch (cacheError) {
      console.log('[SW] Cache lookup failed:', cacheError);
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      try {
        const offlineResponse = await caches.match('/');
        if (offlineResponse) {
          return offlineResponse;
        }
      } catch (offlineError) {
        console.log('[SW] Failed to get offline page:', offlineError);
      }
    }

    // Create a minimal error response
    return new Response('Network error', {
      status: 408,
      statusText: 'Request Timeout'
    });
  }
}

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch (cacheError) {
    console.log('[SW] Cache lookup failed:', cacheError);
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok && networkResponse.status < 400) {
      try {
        const cache = await caches.open(STATIC_CACHE);
        // Only cache GET requests with valid responses
        if (request.method === 'GET') {
          await cache.put(request, networkResponse.clone());
        }
      } catch (cacheError) {
        console.log('[SW] Failed to cache static response:', cacheError);
      }
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url, error);

    // Return a minimal error response
    return new Response('Resource not available', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

// Stale-while-revalidate strategy (for general content)
async function staleWhileRevalidate(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok && networkResponse.status < 400) {
          try {
            // Only cache GET requests with valid responses
            if (request.method === 'GET') {
              cache.put(request, networkResponse.clone()).catch(cacheError => {
                console.log('[SW] Background cache update failed:', cacheError);
              });
            }
          } catch (cacheError) {
            console.log('[SW] Failed to update cache:', cacheError);
          }
        }
        return networkResponse;
      })
      .catch((error) => {
        console.log('[SW] Network request failed:', request.url);
        return null;
      });

    return cachedResponse || (await fetchPromise) || new Response('Service unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  } catch (error) {
    console.error('[SW] Stale-while-revalidate failed:', error);

    // Return a minimal error response
    return new Response('Service error', {
      status: 500,
      statusText: 'Internal Server Error'
    });
  }
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
    badge: '/ZapTok/images/ZapTok-v3.png',
    icon: '/ZapTok/images/ZapTok-v3.png',
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

// Only log in development or keep the essential loaded message
console.log('[SW] ZapTok Service Worker loaded');
