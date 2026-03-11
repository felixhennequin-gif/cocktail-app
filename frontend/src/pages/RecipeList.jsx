import { useState, useEffect, useRef } from 'react'
import RecipeCard from '../components/RecipeCard'
import { useAuth } from '../contexts/AuthContext'

const LIMIT = 10

export default function RecipeList() {
  const { user, authFetch } = useAuth()

  // Valeur affichée dans l'input (mise à jour immédiate)
  const [inputValue, setInputValue] = useState('')
  // Valeur debounced envoyée à l'API (300ms de délai)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [page, setPage] = useState(1)

  const [recipes, setRecipes]       = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [favoriteIds, setFavoriteIds] = useState(new Set())

  const debounceRef = useRef(null)

  // Chargement des catégories une seule fois au montage
  useEffect(() => {
    fetch('/api/recipes?limit=100')
      .then((res) => res.json())
      .then((data) => {
        const cats = [...new Map(data.data.map((r) => [r.category.id, r.category])).values()]
        setCategories(cats)
      })
  }, [])

  // Chargement des favoris si connecté
  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return }
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFavoriteIds(new Set(data.map((r) => r.id))))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rechargement des recettes à chaque changement de filtre ou de page
  useEffect(() => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ page, limit: LIMIT })
    if (search)           params.set('search', search)
    if (selectedCategory) params.set('category', selectedCategory)

    fetch(`/api/recipes?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur lors du chargement des recettes')
        return res.json()
      })
      .then((data) => {
        setRecipes(data.data)
        setTotal(data.total)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [search, selectedCategory, page])

  const totalPages = Math.ceil(total / LIMIT)

  const handleInputChange = (e) => {
    const value = e.target.value
    setInputValue(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }

  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId)
    setPage(1)
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Toutes les recettes</h1>

      {/* Barre de recherche */}
      <div className="mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Rechercher un cocktail..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
      </div>

      {/* Filtre par catégorie */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => handleCategoryChange(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-amber-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
          }`}
        >
          Toutes
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
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
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Précédent
          </button>

          <span className="text-sm text-gray-500">
            Page {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
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
