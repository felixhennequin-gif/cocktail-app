import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getImageUrl } from '../utils/image'
import DifficultyBadge from '../components/DifficultyBadge'
import ConfirmModal from '../components/ConfirmModal'

export default function MyTastings() {
  const { t } = useTranslation()
  const { authFetch } = useAuth()
  const { showToast } = useToast()

  const [tastings, setTastings] = useState([])
  const [stats, setStats] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const LIMIT = 20

  const fetchTastings = useCallback(async (p = 1, append = false) => {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const res = await authFetch(`/api/tastings?page=${p}&limit=${LIMIT}`)
      if (res.ok) {
        const data = await res.json()
        setTastings((prev) => append ? [...prev, ...data.data] : data.data)
        setTotal(data.total)
        setPage(p)
      }
    } catch {}
    setLoading(false)
    setLoadingMore(false)
  }, [authFetch])

  useEffect(() => {
    fetchTastings()
    authFetch('/api/tastings/stats')
      .then((r) => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {})
  }, [fetchTastings, authFetch])

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await authFetch(`/api/tastings/${deleteTarget}`, { method: 'DELETE' })
    if (res.ok) {
      setTastings((prev) => prev.filter((t) => t.id !== deleteTarget))
      setTotal((prev) => prev - 1)
      showToast(t('tastings.deletedToast'))
    }
    setDeleteTarget(null)
  }

  const hasMore = tastings.length < total

  const formatDate = (d) => new Date(d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{t('tastings.title')} — Cocktails</title>
        <meta name="description" content="Votre journal de dégustation personnel : notes, photos et ajustements." />
        <link rel="canonical" href="https://cocktail-app.fr/tastings" />
      </Helmet>

      <h1 className="text-3xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-2">
        {t('tastings.title')}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {t('tastings.subtitle')}
      </p>

      {/* Statistiques */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label={t('tastings.statTotal')} value={stats.total} />
          <StatCard label={t('tastings.statUnique')} value={stats.uniqueRecipes} />
          <StatCard label={t('tastings.statCategories')} value={stats.uniqueCategories} />
          {stats.topRecipe && (
            <StatCard label={t('tastings.statTopRecipe')} value={stats.topRecipe.name} sub={`×${stats.topRecipe.count}`} />
          )}
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tastings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 dark:text-gray-500 mb-4">{t('tastings.empty')}</p>
          <Link to="/recipes" className="text-gold-500 hover:text-gold-600 font-medium">
            {t('tastings.browseRecipes')}
          </Link>
        </div>
      ) : (
        <div className="relative border-l-2 border-gold-200 dark:border-gold-800 ml-4 pl-6 space-y-8">
          {tastings.map((tasting) => (
            <div key={tasting.id} className="relative">
              {/* Point sur la timeline */}
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-gold-400 border-2 border-gold-50 dark:border-ink-950" />

              <div className="bg-white dark:bg-ink-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* En-tête avec photo */}
                <div className="flex gap-3 p-4">
                  {tasting.recipe?.imageUrl && (
                    <Link to={`/recipes/${tasting.recipe.slug || tasting.recipe.id}`} className="shrink-0">
                      <img
                        src={getImageUrl(tasting.recipe.imageUrl)}
                        alt={tasting.recipe.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/recipes/${tasting.recipe?.slug || tasting.recipe?.id}`}
                      className="font-serif font-medium text-gray-900 dark:text-gray-100 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
                    >
                      {tasting.recipe?.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(tasting.madeAt)}</span>
                      {tasting.recipe?.difficulty && <DifficultyBadge difficulty={tasting.recipe.difficulty} />}
                    </div>
                    {tasting.personalRating && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-sm ${i < tasting.personalRating ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}`}>
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteTarget(tasting.id)}
                    className="self-start text-gray-400 hover:text-red-500 transition-colors text-sm"
                    aria-label={t('common.delete')}
                  >
                    ✕
                  </button>
                </div>

                {/* Photo de dégustation */}
                {tasting.photoUrl && (
                  <img
                    src={getImageUrl(tasting.photoUrl)}
                    alt={t('tastings.photo')}
                    className="w-full h-48 object-cover"
                  />
                )}

                {/* Notes et ajustements */}
                {(tasting.notes || tasting.adjustments) && (
                  <div className="px-4 pb-4 pt-2 space-y-2">
                    {tasting.notes && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{tasting.notes}</p>
                    )}
                    {tasting.adjustments && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        {t('tastings.adjustmentsLabel')} {tasting.adjustments}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charger plus */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => fetchTastings(page + 1, true)}
            disabled={loadingMore}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:border-gold-400 hover:text-gold-500 transition-colors disabled:opacity-50"
          >
            {loadingMore ? t('common.loading') : t('recipes.loadMore', { loaded: tastings.length, total })}
          </button>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('tastings.deleteTitle')}
        message={t('tastings.deleteMessage')}
      />
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white dark:bg-ink-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {value}{sub && <span className="text-xs text-gray-400 ml-1">{sub}</span>}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  )
}
