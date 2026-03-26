import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Hook pour lire et mettre à jour les filtres de la liste de recettes depuis les search params URL.
 * Retourne les valeurs courantes des filtres et les handlers pour les modifier.
 */
export default function useRecipeFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Valeurs lues depuis l'URL (source de vérité)
  const q          = searchParams.get('q') || ''
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')) : null
  const minRating  = searchParams.get('minRating')  || ''
  const maxTime    = searchParams.get('maxTime')     || ''
  const sortBy     = searchParams.get('sortBy')      || 'createdAt'
  const sortOrder  = searchParams.get('sortOrder')   || 'desc'
  const tagIds     = searchParams.get('tags')
    ? searchParams.get('tags').split(',').map(Number).filter(Boolean)
    : []

  // État local pour l'input temps (debounce avant mise à jour URL)
  const [maxTimeInput, setMaxTimeInput] = useState(maxTime)
  const maxTimeDebounceRef = useRef(null)

  // Clé de filtres : quand elle change, on repart de la page 1
  const filterKey = `${q}|${categoryId}|${minRating}|${maxTime}|${sortBy}|${sortOrder}|${tagIds.join(',')}`

  // Met à jour un paramètre URL — réinitialise la pagination implicitement
  const setParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '' || value === undefined) {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
      return next
    }, { replace: true })
  }

  const toggleTag = (tagId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      const current = prev.get('tags') ? prev.get('tags').split(',').map(Number).filter(Boolean) : []
      const updated = current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]
      if (updated.length === 0) next.delete('tags')
      else next.set('tags', updated.join(','))
      return next
    }, { replace: true })
  }

  const handleMaxTimeChange = (e) => {
    const val = e.target.value
    setMaxTimeInput(val)
    clearTimeout(maxTimeDebounceRef.current)
    maxTimeDebounceRef.current = setTimeout(() => setParam('maxTime', val), 400)
  }

  const handleSortChange = (sortOptions) => (e) => {
    const opt = sortOptions[parseInt(e.target.value)]
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('sortBy', opt.sortBy)
      next.set('sortOrder', opt.sortOrder)
      return next
    }, { replace: true })
  }

  const resetFilters = () => {
    setMaxTimeInput('')
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      if (prev.get('q')) next.set('q', prev.get('q'))
      return next
    }, { replace: true })
  }

  const hasAdvancedFilters = !!(minRating || maxTime || tagIds.length > 0)
  const hasActiveFilters   = !!(categoryId || hasAdvancedFilters)

  return {
    // Valeurs des filtres
    q,
    categoryId,
    minRating,
    maxTime,
    sortBy,
    sortOrder,
    tagIds,
    filterKey,
    // État local input temps
    maxTimeInput,
    // Flags
    hasAdvancedFilters,
    hasActiveFilters,
    // Handlers
    setParam,
    toggleTag,
    handleMaxTimeChange,
    handleSortChange,
    resetFilters,
  }
}
