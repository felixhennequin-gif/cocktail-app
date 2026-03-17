import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import RecipeCard from '../components/RecipeCard'
import FollowButton from '../components/FollowButton'
import { SkeletonProfile, SkeletonCard, SkeletonList } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import { getImageUrl } from '../utils/image'

const LIMIT = 20

// Mini-carte d'un utilisateur dans les listes abonnés/abonnements
function UserCard({ person }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200">
      <Link to={`/users/${person.id}`} className="shrink-0">
        {person.avatar ? (
          <img
            src={getImageUrl(person.avatar)}
            alt={person.pseudo}
            className="w-10 h-10 rounded-full object-cover bg-gray-100"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 text-base font-bold flex items-center justify-center">
            {person.pseudo[0].toUpperCase()}
          </div>
        )}
      </Link>
      <Link
        to={`/users/${person.id}`}
        className="flex-1 text-sm font-medium text-gray-800 hover:text-amber-600 transition-colors"
      >
        {person.pseudo}
      </Link>
      <FollowButton
        targetUserId={person.id}
        initialIsFollowing={person.isFollowing}
      />
    </div>
  )
}

export default function UserProfile() {
  const { id }              = useParams()
  const { user, authFetch } = useAuth()

  const [profile, setProfile]     = useState(null)
  const [activeTab, setActiveTab] = useState('recipes')

  // Recettes
  const [recipes, setRecipes]         = useState([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState(new Set())

  // Abonnés
  const [followers, setFollowers]           = useState([])
  const [followersTotal, setFollowersTotal] = useState(0)
  const [followersLoaded, setFollowersLoaded] = useState(false)
  const [followersLoading, setFollowersLoading] = useState(false)

  // Abonnements
  const [following, setFollowing]           = useState([])
  const [followingTotal, setFollowingTotal] = useState(0)
  const [followingLoaded, setFollowingLoaded] = useState(false)
  const [followingLoading, setFollowingLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Chargement du profil — reset des listes et de l'onglet actif au changement d'id
  useEffect(() => {
    setLoading(true)
    setActiveTab('recipes')
    setFollowers([])
    setFollowing([])
    setFollowersLoaded(false)
    setFollowingLoaded(false)
    authFetch(`/api/users/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Utilisateur introuvable')
        return r.json()
      })
      .then((data) => setProfile(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chargement des recettes paginées
  useEffect(() => {
    setRecipesLoading(true)
    fetch(`/api/users/${id}/recipes?page=${page}&limit=${LIMIT}`)
      .then((r) => r.ok ? r.json() : { recipes: { data: [], total: 0 } })
      .then((data) => {
        setRecipes(data.recipes.data)
        setTotal(data.recipes.total)
      })
      .finally(() => setRecipesLoading(false))
  }, [id, page])

  // Chargement des favoris si connecté
  useEffect(() => {
    if (!user) return
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFavoriteIds(new Set(data.map((r) => r.id))))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chargement lazy des abonnés quand l'onglet est activé
  useEffect(() => {
    if (activeTab !== 'followers' || followersLoaded) return
    setFollowersLoading(true)
    authFetch(`/api/users/${id}/followers?limit=50`)
      .then((r) => r.ok ? r.json() : { data: [], total: 0 })
      .then(({ data, total: t }) => { setFollowers(data); setFollowersTotal(t); setFollowersLoaded(true) })
      .finally(() => setFollowersLoading(false))
  }, [activeTab, id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chargement lazy des abonnements quand l'onglet est activé
  useEffect(() => {
    if (activeTab !== 'following' || followingLoaded) return
    setFollowingLoading(true)
    authFetch(`/api/users/${id}/following?limit=50`)
      .then((r) => r.ok ? r.json() : { data: [], total: 0 })
      .then(({ data, total: t }) => { setFollowing(data); setFollowingTotal(t); setFollowingLoaded(true) })
      .finally(() => setFollowingLoading(false))
  }, [activeTab, id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const totalPages = Math.ceil(total / LIMIT)

  if (loading) return <SkeletonProfile />
  if (error)   return <p className="text-center text-red-500 py-16">{error}</p>

  const joinedYear = new Date(profile.createdAt).getFullYear()

  const tabs = [
    { key: 'recipes',   label: `Recettes (${total})` },
    { key: 'followers', label: `Abonnés (${profile.followersCount})` },
    { key: 'following', label: `Abonnements (${profile.followingCount})` },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {/* En-tête profil */}
      <div className="flex items-center gap-5 mb-6 bg-white rounded-xl border border-gray-200 p-6">
        {profile.avatar ? (
          <img
            src={getImageUrl(profile.avatar)}
            alt={profile.pseudo}
            className="w-16 h-16 rounded-full object-cover bg-gray-100"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 text-2xl font-bold flex items-center justify-center">
            {profile.pseudo[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{profile.pseudo}</h1>
            <FollowButton
              targetUserId={parseInt(id)}
              initialIsFollowing={profile.isFollowing}
            />
          </div>
          <p className="text-sm text-gray-400 mt-0.5">Membre depuis {joinedYear}</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Onglet Recettes */}
      {activeTab === 'recipes' && (
        recipesLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : recipes.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune recette publiée.</p>
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

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
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
          </>
        )
      )}

      {/* Onglet Abonnés */}
      {activeTab === 'followers' && (
        followersLoading ? (
          <SkeletonList count={4} />
        ) : followers.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun abonné pour le moment.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {followers.map((person) => (
              <UserCard key={person.id} person={person} />
            ))}
            {followersTotal > followers.length && (
              <p className="text-xs text-gray-400 text-center mt-2">
                {followers.length} premiers sur {followersTotal}
              </p>
            )}
          </div>
        )
      )}

      {/* Onglet Abonnements */}
      {activeTab === 'following' && (
        followingLoading ? (
          <SkeletonList count={4} />
        ) : following.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun abonnement pour le moment.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {following.map((person) => (
              <UserCard key={person.id} person={person} />
            ))}
            {followingTotal > following.length && (
              <p className="text-xs text-gray-400 text-center mt-2">
                {following.length} premiers sur {followingTotal}
              </p>
            )}
          </div>
        )
      )}
    </div>
  )
}
