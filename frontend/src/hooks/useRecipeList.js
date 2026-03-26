import { useState, useEffect, useRef, useCallback } from 'react'

const LIMIT = 12

/**
 * Hook pour fetcher les recettes avec pagination infinie via IntersectionObserver.
 * Prend en entrée les paramètres de filtres et retourne les recettes, l'état de chargement
 * et la ref de la sentinelle à attacher au DOM.
 */
export default function useRecipeList({ q, categoryId, minRating, maxTime, sortBy, sortOrder, tagIds, filterKey, setTags }) {
  const [recipes, setRecipes]         = useState([])
  const [total, setTotal]             = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)

  const sentinelRef = useRef(null)

  // Fonction de fetch d'une page de recettes
  const fetchPage = useCallback((page, append = false, signal = undefined) => {
    if (page === 1) setLoading(true)
    else            setLoadingMore(true)
    setError(null)

    const params = new URLSearchParams({ page, limit: LIMIT })
    if (q)          params.set('q', q)
    if (categoryId) params.set('categoryId', categoryId)
    if (minRating)  params.set('minRating', minRating)
    if (maxTime)    params.set('maxTime', maxTime)
    if (sortBy !== 'createdAt' || sortOrder !== 'desc') {
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
    }
    if (tagIds.length > 0) params.set('tags', tagIds.join(','))

    fetch(`/api/recipes?${params}`, { signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Erreur ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        const newRecipes = data.data ?? []
        setRecipes((prev) => append ? [...prev, ...newRecipes] : newRecipes)
        setTotal(data.total ?? 0)
        setCurrentPage(page)
        // Mise à jour des compteurs de recettes par tag si fournis
        if (data.tagCounts && setTags) {
          setTags((prevTags) => prevTags.map((tag) => {
            const found = data.tagCounts.find((tc) => Number(tc.id) === tag.id)
            return found ? { ...tag, recipesCount: found.count } : { ...tag, recipesCount: 0 }
          }))
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }, [q, categoryId, minRating, maxTime, sortBy, sortOrder, tagIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps — tagIds.join(',') est intentionnel (array instable)

  // Rechargement initial quand les filtres changent
  useEffect(() => {
    const controller = new AbortController()
    fetchPage(1, false, controller.signal)
    return () => controller.abort()
  }, [filterKey, fetchPage])

  const hasMore = recipes.length < total

  // IntersectionObserver — déclenche le chargement quand la sentinelle est visible
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPage(currentPage + 1, true)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, currentPage, filterKey, fetchPage])

  return {
    recipes,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    sentinelRef,
  }
}
