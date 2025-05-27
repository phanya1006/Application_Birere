// Version du cache - à incrémenter lors des mises à jour
const CACHE_VERSION = 'v2';
const PRECACHE = `birere-${CACHE_VERSION}`;
const RUNTIME = 'runtime';

// Fichiers à mettre en cache lors de l'installation
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/products.json',
  '/icons/icon-72x72.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  './' // Fallback pour les deep links
];

// Stratégie: Cache First avec réseau de secours
const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request);
  return cachedResponse || fetch(request);
};

// Stratégie: Network First avec cache de secours
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(RUNTIME);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    return await caches.match(request);
  }
};

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== PRECACHE && cacheName !== RUNTIME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Gestion des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore les requêtes non-GET et les requêtes cross-origin
  if (request.method !== 'GET' || !url.origin.startsWith(self.location.origin)) {
    return;
  }

  // Stratégies par type de ressource
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    // Pages HTML: réseau d'abord
    event.respondWith(networkFirst(request));
  } else if (url.pathname.includes('/api/')) {
    // API: réseau d'abord avec mise en cache
    event.respondWith(networkFirst(request));
  } else if (PRECACHE_URLS.some(staticUrl => url.pathname.includes(staticUrl))) {
    // Ressources statiques: cache d'abord
    event.respondWith(cacheFirst(request));
  } else {
    // Par défaut: réseau avec cache de secours
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  }
});

// Background Sync pour les commandes hors ligne
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(
      syncCartWithServer().catch(error => {
        console.error('Échec synchronisation panier:', error);
        // Réessaye automatiquement au prochain sync
        return Promise.reject(error);
      })
    );
  }
});

// Fonction de synchronisation du panier
const syncCartWithServer = async () => {
  const clients = await self.clients.matchAll();
  const cartData = await getCartFromIDB(); // À implémenter si vous utilisez IndexedDB
  
  if (!cartData || cartData.length === 0) {
    return Promise.resolve();
  }

  const response = await fetch('/api/sync-cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(cartData)
  });

  if (!response.ok) {
    throw new Error('Échec de la synchronisation');
  }

  // Notifie tous les clients (onglets ouverts)
  clients.forEach(client => {
    client.postMessage({
      type: 'cart-synced',
      data: cartData
    });
  });
};

// Gestion des notifications push
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const client = clients.find(c => c.focused) || clients[0];
      if (client) {
        client.navigate(event.notification.data.url);
        client.focus();
      } else {
        self.clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Message entre le SW et l'application
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});