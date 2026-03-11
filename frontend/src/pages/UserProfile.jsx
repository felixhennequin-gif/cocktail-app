import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
import { useAuth } from '../contexts/AuthContext'

export default function UserProfile() {
  const { id }          = useParams()
  const { user, authFetch } = useAuth()

  const [profile, setProfile]         = useState(null)
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Utilisateur introuvable')
        return r.json()
      })
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!user) return
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFavoriteIds(new Set(data.map((r) => r.id))))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

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

  if (loading) return <p className="text-center text-gray-400 py-16">Chargement...</p>
  if (error)   return <p className="text-center text-red-500 py-16">{error}</p>

  const joinedYear = new Date(profile.createdAt).getFullYear()

  return (
    <div className="max-w-2xl mx-auto">
      {/* En-tête profil */}
      <div className="flex items-center gap-5 mb-8 bg-white rounded-xl border border-gray-200 p-6">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.pseudo}
            className="w-16 h-16 rounded-full object-cover bg-gray-100"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 text-2xl font-bold flex items-center justify-center">
            {profile.pseudo[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.pseudo}</h1>
          <p className="text-sm text-gray-400">Membre depuis {joinedYear}</p>
        </div>
      </div>

      {/* Recettes de l'utilisateur */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Recettes{' '}
        <span className="text-gray-400 font-normal text-sm">({profile.recipes.length})</span>
      </h2>

      {profile.recipes.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucune recette publiée.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {profile.recipes.map((recipe) => (
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
