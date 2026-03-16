import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
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
  const page       = parseInt(searchParams.get('page')) || 1

  // Valeur affichée dans l'input de recherche (mise à jour immédiate, envoyée après debounce)
  const [inputValue, setInputValue]       = useState(q)
  const [maxTimeInput, setMaxTimeInput]   = useState(maxTime)

  const [recipes, setRecipes]             = useState([])
  const [categories, setCategories]       = useState([])
  const [total, setTotal]                 = useState(0)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [favoriteIds, setFavoriteIds]     = useState(new Set())

  const debounceRef = useRef(null)
  const maxTimeDebounceRef = useRef(null)

  // Met à jour un param URL — réinitialise la page sauf si on change la page elle-même
  const setParam = (key, value, resetPage = true) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '' || value === undefined) {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
      if (resetPage && key !== 'page') next.delete('page')
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

  // Rechargement des recettes à chaque changement de l'URL
  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ page, limit: LIMIT })
    if (q)          params.set('q', q)
    if (categoryId) params.set('categoryId', categoryId)
    if (minRating)  params.set('minRating', minRating)
    if (maxTime)    params.set('maxTime', maxTime)

    fetch(`/api/recipes?${params}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Erreur ${res.status} lors du chargement des recettes`)
        }
        return res.json()
      })
      .then((data) => {
        setRecipes(data.data ?? [])
        setTotal(data.total ?? 0)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / LIMIT)

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

  const hasActiveFilters = categoryId || minRating || maxTime

  const resetFilters = () => {
    setMaxTimeInput('')
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      if (prev.get('q')) next.set('q', prev.get('q'))
      return next
    }, { replace: true })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Toutes les recettes</h1>

      {/* Barre de recherche */}
      <div className="mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={handleSearchChange}
          placeholder="Rechercher un cocktail..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
      </div>

      {/* Filtre par catégorie */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setParam('categoryId', null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            categoryId === null
              ? 'bg-amber-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
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
                : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Filtres supplémentaires */}
      <div className="flex flex-wrap items-center gap-4 mb-6 py-3 border-t border-b border-gray-100">
        {/* Note minimale */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Note min.</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setParam('minRating', n === 0 ? null : n)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  (minRating ? parseInt(minRating) : 0) === n
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
                }`}
              >
                {n === 0 ? '–' : `${n}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Temps max */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Temps max</span>
          <input
            type="number"
            min="1"
            value={maxTimeInput}
            onChange={handleMaxTimeChange}
            placeholder="min"
            className="w-20 px-2 py-1 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
          <span className="text-xs text-gray-400">min</span>
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
        <p className="text-center text-gray-400 py-16">Chargement...</p>
      ) : error ? (
        <p className="text-center text-red-500 py-16">{error}</p>
      ) : recipes.length === 0 ? (
        <p className="text-center text-gray-400 py-16">Aucune recette trouvée.</p>
      ) : (
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setParam('page', page - 1, false)}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Précédent
          </button>

          <span className="text-sm text-gray-500">
            Page {page} / {totalPages}
          </span>

          <button
            onClick={() => setParam('page', page + 1, false)}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Compteur total */}
      {!loading && total > 0 && (
        <p className="text-center text-xs text-gray-400 mt-4">
          {total} recette{total > 1 ? 's' : ''} au total
        </p>
      )}
    </div>
  )
}
