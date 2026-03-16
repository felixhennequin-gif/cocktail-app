import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
import { useAuth } from '../contexts/AuthContext'

const LIMIT = 20

export default function Feed() {
  const { user, authFetch } = useAuth()
  const navigate            = useNavigate()

  const [recipes, setRecipes]         = useState([])
  const [nextCursor, setNextCursor]   = useState(null)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState(new Set())

  useEffect(() => {
    if (!user) { navigate('/login'); return }
  }, [user, navigate])

  // Chargement initial
  useEffect(() => {
    if (!user) return
    authFetch(`/api/feed?limit=${LIMIT}`)
      .then((r) => r.ok ? r.json() : { data: [], nextCursor: null })
      .then((data) => {
        setRecipes(data.data)
        setNextCursor(data.nextCursor)
        setHasMore(data.nextCursor !== null)
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Favoris
  useEffect(() => {
    if (!user) return
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFavoriteIds(new Set(data.map((r) => r.id))))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const res = await authFetch(`/api/feed?cursor=${nextCursor}&limit=${LIMIT}`)
    if (res.ok) {
      const data = await res.json()
      setRecipes((prev) => [...prev, ...data.data])
      setNextCursor(data.nextCursor)
      setHasMore(data.nextCursor !== null)
    }
    setLoadingMore(false)
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

  if (!user) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon fil d'actualité</h1>

      {loading ? (
        <p className="text-center text-gray-400 py-16">Chargement...</p>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-2 text-lg">Vous ne suivez personne encore.</p>
          <p className="text-gray-400 text-sm mb-6">Suivez des utilisateurs pour voir leurs recettes ici.</p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
          >
            Découvrir des cocktails
          </Link>
        </div>
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

          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? 'Chargement...' : 'Charger plus'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
