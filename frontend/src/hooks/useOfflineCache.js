import { useState, useEffect } from 'react'

// Hook pour gérer le cache offline des recettes favorites
export function useOfflineCache() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Demande au service worker de mettre en cache la recette favorite
  const cacheFavorite = (recipeId) => {
    navigator.serviceWorker?.controller?.postMessage({ type: 'CACHE_FAVORITE', recipeId })
  }

  // Demande au service worker de supprimer la recette du cache
  const uncacheFavorite = (recipeId) => {
    navigator.serviceWorker?.controller?.postMessage({ type: 'UNCACHE_FAVORITE', recipeId })
  }

  return { isOnline, cacheFavorite, uncacheFavorite }
}
