import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import RecipeCard from '../components/RecipeCard'

export default function Favorites() {
  const { user, authFetch } = useAuth()
  const navigate = useNavigate()

  const [recipes, setRecipes]         = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login', { state: { from: '/favorites' } }); return }
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setRecipes(data)
        setFavoriteIds(new Set(data.map((r) => r.id)))
      })
      .finally(() => setLoading(false))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleFavorite = async (recipeId) => {
    const res = await authFetch(`/api/favorites/${recipeId}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    if (!data.favorited) {
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId))
      setFavoriteIds((prev) => { const next = new Set(prev); next.delete(recipeId); return next })
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-16">Chargement...</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes favoris</h1>
        <span className="text-sm text-gray-400">{recipes.length} recette{recipes.length !== 1 ? 's' : ''}</span>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">Aucune recette en favori pour l'instant.</p>
          <Link to="/" className="text-amber-600 hover:underline text-sm">
            Parcourir les recettes
          </Link>
        </div>
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
    </div>
  )
}
