const CACHE_NAME = 'cocktails-v2'
const FAVORITES_CACHE_NAME = 'cocktail-favorites-v1'
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

// Activation : supprime TOUS les anciens caches (sauf les caches connus)
self.addEventListener('activate', (event) => {
  const knownCaches = [CACHE_NAME, FAVORITES_CACHE_NAME]
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !knownCaches.includes(k)).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Messages depuis l'application (CACHE_FAVORITE / UNCACHE_FAVORITE)
self.addEventListener('message', (event) => {
  const { type, recipeId } = event.data || {}

  if (type === 'CACHE_FAVORITE' && recipeId) {
    event.waitUntil(cacheFavoriteRecipe(recipeId))
  }

  if (type === 'UNCACHE_FAVORITE' && recipeId) {
    event.waitUntil(uncacheFavoriteRecipe(recipeId))
  }
})

// Pré-fetche et met en cache une recette favorite (détail + image)
async function cacheFavoriteRecipe(recipeId) {
  const cache = await caches.open(FAVORITES_CACHE_NAME)
  const recipeUrl = `/api/recipes/${recipeId}`

  try {
    const response = await fetch(recipeUrl)
    if (!response.ok) return
    const clone = response.clone()
    await cache.put(recipeUrl, clone)

    // Mise en cache de l'image si présente
    const data = await response.json()
    const imageUrl = data.imageUrl
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      const imgResponse = await fetch(imageUrl)
      if (imgResponse.ok) {
        await cache.put(imageUrl, imgResponse)
      }
    }
  } catch {
    // Échec silencieux — pas de connexion réseau
  }
}

// Supprime une recette favorite du cache
async function uncacheFavoriteRecipe(recipeId) {
  const cache = await caches.open(FAVORITES_CACHE_NAME)
  const recipeUrl = `/api/recipes/${recipeId}`

  // Récupère l'URL de l'image depuis le cache avant suppression
  const cached = await cache.match(recipeUrl)
  if (cached) {
    try {
      const data = await cached.json()
      const imageUrl = data.imageUrl
      if (imageUrl && imageUrl.startsWith('/uploads/')) {
        await cache.delete(imageUrl)
      }
    } catch {
      // Pas bloquant
    }
    await cache.delete(recipeUrl)
  }
}

// Fetch : stratégie selon le type de requête
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // Détail d'une recette — network-first, fallback sur le cache favoris
  const recipeDetailMatch = url.pathname.match(/^\/api\/recipes\/(\d+)$/)
  if (recipeDetailMatch) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request, { cacheName: FAVORITES_CACHE_NAME })
          if (cached) return cached
          return caches.match(request, { cacheName: CACHE_NAME })
        })
    )
    return
  }

  // Liste des favoris — network-first, fallback cache
  if (url.pathname === '/api/favorites') {
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
    return
  }

  // Images uploads — cache-first (les favoris sont pré-cachés dans FAVORITES_CACHE_NAME)
  if (url.pathname.startsWith('/uploads/')) {
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

  // Network-first pour : autres appels API, navigations HTML (dont index.html)
  if (
    url.pathname.startsWith('/api/') ||
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

// Réception d'un événement push depuis le serveur
self.addEventListener('push', (event) => {
  let payload = { title: 'Cocktail App', body: 'Vous avez une nouvelle notification', url: '/' }

  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload.body = event.data.text()
    }
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: payload.url || '/' },
    tag: 'cocktail-notif',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  )
})

// Clic sur la notification : ouvre ou focus l'onglet correspondant
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
