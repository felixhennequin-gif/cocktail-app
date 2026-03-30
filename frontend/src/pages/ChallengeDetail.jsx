import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import RecipeCardGrid from '../components/RecipeCardGrid'
import { SkeletonCardGrid } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import useFavorites from '../hooks/useFavorites'

export default function ChallengeDetail() {
  const { id } = useParams()
  const { user, authFetch } = useAuth()
  const { t } = useTranslation()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const { favoriteIds, toggleFavorite } = useFavorites()

  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userRecipes, setUserRecipes] = useState([])
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Charger le défi
  useEffect(() => {
    setLoading(true)
    fetch(`/api/challenges/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setChallenge)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  // Charger les recettes de l'utilisateur connecté pour le sélecteur de participation
  useEffect(() => {
    if (!user) return
    fetch(`/api/users/${user.id}/recipes`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setUserRecipes(Array.isArray(data) ? data : data.data || []))
  }, [user])

  // Soumettre une recette au défi
  const handleEnter = async () => {
    if (!selectedRecipeId) return
    setSubmitting(true)
    try {
      const res = await authFetch(`/api/challenges/${id}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: parseInt(selectedRecipeId) }),
      })
      if (res.ok) {
        addToast(t('challenges.enteredToast'), 'success')
        // Recharger le défi pour voir la nouvelle entrée
        const updated = await fetch(`/api/challenges/${id}`).then((r) => r.json())
        setChallenge(updated)
        setSelectedRecipeId('')
      } else {
        const data = await res.json()
        addToast(data.error || t('challenges.errorToast'), 'error')
      }
    } catch {
      addToast(t('challenges.errorToast'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCardGrid key={i} />)}
        </div>
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('challenges.notFound')}</p>
        <Link to="/" className="text-gold-500 hover:text-gold-600 dark:text-gold-400 dark:hover:text-gold-300 font-medium">
          {t('common.backHome')}
        </Link>
      </div>
    )
  }

  const now = new Date()
  const isActive = challenge.active && new Date(challenge.startDate) <= now && new Date(challenge.endDate) >= now
  const hasEnded = new Date(challenge.endDate) < now

  // Recettes déjà inscrites par l'utilisateur
  const userEntryRecipeIds = new Set(
    challenge.entries.filter((e) => e.user.id === user?.id).map((e) => e.recipe.id)
  )

  // Filtrer les recettes de l'utilisateur : uniquement celles non encore inscrites
  const availableRecipes = userRecipes.filter(
    (r) => r.status === 'PUBLISHED' && !userEntryRecipeIds.has(r.id)
  )

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  return (
    <div>
      <Helmet>
        <title>{challenge.title} — {t('challenges.pageTitle')}</title>
      </Helmet>

      <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 inline-block">
        {t('common.backHome')}
      </Link>

      {/* En-tête du défi */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-gold-100 to-gold-50 dark:from-ink-800 dark:to-ink-900 border border-gold-200 dark:border-gold-700/30 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 mb-2">
              {t('challenges.weeklyChallenge')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-3">
              {challenge.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-2xl">
              {challenge.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
              <span>{formatDate(challenge.startDate)} — {formatDate(challenge.endDate)}</span>
              {challenge.tag && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400">
                  {challenge.tag.name}
                </span>
              )}
              <span>{t('challenges.entriesCount', { count: challenge.entries.length })}</span>
            </div>
          </div>
          <div>
            {isActive && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {t('challenges.statusActive')}
              </span>
            )}
            {hasEnded && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {t('challenges.statusEnded')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Formulaire de participation */}
      {isActive && user && availableRecipes.length > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t('challenges.participate')}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="flex-1 min-w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-ink-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="">{t('challenges.selectRecipe')}</option>
              {availableRecipes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button
              onClick={handleEnter}
              disabled={!selectedRecipeId || submitting}
              className="px-5 py-2 bg-gold-400 text-ink-900 rounded-lg font-medium text-sm hover:bg-gold-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('challenges.submitting') : t('challenges.submitEntry')}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {t('challenges.participateHint')}
          </p>
        </div>
      )}

      {isActive && user && availableRecipes.length === 0 && userRecipes.length > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('challenges.allRecipesEntered')}
          </p>
        </div>
      )}

      {isActive && !user && (
        <div className="mb-8 p-4 rounded-xl bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link to="/login" className="text-gold-500 hover:text-gold-600 dark:text-gold-400 dark:hover:text-gold-300 font-medium">
              {t('challenges.loginToParticipateLink')}
            </Link>
            {' '}{t('challenges.loginToParticipate')}
          </p>
        </div>
      )}

      {/* Recettes participantes */}
      <section>
        <h2 className="text-xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('challenges.entries')} ({challenge.entries.length})
        </h2>

        {challenge.entries.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {t('challenges.noEntries')}
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {challenge.entries.map((entry) => (
              <RecipeCardGrid
                key={entry.recipe.id}
                recipe={entry.recipe}
                isFavorited={favoriteIds.has(entry.recipe.id)}
                onToggleFavorite={toggleFavorite}
                userId={user?.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
