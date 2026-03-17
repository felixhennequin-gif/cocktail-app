const CACHE_NAME = 'cocktails-v1'
const OFFLINE_URL = '/offline.html'

// Ressources statiques à pré-cacher à l'installation
const PRECACHE_URLS = [
  '/',
  '/offline.html',
]

// Installation : pré-cache les ressources essentielles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activation : supprime les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch : stratégie selon le type de requête
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET et les extensions de navigateur
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // Network-first pour les appels API
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache les réponses API réussies
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Cache-first pour les ressources statiques (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          // Fallback page offline pour les navigations HTML
          if (request.destination === 'document') {
            return caches.match(OFFLINE_URL)
          }
        })
    })
  )
})
