import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import Skeleton from '../components/Skeleton'

export default function GlossaryEntry() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const { authFetch } = useAuth()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    authFetch(`/api/glossary/${slug}`)
      .then((r) => r.json())
      .then(setEntry)
      .catch(() => setEntry(null))
      .finally(() => setLoading(false))
  }, [slug, authFetch])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('common.notFound')}</h1>
        <Link to="/glossary" className="text-gold-500 hover:underline">{t('glossary.title')}</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Helmet>
        <title>{entry.term} — {t('glossary.title')}</title>
        <meta name="description" content={entry.definition} />
      </Helmet>

      <Link to="/glossary" className="text-sm text-gold-500 dark:text-gold-400 hover:underline mb-4 inline-block">
        ← {t('glossary.title')}
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{entry.term}</h1>
      <span className="text-xs px-2.5 py-1 rounded-full bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400 border border-gold-200 dark:border-gold-700">
        {t(`glossary.categories.${entry.category}`)}
      </span>

      <p className="text-lg text-gray-700 dark:text-gray-300 mt-4 mb-6 leading-relaxed">
        {entry.definition}
      </p>

      {entry.longDescription && (
        <div className="prose dark:prose-invert max-w-none mb-8 text-gray-600 dark:text-gray-400">
          {entry.longDescription}
        </div>
      )}

      {/* Recettes liées */}
      {entry.relatedRecipes?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('glossary.relatedRecipes')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {entry.relatedRecipes.map((r) => (
              <Link
                key={r.id}
                to={`/recipes/${r.id}`}
                className="bg-white dark:bg-ink-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                {r.imageUrl && <img src={r.imageUrl} alt={r.name} className="w-full h-24 object-cover" />}
                <div className="p-3">
                  <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">{r.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{r.difficulty} · {r.prepTime} min</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Termes connexes */}
      {entry.relatedEntries?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('glossary.relatedTerms')}</h2>
          <div className="flex flex-wrap gap-2">
            {entry.relatedEntries.map((e) => (
              <Link
                key={e.id}
                to={`/glossary/${e.slug}`}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {e.term}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
