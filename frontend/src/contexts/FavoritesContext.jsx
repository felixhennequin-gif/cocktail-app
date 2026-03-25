import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const { user, authFetch } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [pendingIds, setPendingIds] = useState(new Set())

  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return }
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((res) => {
        const data = Array.isArray(res) ? res : res.data ?? []
        setFavoriteIds(new Set(data.map((r) => r.id)))
      })
  }, [user, authFetch])

  const isFavorited = useCallback((recipeId) => favoriteIds.has(recipeId), [favoriteIds])
  const isPending = useCallback((recipeId) => pendingIds.has(recipeId), [pendingIds])

  const toggleFavorite = useCallback(async (recipeId) => {
    if (!user || pendingIds.has(recipeId)) return
    const willFavorite = !favoriteIds.has(recipeId)
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
      }
    } catch {
      // Rollback
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        willFavorite ? next.delete(recipeId) : next.add(recipeId)
        return next
      })
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(recipeId)
        return next
      })
    }
  }, [user, authFetch, favoriteIds, pendingIds])

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
