import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import RecipeCard from '../components/RecipeCard'
import FollowButton from '../components/FollowButton'
import { SkeletonProfile, SkeletonCard, SkeletonList } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { getImageUrl } from '../utils/image'
import ChangePasswordForm from '../components/ChangePasswordForm'

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
          <div className="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-500 dark:text-gold-400 text-base font-bold flex items-center justify-center">
            {person.pseudo[0].toUpperCase()}
          </div>
        )}
      </Link>
      <Link
        to={`/users/${person.id}`}
        className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-gold-400 dark:hover:text-gold-300 transition-colors"
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
  const modalRef              = useRef(null)

  useEffect(() => {
    if (modalRef.current) {
      const firstFocusable = modalRef.current.querySelector('button, input, [tabindex]:not([tabindex="-1"])')
      firstFocusable?.focus()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
    <div role="dialog" aria-modal="true" aria-labelledby="edit-profile-modal-title" className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="edit-profile-modal-title" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('profile.editTitle')}</h2>
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            {preview ? (
              <img src={preview} alt="avatar" className="w-14 h-14 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-500 dark:text-gold-400 text-xl font-bold flex items-center justify-center">
                {form.pseudo[0]?.toUpperCase()}
              </div>
            )}
            <label className="text-sm text-gold-500 dark:text-gold-400 hover:text-gold-600 dark:hover:text-gold-300 cursor-pointer font-medium">
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              {t('profile.changeAvatar')}
            </label>
          </div>
          {/* Pseudo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.pseudoLabel')}</label>
            <input
              name="pseudo" value={form.pseudo} onChange={handleField} required minLength={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.bioLabel')}</label>
            <textarea
              name="bio" value={form.bio} onChange={handleField} rows={3}
              placeholder={t('profile.bioPlaceholder')}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
              {t('profile.cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 text-sm bg-gold-400 text-ink-900 rounded-xl hover:bg-gold-500 disabled:opacity-60 transition-colors font-medium">
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
  const { t, i18n }         = useTranslation()
  const authFetchRef = useRef(authFetch)
  useEffect(() => { authFetchRef.current = authFetch }, [authFetch])
  const { isFavorited, toggleFavorite } = useFavorites()

  const [profile, setProfile]     = useState(null)
  const [activeTab, setActiveTab] = useState('recipes')
  const [editOpen, setEditOpen]   = useState(false)

  // Recettes
  const [recipes, setRecipes]         = useState([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [recipesLoading, setRecipesLoading] = useState(false)

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

  // Badges
  const [allBadges, setAllBadges]               = useState([])
  const [userBadges, setUserBadges]             = useState([])
  const [badgesLoaded, setBadgesLoaded]         = useState(false)
  const [badgesLoading, setBadgesLoading]       = useState(false)

  // Statistiques du profil
  const [stats, setStats] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Chargement du profil — reset des listes et de l'onglet actif au changement d'id
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setActiveTab('recipes')
    setStats(null)
    setFollowers([])
    setFollowing([])
    setFollowersLoaded(false)
    setFollowingLoaded(false)
    setCollections([])
    setCollectionsLoaded(false)
    setAllBadges([])
    setUserBadges([])
    setBadgesLoaded(false)
    authFetchRef.current(`/api/users/${id}`, { signal: controller.signal })
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
  }, [id])

  // Chargement des statistiques du profil
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/users/${id}/stats`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data) })
      .catch((err) => { if (err.name !== 'AbortError') console.error(err) })
    return () => controller.abort()
  }, [id])

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

  // Chargement lazy des abonnés quand l'onglet est activé
  useEffect(() => {
    if (activeTab !== 'followers' || followersLoaded) return
    setFollowersLoading(true)
    authFetchRef.current(`/api/users/${id}/followers?limit=50`)
      .then((r) => r.ok ? r.json() : { data: [], total: 0 })
      .then(({ data, total: t }) => { setFollowers(data); setFollowersTotal(t); setFollowersLoaded(true) })
      .finally(() => setFollowersLoading(false))
  }, [activeTab, id])

  // Chargement lazy des abonnements quand l'onglet est activé
  useEffect(() => {
    if (activeTab !== 'following' || followingLoaded) return
    setFollowingLoading(true)
    authFetchRef.current(`/api/users/${id}/following?limit=50`)
      .then((r) => r.ok ? r.json() : { data: [], total: 0 })
      .then(({ data, total: t }) => { setFollowing(data); setFollowingTotal(t); setFollowingLoaded(true) })
      .finally(() => setFollowingLoading(false))
  }, [activeTab, id])

  // Chargement lazy des badges quand l'onglet est activé
  useEffect(() => {
    if (activeTab !== 'badges' || badgesLoaded) return
    setBadgesLoading(true)
    Promise.all([
      fetch('/api/badges').then((r) => r.ok ? r.json() : []),
      fetch(`/api/badges/user/${id}`).then((r) => r.ok ? r.json() : []),
    ])
      .then(([all, earned]) => {
        setAllBadges(all)
        setUserBadges(earned)
        setBadgesLoaded(true)
      })
      .finally(() => setBadgesLoading(false))
  }, [activeTab, id])

  // Chargement lazy des collections (propre profil uniquement)
  useEffect(() => {
    if (activeTab !== 'collections' || collectionsLoaded) return
    if (!user || user.id !== parseInt(id)) return
    setCollectionsLoading(true)
    authFetchRef.current('/api/collections/me')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setCollections(data); setCollectionsLoaded(true) })
      .finally(() => setCollectionsLoading(false))
  }, [activeTab, id])

  const totalPages = Math.ceil(total / LIMIT)

  if (loading) return <SkeletonProfile />
  if (error)   return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="text-5xl mb-4">👤</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('profile.notFound')}</h2>
      <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">{error}</p>
      <Link to="/" className="px-5 py-2.5 bg-gold-400 text-ink-900 rounded-xl hover:bg-gold-500 transition-colors text-sm font-medium">
        {t('profile.backHome')}
      </Link>
    </div>
  )

  const joinedYear = new Date(profile.createdAt).getFullYear()

  const tabs = [
    { key: 'recipes',   label: t('profile.tabs.recipes', { count: total }) },
    { key: 'followers', label: t('profile.tabs.followers', { count: profile.followersCount }) },
    { key: 'following', label: t('profile.tabs.following', { count: profile.followingCount }) },
    { key: 'badges', label: t('badges.title') },
    // Onglet collections uniquement sur son propre profil
    ...(user?.id === parseInt(id) ? [{ key: 'collections', label: t('collections.title') }] : []),
    ...(user?.id === parseInt(id) ? [{ key: 'security', label: t('profile.tabs.security') }] : []),
  ]

  const isOwnProfile = user?.id === parseInt(id)

  return (
    <div className="max-w-4xl mx-auto">
      <Helmet>
        <title>{t('profile.title', { pseudo: profile.pseudo })}</title>
        <meta name="description" content={profile.bio || `Profil de ${profile.pseudo} — ${profile.followersCount} abonné(s), ${profile.recipes?.length ?? 0} recette(s) publiée(s).`} />
        <meta property="og:site_name" content="Écume" />
        <meta property="og:title" content={`${profile.pseudo} sur Cocktails`} />
        <meta property="og:description" content={profile.bio || `Profil de ${profile.pseudo} sur Écume`} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={`https://cocktail-app.fr/users/${profile.id}`} />
        {profile.avatar && <meta property="og:image" content={getImageUrl(profile.avatar)} />}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${profile.pseudo} sur Cocktails`} />
        <meta name="twitter:description" content={profile.bio || `Profil de ${profile.pseudo} sur Écume`} />
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
          <div className="w-16 h-16 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-500 dark:text-gold-400 text-2xl font-bold flex items-center justify-center">
            {profile.pseudo[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{profile.pseudo}</h1>
            {profile.plan === 'PREMIUM' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Premium
              </span>
            )}
            {isOwnProfile ? (
              <button
                onClick={() => setEditOpen(true)}
                className="px-3 py-1 text-xs border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-full hover:border-gold-300 dark:hover:border-gold-500 hover:text-gold-400 dark:hover:text-gold-300 transition-colors"
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

      {/* Statistiques du profil */}
      {stats && (
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-3 mb-6">
          {[
            { emoji: '\u{1F379}', value: stats.recipesCount,          label: t('stats.recipes') },
            { emoji: '\u2764\uFE0F',  value: stats.totalFavoritesReceived, label: t('stats.favoritesReceived') },
            { emoji: '\u2B50', value: stats.averageRating !== null ? stats.averageRating.toFixed(1) : '\u2014', label: t('stats.avgRating') },
            { emoji: '\u{1F465}', value: stats.followersCount,         label: t('stats.followers') },
            { emoji: '\u2795', value: stats.followingCount,         label: t('stats.following') },
            { emoji: '\u{1F4AC}', value: stats.commentsCount,          label: t('stats.comments') },
            { emoji: '\u{1F3C5}', value: stats.badgesCount,            label: t('stats.badges') },
            { emoji: '\u{1F4C2}', value: stats.collectionsCount,       label: t('stats.collections') },
          ].map(({ emoji, value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center"
            >
              <span className="text-xl" role="img" aria-hidden="true">{emoji}</span>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">{value}</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-gold-400 text-gold-500 dark:text-gold-400'
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
                  isFavorited={isFavorited(recipe.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('common.prev')}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.page', { current: page, total: totalPages })}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

      {/* Onglet Badges */}
      {activeTab === 'badges' && (
        badgesLoading ? (
          <SkeletonList count={4} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allBadges.map((badge) => {
              const earned = userBadges.find((ub) => ub.badgeId === badge.id)
              return (
                <div
                  key={badge.id}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                    earned
                      ? 'bg-white dark:bg-gray-800 border-gold-300 dark:border-gold-600 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 grayscale'
                  }`}
                >
                  <span className="text-3xl" role="img" aria-label={badge.name}>{badge.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{badge.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{badge.description}</p>
                  </div>
                  {earned ? (
                    <p className="text-[10px] text-gold-500 dark:text-gold-400 font-medium">
                      {t('badges.earned', { date: new Date(earned.unlockedAt).toLocaleDateString(i18n.language) })}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('badges.locked')}</p>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Onglet Sécurité (propre profil uniquement) */}
      {activeTab === 'security' && isOwnProfile && (
        <div className="max-w-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('auth.changePassword.title')}</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <ChangePasswordForm />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t('auth.changePassword.logoutWarning')}</p>
        </div>
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
                className="flex gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-gold-300 dark:hover:border-gold-500 transition-all"
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
