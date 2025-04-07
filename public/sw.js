// snapnote-service-worker.js

const CACHE_NAME = 'snapnote-v1';
const DYNAMIC_CACHE = 'snapnote-dynamic-v1';
const SYNC_QUEUE_NAME = 'sync-notes-queue';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
];

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('offlineNotesSync', 1);
    dbRequest.onerror = event => reject('IndexedDB could not be opened');
    dbRequest.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingChanges')) {
        db.createObjectStore('pendingChanges', { keyPath: 'id', autoIncrement: true });
      }
    };
    dbRequest.onsuccess = event => resolve(event.target.result);
  });
}

async function savePendingChange(change) {
  try {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['pendingChanges'], 'readwrite');
      const store = tx.objectStore('pendingChanges');
      Promise.resolve(change.body).then(resolvedBody => {
        const request = store.add({ ...change, body: resolvedBody, timestamp: Date.now() });
        request.onsuccess = () => resolve(true);
        request.onerror = err => reject(false);
      }).catch(err => reject(false));
    });
  } catch (error) {
    return false;
  }
}

async function getPendingChanges() {
  try {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['pendingChanges'], 'readonly');
      const store = tx.objectStore('pendingChanges');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = err => reject([]);
    });
  } catch (error) {
    return [];
  }
}

async function hasPendingChanges() {
  const changes = await getPendingChanges();
  return changes.length > 0;
}

async function removePendingChange(id) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pendingChanges'], 'readwrite');
    const store = tx.objectStore('pendingChanges');
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = err => reject(false);
  });
}

// Install: cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (!cacheWhitelist.includes(name)) return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: handle network requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.protocol.startsWith('chrome-extension')) return;

  // For navigation requests (HTML pages), use a network-first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update dynamic cache with fresh index.html
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put('/index.html', responseClone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Handle non-GET API calls for /notes or /rest/v1
  if (event.request.method !== 'GET' &&
    (url.pathname.includes('/notes') || url.pathname.includes('/rest/v1'))
  ) {
    event.respondWith(
      fetch(event.request.clone()).catch(() => {
        return event.request.clone().text().then(bodyText => {
          return savePendingChange({
            url: event.request.url,
            method: event.request.method,
            headers: Array.from(event.request.headers.entries()),
            body: bodyText
          }).then(() => {
            self.clients.matchAll().then(clients => {
              clients.forEach(client => client.postMessage({
                type: 'PENDING_CHANGES_STATUS',
                hasPendingChanges: true
              }));
            });
            return new Response(JSON.stringify({
              success: true,
              offline: true,
              message: 'Your changes will be synchronized when you are back online'
            }), { status: 202, headers: { 'Content-Type': 'application/json' } });
          });
        });
      })
    );
    return;
  }

  // For API GET requests for /notes or /rest/v1, use network-first with cache fallback
  if (url.pathname.includes('/notes') || url.pathname.includes('/rest/v1')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(res => {
            return res || new Response(JSON.stringify({ error: 'Offline and not cached' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // For other requests, use a cache-first strategy with network fallback
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const resClone = res.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, resClone));
        return res;
      }).catch(() => {
        return new Response('Offline resource not available', { status: 503 });
      });
    })
  );
});

// Background sync: attempt to resend pending changes
self.addEventListener('sync', event => {
  if (event.tag === SYNC_QUEUE_NAME) {
    event.waitUntil(syncPendingChanges());
  }
});

async function syncPendingChanges() {
  const changes = await getPendingChanges();
  const syncResults = await Promise.all(changes.map(async change => {
    try {
      const requestInit = {
        method: change.method,
        headers: change.headers.reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {}),
        body: change.body,
        credentials: 'include'
      };
      const response = await fetch(change.url, requestInit);
      if (response.ok) {
        await removePendingChange(change.id);
        return { success: true };
      } else {
        return { success: false };
      }
    } catch (error) {
      return { success: false };
    }
  }));

  const stillHasPendingChanges = await hasPendingChanges();
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({
      type: 'PENDING_CHANGES_STATUS',
      hasPendingChanges: stillHasPendingChanges
    }));
  });
  return syncResults;
}

// Listen for messages (e.g., to clean caches or check pending changes)
self.addEventListener('message', event => {
  if (event.data === 'CLEAN_CACHES') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then(cache => {
        return cache.keys().then(requests => {
          const oldEntries = requests.slice(0, Math.max(0, requests.length - 100));
          return Promise.all(oldEntries.map(req => cache.delete(req)));
        });
      })
    );
  }
  if (event.data && event.data.type === 'CHECK_PENDING_CHANGES') {
    event.waitUntil(
      hasPendingChanges().then(hasPending => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: 'PENDING_CHANGES_RESPONSE',
            hasPendingChanges: hasPending
          });
        }
      })
    );
  }
});

// Push notifications: display notifications with payload data
self.addEventListener('push', event => {
  let payload = { title: 'SnapNote', body: 'You have a new notification!', data: {} };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    console.error('Push event data error:', e);
  }
  const options = {
    body: payload.body,
    icon: '/icons/icon-72x72.png',
    badge: '/icons/icon-72x72.png',
    data: payload.data,
  };
  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Handle notification click events
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
