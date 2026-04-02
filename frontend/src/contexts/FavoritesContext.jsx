import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { useOfflineCache } from '../hooks/useOfflineCache'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const { user, authFetch } = useAuth()
  const { showToast } = useToast()
  const { cacheFavorite, uncacheFavorite } = useOfflineCache()
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [pendingIds, setPendingIds] = useState(new Set())

  const favoriteIdsRef = useRef(favoriteIds)
  const pendingIdsRef = useRef(pendingIds)

  useEffect(() => { favoriteIdsRef.current = favoriteIds }, [favoriteIds])
  useEffect(() => { pendingIdsRef.current = pendingIds }, [pendingIds])

  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return }
    authFetch('/api/favorites?idsOnly=true')
      .then((r) => r.ok ? r.json() : { ids: [] })
      .then((res) => {
        setFavoriteIds(new Set(res.ids ?? []))
      })
  }, [user, authFetch])

  const isFavorited = useCallback((recipeId) => favoriteIds.has(recipeId), [favoriteIds])
  const isPending = useCallback((recipeId) => pendingIds.has(recipeId), [pendingIds])

  const toggleFavorite = useCallback(async (recipeId) => {
    if (!user || pendingIdsRef.current.has(recipeId)) return
    const willFavorite = !favoriteIdsRef.current.has(recipeId)
    setPendingIds((prev) => new Set(prev).add(recipeId))
    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      willFavorite ? next.add(recipeId) : next.delete(recipeId)
      return next
    })
    try {
      const res = await authFetch(`/api/favorites/${recipeId}`, {
        method: willFavorite ? 'POST' : 'DELETE',
      })
      if (!res.ok) {
        // Rollback
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          willFavorite ? next.delete(recipeId) : next.add(recipeId)
          return next
        })
        showToast('Erreur lors de la mise à jour des favoris', 'error')
      } else {
        // Synchronise le cache offline avec l'état du favori
        if (willFavorite) {
          cacheFavorite(recipeId)
        } else {
          uncacheFavorite(recipeId)
        }
      }
    } catch {
      // Rollback
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        willFavorite ? next.delete(recipeId) : next.add(recipeId)
        return next
      })
      showToast('Erreur lors de la mise à jour des favoris', 'error')
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(recipeId)
        return next
      })
    }
  }, [user, authFetch])

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorited, toggleFavorite, isPending }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
