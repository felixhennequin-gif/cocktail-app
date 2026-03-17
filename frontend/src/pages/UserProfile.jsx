import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import RecipeCard from '../components/RecipeCard'
import FollowButton from '../components/FollowButton'
import { SkeletonProfile, SkeletonCard, SkeletonList } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
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

// Modale d'édition de profil
function EditProfileModal({ profile, onClose, onSaved, authFetch }) {
  const { showToast } = useToast()
  const [form, setForm]       = useState({ pseudo: profile.pseudo, bio: profile.bio || '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const [preview, setPreview] = useState(profile.avatar ? getImageUrl(profile.avatar) : null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleAvatar = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      let avatarUrl = profile.avatar
      // Upload de l'avatar si changé
      if (avatarFile) {
        const fd = new FormData()
        fd.append('image', avatarFile)
        const upRes = await authFetch('/api/upload', { method: 'POST', body: fd })
        if (!upRes.ok) throw new Error('Erreur lors de l\'upload de l\'avatar')
        const upData = await upRes.json()
        avatarUrl = upData.url
      }
      const res = await authFetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: form.pseudo, bio: form.bio, avatar: avatarUrl }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
      const updated = await res.json()
      showToast('Profil mis à jour !', 'success')
      onSaved(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Modifier mon profil</h2>
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            {preview ? (
              <img src={preview} alt="avatar" className="w-14 h-14 rounded-full object-cover bg-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 text-xl font-bold flex items-center justify-center">
                {form.pseudo[0]?.toUpperCase()}
              </div>
            )}
            <label className="text-sm text-amber-600 hover:text-amber-800 cursor-pointer font-medium">
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              Changer l'avatar
            </label>
          </div>
          {/* Pseudo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pseudo</label>
            <input
              name="pseudo" value={form.pseudo} onChange={handleField} required minLength={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              name="bio" value={form.bio} onChange={handleField} rows={3}
              placeholder="Parlez un peu de vous..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:border-gray-300 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-60 transition-colors font-medium">
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserProfile() {
  const { id }              = useParams()
  const { user, authFetch } = useAuth()

  const [profile, setProfile]     = useState(null)
  const [activeTab, setActiveTab] = useState('recipes')
  const [editOpen, setEditOpen]   = useState(false)

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
  if (error)   return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="text-5xl mb-4">👤</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Profil introuvable</h2>
      <p className="text-gray-400 text-sm mb-6">{error}</p>
      <Link to="/" className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-medium">
        ← Retour à l'accueil
      </Link>
    </div>
  )

  const joinedYear = new Date(profile.createdAt).getFullYear()

  const tabs = [
    { key: 'recipes',   label: `Recettes (${total})` },
    { key: 'followers', label: `Abonnés (${profile.followersCount})` },
    { key: 'following', label: `Abonnements (${profile.followingCount})` },
  ]

  const isOwnProfile = user?.id === parseInt(id)

  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{profile.pseudo} — Profil — Cocktails</title>
        <meta name="description" content={profile.bio || `Profil de ${profile.pseudo} — ${profile.followersCount} abonné(s), ${profile.recipes?.length ?? 0} recette(s) publiée(s).`} />
        <meta property="og:title" content={`${profile.pseudo} sur Cocktails`} />
        <meta property="og:type" content="profile" />
        {profile.avatar && <meta property="og:image" content={getImageUrl(profile.avatar)} />}
      </Helmet>
      {/* Modale d'édition de profil */}
      {editOpen && (
        <EditProfileModal
          profile={profile}
          authFetch={authFetch}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setProfile((p) => ({ ...p, ...updated }))
            setEditOpen(false)
          }}
        />
      )}

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
            {isOwnProfile ? (
              <button
                onClick={() => setEditOpen(true)}
                className="px-3 py-1 text-xs border border-gray-200 rounded-full text-gray-500 hover:border-amber-300 hover:text-amber-600 transition-colors"
              >
                Modifier
              </button>
            ) : (
              <FollowButton
                targetUserId={parseInt(id)}
                initialIsFollowing={profile.isFollowing}
              />
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">Membre depuis {joinedYear}</p>
          {profile.bio && (
            <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>
          )}
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
