import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function useFavorites() {
  const { user, authFetch } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState(new Set())

  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return }
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFavoriteIds(new Set(data.map((r) => r.id))))
  }, [user, authFetch])

  const isFavorited = useCallback((recipeId) => favoriteIds.has(recipeId), [favoriteIds])

  const toggleFavorite = useCallback(async (recipeId) => {
    if (!user) return
    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      next.has(recipeId) ? next.delete(recipeId) : next.add(recipeId)
      return next
    })
    const res = await authFetch(`/api/favorites/${recipeId}`, { method: 'POST' })
    if (!res.ok) {
      // Rollback en cas d'erreur
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        next.has(recipeId) ? next.delete(recipeId) : next.add(recipeId)
        return next
      })
      return
    }
    const data = await res.json()
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      data.favorited ? next.add(recipeId) : next.delete(recipeId)
      return next
    })
  }, [user, authFetch])

  return { favoriteIds, isFavorited, toggleFavorite }
}
