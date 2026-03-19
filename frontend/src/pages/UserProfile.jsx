import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
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
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <Link to={`/users/${person.id}`} className="shrink-0">
        {person.avatar ? (
          <img
            src={getImageUrl(person.avatar)}
            alt={person.pseudo}
            className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-700"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-base font-bold flex items-center justify-center">
            {person.pseudo[0].toUpperCase()}
          </div>
        )}
      </Link>
      <Link
        to={`/users/${person.id}`}
        className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
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
  const { t }         = useTranslation()
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
      showToast(t('profile.savedToast'), 'success')
      onSaved(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('profile.editTitle')}</h2>
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            {preview ? (
              <img src={preview} alt="avatar" className="w-14 h-14 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xl font-bold flex items-center justify-center">
                {form.pseudo[0]?.toUpperCase()}
              </div>
            )}
            <label className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer font-medium">
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              {t('profile.changeAvatar')}
            </label>
          </div>
          {/* Pseudo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.pseudoLabel')}</label>
            <input
              name="pseudo" value={form.pseudo} onChange={handleField} required minLength={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.bioLabel')}</label>
            <textarea
              name="bio" value={form.bio} onChange={handleField} rows={3}
              placeholder={t('profile.bioPlaceholder')}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
              {t('profile.cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-60 transition-colors font-medium">
              {saving ? t('profile.saving') : t('profile.save')}
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
  const { t }               = useTranslation()

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

  // Collections (propre profil uniquement)
  const [collections, setCollections]           = useState([])
  const [collectionsLoaded, setCollectionsLoaded] = useState(false)
  const [collectionsLoading, setCollectionsLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Chargement du profil — reset des listes et de l'onglet actif au changement d'id
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setActiveTab('recipes')
    setFollowers([])
    setFollowing([])
    setFollowersLoaded(false)
    setFollowingLoaded(false)
    setCollections([])
    setCollectionsLoaded(false)
    authFetch(`/api/users/${id}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Utilisateur introuvable')
        return r.json()
      })
      .then((data) => setProfile(data))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chargement des recettes paginées
  useEffect(() => {
    const controller = new AbortController()
    setRecipesLoading(true)
    fetch(`/api/users/${id}/recipes?page=${page}&limit=${LIMIT}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : { recipes: { data: [], total: 0 } })
      .then((data) => {
        setRecipes(data.recipes.data)
        setTotal(data.recipes.total)
      })
      .catch((err) => { if (err.name !== 'AbortError') console.error(err) })
      .finally(() => setRecipesLoading(false))
    return () => controller.abort()
  }, [id, page])

  // Chargement des favoris si connecté
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    authFetch('/api/favorites', { signal: controller.signal })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFavoriteIds(new Set(data.map((r) => r.id))))
      .catch(() => {})
    return () => controller.abort()
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

  // Chargement lazy des collections (propre profil uniquement)
  useEffect(() => {
    if (activeTab !== 'collections' || collectionsLoaded) return
    if (!user || user.id !== parseInt(id)) return
    setCollectionsLoading(true)
    authFetch('/api/collections/me')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setCollections(data); setCollectionsLoaded(true) })
      .finally(() => setCollectionsLoading(false))
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
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('profile.notFound')}</h2>
      <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">{error}</p>
      <Link to="/" className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-medium">
        {t('profile.backHome')}
      </Link>
    </div>
  )

  const joinedYear = new Date(profile.createdAt).getFullYear()

  const tabs = [
    { key: 'recipes',   label: t('profile.tabs.recipes', { count: total }) },
    { key: 'followers', label: t('profile.tabs.followers', { count: profile.followersCount }) },
    { key: 'following', label: t('profile.tabs.following', { count: profile.followingCount }) },
    // Onglet collections uniquement sur son propre profil
    ...(user?.id === parseInt(id) ? [{ key: 'collections', label: t('collections.title') }] : []),
  ]

  const isOwnProfile = user?.id === parseInt(id)

  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{t('profile.title', { pseudo: profile.pseudo })}</title>
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
      <div className="flex items-center gap-5 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {profile.avatar ? (
          <img
            src={getImageUrl(profile.avatar)}
            alt={profile.pseudo}
            className="w-16 h-16 rounded-full object-cover bg-gray-100 dark:bg-gray-700"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-2xl font-bold flex items-center justify-center">
            {profile.pseudo[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.pseudo}</h1>
            {isOwnProfile ? (
              <button
                onClick={() => setEditOpen(true)}
                className="px-3 py-1 text-xs border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-full hover:border-amber-300 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                {t('profile.editButton')}
              </button>
            ) : (
              <FollowButton
                targetUserId={parseInt(id)}
                initialIsFollowing={profile.isFollowing}
              />
            )}
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{t('profile.memberSince', { year: joinedYear })}</p>
          {profile.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
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
          <p className="text-gray-400 dark:text-gray-500 text-sm">{t('profile.noRecipes')}</p>
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
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('common.prev')}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.page', { current: page, total: totalPages })}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-amber-300 dark:hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('common.next')}
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
          <p className="text-gray-400 dark:text-gray-500 text-sm">{t('profile.noFollowers')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {followers.map((person) => (
              <UserCard key={person.id} person={person} />
            ))}
            {followersTotal > followers.length && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                {t('profile.firstOf', { shown: followers.length, total: followersTotal })}
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
          <p className="text-gray-400 dark:text-gray-500 text-sm">{t('profile.noFollowing')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {following.map((person) => (
              <UserCard key={person.id} person={person} />
            ))}
            {followingTotal > following.length && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                {t('profile.firstOf', { shown: following.length, total: followingTotal })}
              </p>
            )}
          </div>
        )
      )}

      {/* Onglet Collections (propre profil uniquement) */}
      {activeTab === 'collections' && (
        collectionsLoading ? (
          <SkeletonList count={3} />
        ) : collections.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">{t('collections.noCollections')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {collections.map((col) => (
              <Link
                key={col.id}
                to={`/collections/${col.id}`}
                className="flex gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500 transition-all"
              >
                {/* Image de prévisualisation */}
                {col.previewImage ? (
                  <img
                    src={getImageUrl(col.previewImage)}
                    alt={col.name}
                    className="w-20 h-16 sm:w-24 sm:h-20 object-cover rounded-lg shrink-0 bg-gray-100 dark:bg-gray-700"
                  />
                ) : (
                  <div className="w-20 h-16 sm:w-24 sm:h-20 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-600 text-2xl">
                    📂
                  </div>
                )}
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{col.name}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      col.isPublic
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {col.isPublic ? t('collections.public') : t('collections.private')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {t('collections.recipesCount', { count: col.recipesCount ?? 0 })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
