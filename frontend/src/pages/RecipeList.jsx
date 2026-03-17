import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import RecipeCard from '../components/RecipeCard'
import { SkeletonCard } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'

const LIMIT = 20

export default function RecipeList() {
  const { user, authFetch }               = useAuth()
  const [searchParams, setSearchParams]   = useSearchParams()

  // L'URL est la source de vérité pour les filtres
  const q          = searchParams.get('q') || ''
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')) : null
  const minRating  = searchParams.get('minRating')  || ''
  const maxTime    = searchParams.get('maxTime')     || ''
  const sortBy     = searchParams.get('sortBy')      || 'createdAt'
  const sortOrder  = searchParams.get('sortOrder')   || 'desc'

  // Valeur affichée dans l'input de recherche (mise à jour immédiate, envoyée après debounce)
  const [inputValue, setInputValue]     = useState(q)
  const [maxTimeInput, setMaxTimeInput] = useState(maxTime)

  const [recipes, setRecipes]         = useState([])
  const [categories, setCategories]   = useState([])
  const [total, setTotal]             = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)
  const [favoriteIds, setFavoriteIds] = useState(new Set())

  const debounceRef = useRef(null)
  const maxTimeDebounceRef = useRef(null)
  // Clé de filtres : quand elle change, on repart de la page 1
  const filterKey = `${q}|${categoryId}|${minRating}|${maxTime}|${sortBy}|${sortOrder}`

  // Met à jour un param URL — réinitialise la page
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

  // Chargement des catégories au montage
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.ok ? r.json() : [])
      .then(setCategories)
  }, [])

  // Chargement des favoris si connecté
  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return }
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFavoriteIds(new Set(data.map((r) => r.id))))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

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
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }, [q, categoryId, minRating, maxTime, sortBy, sortOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rechargement initial quand les filtres changent
  useEffect(() => {
    const controller = new AbortController()
    fetchPage(1, false, controller.signal)
    return () => controller.abort()
  }, [filterKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => fetchPage(currentPage + 1, true)

  const handleSearchChange = (e) => {
    const val = e.target.value
    setInputValue(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setParam('q', val), 300)
  }

  const handleMaxTimeChange = (e) => {
    const val = e.target.value
    setMaxTimeInput(val)
    clearTimeout(maxTimeDebounceRef.current)
    maxTimeDebounceRef.current = setTimeout(() => setParam('maxTime', val), 400)
  }

  const handleToggleFavorite = async (recipeId) => {
    if (!user) return
    const res = await authFetch(`/api/favorites/${recipeId}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      data.favorited ? next.add(recipeId) : next.delete(recipeId)
      return next
    })
  }

  const SORT_OPTIONS = [
    { label: 'Plus récentes',       sortBy: 'createdAt',      sortOrder: 'desc' },
    { label: 'Plus anciennes',      sortBy: 'createdAt',      sortOrder: 'asc'  },
    { label: 'Mieux notées',        sortBy: 'avgRating',      sortOrder: 'desc' },
    { label: 'Temps (croissant)',   sortBy: 'prepTime',       sortOrder: 'asc'  },
    { label: 'Temps (décroissant)', sortBy: 'prepTime',       sortOrder: 'desc' },
    { label: 'Plus populaires',     sortBy: 'favoritesCount', sortOrder: 'desc' },
  ]

  const handleSortChange = (e) => {
    const opt = SORT_OPTIONS[parseInt(e.target.value)]
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('sortBy', opt.sortBy)
      next.set('sortOrder', opt.sortOrder)
      return next
    }, { replace: true })
  }

  const currentSortIndex = SORT_OPTIONS.findIndex(
    (o) => o.sortBy === sortBy && o.sortOrder === sortOrder
  )

  const hasActiveFilters = categoryId || minRating || maxTime

  const resetFilters = () => {
    setMaxTimeInput('')
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      if (prev.get('q')) next.set('q', prev.get('q'))
      return next
    }, { replace: true })
  }

  const hasMore = recipes.length < total

  const pageTitle = q
    ? `Recherche "${q}" — Cocktails`
    : 'Toutes les recettes de cocktails'

  return (
    <div>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content="Découvrez et explorez notre catalogue de recettes de cocktails. Filtrez par catégorie, note, temps de préparation et plus encore." />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content="Explorez des centaines de recettes de cocktails." />
        <meta property="og:type" content="website" />
      </Helmet>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Toutes les recettes</h1>

      {/* Barre de recherche */}
      <div className="mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={handleSearchChange}
          placeholder="Rechercher un cocktail..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
      </div>

      {/* Filtre par catégorie */}
      <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setParam('categoryId', null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            categoryId === null
              ? 'bg-amber-500 text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500'
          }`}
        >
          Toutes
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setParam('categoryId', cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryId === cat.id
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Filtres supplémentaires */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 py-3 border-t border-b border-gray-100 dark:border-gray-700">
        {/* Tri */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Trier</span>
          <select
            value={currentSortIndex === -1 ? 0 : currentSortIndex}
            onChange={handleSortChange}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {SORT_OPTIONS.map((o, i) => (
              <option key={i} value={i}>{o.label}</option>
            ))}
          </select>
        </div>
        {/* Note minimale */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Note min.</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setParam('minRating', n === 0 ? null : n)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  (minRating ? parseInt(minRating) : 0) === n
                    ? 'bg-amber-500 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500'
                }`}
              >
                {n === 0 ? '–' : `${n}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Temps max */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Temps max</span>
          <input
            type="number"
            min="1"
            value={maxTimeInput}
            onChange={handleMaxTimeChange}
            placeholder="min"
            className="w-20 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500">min</span>
        </div>

        {/* Réinitialiser */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {/* Liste des recettes */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-16">{error}</p>
      ) : recipes.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500 py-16">Aucune recette trouvée.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorited={favoriteIds.has(recipe.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>

          {/* Charger plus */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? 'Chargement...' : `Charger plus (${recipes.length} / ${total})`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Compteur total */}
      {!loading && total > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          {total} recette{total > 1 ? 's' : ''} au total
        </p>
      )}
    </div>
  )
}
