const CACHE_NAME = 'cocktails-v2'
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = [
  '/offline.html',
]

// Installation : pré-cache uniquement la page offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activation : supprime TOUS les anciens caches
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

  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // Network-first pour : API, uploads, navigations HTML (dont index.html)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    request.destination === 'document' ||
    request.mode === 'navigate'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached
            if (request.destination === 'document' || request.mode === 'navigate') {
              return caches.match(OFFLINE_URL)
            }
          })
        })
    )
    return
  }

  // Cache-first UNIQUEMENT pour les assets avec hash (/assets/*)
  // Ces fichiers changent de nom à chaque build, donc le cache est safe
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first pour tout le reste (manifest.json, sw.js, fonts, etc.)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})