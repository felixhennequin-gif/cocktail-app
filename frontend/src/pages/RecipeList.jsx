import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import RecipeCard from '../components/RecipeCard'
import RecipeCardGrid from '../components/RecipeCardGrid'
import DifficultyBadge from '../components/DifficultyBadge'
import { SkeletonCard, SkeletonCardGrid } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'

const LIMIT = 12

export default function RecipeList() {
  const { user, authFetch }               = useAuth()
  const { t }                             = useTranslation()
  const [searchParams, setSearchParams]   = useSearchParams()

  // L'URL est la source de vérité pour les filtres
  const q          = searchParams.get('q') || ''
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')) : null
  const minRating  = searchParams.get('minRating')  || ''
  const maxTime    = searchParams.get('maxTime')     || ''
  const sortBy     = searchParams.get('sortBy')      || 'createdAt'
  const sortOrder  = searchParams.get('sortOrder')   || 'desc'
  const tagIds     = searchParams.get('tags') ? searchParams.get('tags').split(',').map(Number).filter(Boolean) : []

  // Valeur affichée dans l'input de recherche (mise à jour immédiate, envoyée après debounce)
  const [inputValue, setInputValue]     = useState(q)
  const [maxTimeInput, setMaxTimeInput] = useState(maxTime)

  const [dailyRecipe, setDailyRecipe] = useState(null)

  const [recipes, setRecipes]         = useState([])
  const [categories, setCategories]   = useState([])
  const [tags, setTags]               = useState([])
  const [dynamicTagCounts, setDynamicTagCounts] = useState({})
  const [total, setTotal]             = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [viewMode, setViewMode] = useState('grid')

  const debounceRef = useRef(null)
  const maxTimeDebounceRef = useRef(null)
  const sentinelRef = useRef(null)
  // Clé de filtres : quand elle change, on repart de la page 1
  const filterKey = `${q}|${categoryId}|${minRating}|${maxTime}|${sortBy}|${sortOrder}|${tagIds.join(',')}`

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

  // Chargement des catégories, tags et cocktail du jour au montage
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.ok ? r.json() : [])
      .then(setCategories)
    fetch('/api/tags')
      .then((r) => r.ok ? r.json() : [])
      .then(setTags)
    fetch('/api/recipes/daily')
      .then((r) => r.ok ? r.json() : null)
      .then(setDailyRecipe)
      .catch(() => setDailyRecipe(null))
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
        if (data.tagCounts) {
          const countsMap = {}
          data.tagCounts.forEach(tc => { countsMap[tc.id] = tc.count })
          setDynamicTagCounts(countsMap)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }, [q, categoryId, minRating, maxTime, sortBy, sortOrder, tagIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rechargement initial quand les filtres changent
  useEffect(() => {
    const controller = new AbortController()
    fetchPage(1, false, controller.signal)
    return () => controller.abort()
  }, [filterKey]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [hasMore, loadingMore, loading, currentPage, filterKey]) // eslint-disable-line react-hooks/exhaustive-deps

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
    { label: t('recipes.sortOptions.newest'),   sortBy: 'createdAt',      sortOrder: 'desc' },
    { label: t('recipes.sortOptions.oldest'),   sortBy: 'createdAt',      sortOrder: 'asc'  },
    { label: t('recipes.sortOptions.topRated'), sortBy: 'avgRating',      sortOrder: 'desc' },
    { label: t('recipes.sortOptions.timeAsc'),  sortBy: 'prepTime',       sortOrder: 'asc'  },
    { label: t('recipes.sortOptions.timeDesc'), sortBy: 'prepTime',       sortOrder: 'desc' },
    { label: t('recipes.sortOptions.popular'),  sortBy: 'favoritesCount', sortOrder: 'desc' },
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

  const hasActiveFilters = categoryId || minRating || maxTime || tagIds.length > 0

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

  const resetFilters = () => {
    setMaxTimeInput('')
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      if (prev.get('q')) next.set('q', prev.get('q'))
      // tags aussi réinitialisés
      return next
    }, { replace: true })
  }

  const pageTitle = q
    ? t('recipes.searchPageTitle', { q })
    : t('recipes.pageTitle')

  return (
    <div>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content="Découvrez et explorez notre catalogue de recettes de cocktails. Filtrez par catégorie, note, temps de préparation et plus encore." />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content="Explorez des centaines de recettes de cocktails." />
        <meta property="og:type" content="website" />
      </Helmet>
      {/* Hero section */}
      {!q && !categoryId && !minRating && !maxTime && tagIds.length === 0 && (
        <div className="mb-10 text-center py-10 sm:py-14">
          <h1 className="text-4xl sm:text-5xl font-serif font-normal text-gray-900 dark:text-gray-100 leading-tight mb-4">
            {t('recipes.heroTitle').split(' ').map((word, i) =>
              word === 'occasion' || word === 'every'
                ? <em key={i} className="text-gold-400 dark:text-gold-400 not-italic">{word} </em>
                : word + ' '
            )}
          </h1>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto mb-8">
            {t('recipes.heroSubtitle')}
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="#recipes"
              className="px-6 py-2.5 bg-gold-400 text-ink-900 rounded-xl font-medium text-sm hover:bg-gold-300 transition-colors"
            >
              {t('recipes.heroCta')}
            </a>
            {!user && (
              <Link
                to="/register"
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl font-medium text-sm hover:border-gold-400 dark:hover:border-gold-400 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
              >
                {t('recipes.heroCtaSecondary')}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Cocktail du jour — hero section */}
      {dailyRecipe && (
        <Link
          to={`/recipes/${dailyRecipe.id}`}
          className="block mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-gold-100 to-gold-50 dark:from-ink-800 dark:to-ink-900 border border-gold-200 dark:border-gold-700/30 hover:shadow-lg transition-shadow"
        >
          <div className="flex flex-col sm:flex-row">
            {dailyRecipe.imageUrl && (
              <div className="sm:w-56 h-48 sm:h-auto flex-shrink-0 relative">
                <img
                  src={dailyRecipe.imageUrl}
                  alt={dailyRecipe.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent sm:bg-gradient-to-l" />
              </div>
            )}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 mb-2">
                {t('recipes.dailyCocktail')}
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-2">
                {dailyRecipe.name}
              </h2>
              {dailyRecipe.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {dailyRecipe.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
                {dailyRecipe.avgRating !== null && (
                  <span className="flex items-center gap-1">
                    <span className="text-amber-500">&#9733;</span>
                    {dailyRecipe.avgRating}
                  </span>
                )}
                <span>{dailyRecipe.prepTime} min</span>
                <DifficultyBadge difficulty={dailyRecipe.difficulty} />
              </div>
              <span className="inline-flex items-center text-sm font-medium text-gold-500 dark:text-gold-400 hover:text-gold-600 dark:hover:text-gold-300">
                {t('recipes.discover')} &rarr;
              </span>
            </div>
          </div>
        </Link>
      )}

      <h1 id="recipes" className="text-3xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-6">{t('recipes.allTitle')}</h1>

      {/* Barre de recherche */}
      <div className="mb-4">
        <label htmlFor="search-recipes" className="sr-only">{t('recipes.searchPlaceholder')}</label>
        <input
          id="search-recipes"
          type="text"
          value={inputValue}
          onChange={handleSearchChange}
          placeholder={t('recipes.searchPlaceholder')}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
        />
      </div>

      {/* Filtre par catégorie */}
      <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setParam('categoryId', null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            categoryId === null
              ? 'bg-gold-400 text-ink-900'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500'
          }`}
        >
          {t('recipes.allCategories')}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setParam('categoryId', cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoryId === cat.id
                ? 'bg-gold-400 text-ink-900'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Filtre par tags */}
      {tags.length > 0 && (
        <div className="mb-4">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-2">{t('recipes.filterByTags')}</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  tagIds.includes(tag.id)
                    ? 'bg-gold-400 text-ink-900'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500'
                }`}
              >
                {tag.name}
                {(() => {
                  const count = dynamicTagCounts[tag.id] ?? tag.recipesCount
                  return count > 0 ? <span className="ml-1 opacity-60">{count}</span> : null
                })()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtres supplémentaires */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 py-3 border-t border-b border-gray-100 dark:border-gray-700">
        {/* Tri */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('recipes.sortLabel')}</span>
          <select
            value={currentSortIndex === -1 ? 0 : currentSortIndex}
            onChange={handleSortChange}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold-400"
          >
            {SORT_OPTIONS.map((o, i) => (
              <option key={i} value={i}>{o.label}</option>
            ))}
          </select>
        </div>
        {/* Note minimale */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('recipes.minRatingLabel')}</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setParam('minRating', n === 0 ? null : n)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  (minRating ? parseInt(minRating) : 0) === n
                    ? 'bg-gold-400 text-ink-900'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500'
                }`}
              >
                {n === 0 ? '–' : `${n}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Temps max */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('recipes.maxTimeLabel')}</span>
          <input
            type="number"
            min="1"
            value={maxTimeInput}
            onChange={handleMaxTimeChange}
            placeholder={t('recipes.maxTimeUnit')}
            className="w-20 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('recipes.maxTimeUnit')}</span>
        </div>

        {/* Réinitialiser */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            {t('recipes.resetFilters')}
          </button>
        )}

        {/* Toggle vue liste/grille */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'text-gold-500 bg-gold-50 dark:bg-gold-900/20' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
            title="Liste"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'text-gold-500 bg-gold-50 dark:bg-gold-900/20' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}
            title="Grille"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Liste des recettes */}
      {loading ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-3'
        }>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            viewMode === 'grid' ? <SkeletonCardGrid key={i} /> : <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-16">{error}</p>
      ) : recipes.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500 py-16">{t('recipes.noResults')}</p>
      ) : (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-3'
          }>
            {recipes.map((recipe) =>
              viewMode === 'grid' ? (
                <RecipeCardGrid
                  key={recipe.id}
                  recipe={recipe}
                  isFavorited={favoriteIds.has(recipe.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ) : (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isFavorited={favoriteIds.has(recipe.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              )
            )}
          </div>

          {/* Skeletons pendant le chargement supplémentaire */}
          {loadingMore && (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4'
                : 'flex flex-col gap-3 mt-3'
            }>
              {[1, 2, 3].map((i) => (
                viewMode === 'grid' ? <SkeletonCardGrid key={i} /> : <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Sentinelle IntersectionObserver */}
          <div ref={sentinelRef} className="h-4" />

          {/* Message fin de liste */}
          {!hasMore && total > 0 && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
              {t('recipes.allLoaded')}
            </p>
          )}
        </>
      )}

      {/* Compteur total */}
      {!loading && total > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
          {t('recipes.totalCount', { count: total })}
        </p>
      )}
    </div>
  )
}
