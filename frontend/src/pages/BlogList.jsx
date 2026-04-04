import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

const PAGE_SIZE = 9

export default function BlogList() {
  const { t, i18n } = useTranslation()
  const [articles, setArticles]   = useState([])
  const [, setTotal]              = useState(0)
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/articles?page=${page}&limit=${PAGE_SIZE}`)
      .then((r) => {
        if (!r.ok) throw new Error('fetch_error')
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        setArticles(data.articles)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      })
      .catch(() => {
        if (!cancelled) setError(t('common.error'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [page, t])

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

  return (
    <>
      <Helmet>
        <title>{t('blog.title')} — Cocktails</title>
        <link rel="canonical" href="https://cocktail-app.fr/blog" />
        <meta name="description" content={t('blog.subtitle')} />
      </Helmet>

      {/* En-tête de section */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl text-gray-900 dark:text-gray-100 mb-2">
          {t('blog.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{t('blog.subtitle')}</p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-center text-red-500 py-8">{error}</p>
      )}

      {!loading && !error && articles.length === 0 && (
        <p className="text-center text-gray-400 dark:text-gray-500 py-16">
          {t('blog.noArticles')}
        </p>
      )}

      {!loading && !error && articles.length > 0 && (
        <>
          {/* Grille d'articles */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className="flex flex-col rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-900 hover:shadow-md transition-shadow"
              >
                {/* Image de couverture */}
                {article.coverImage && (
                  <Link to={`/blog/${article.slug}`} tabIndex={-1} aria-hidden>
                    <img
                      src={article.coverImage}
                      alt=""
                      className="w-full h-44 object-cover"
                      loading="lazy"
                    />
                  </Link>
                )}

                <div className="flex flex-col flex-1 p-5 gap-3">
                  {/* Tags */}
                  {article.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="text-xs px-2 py-0.5 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Titre */}
                  <h2 className="font-serif text-xl text-gray-900 dark:text-gray-100 leading-snug">
                    <Link
                      to={`/blog/${article.slug}`}
                      className="hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h2>

                  {/* Extrait */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 flex-1">
                    {article.excerpt}
                  </p>

                  {/* Métadonnées */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 dark:text-gray-500">
                    <span>{t('blog.by', { author: article.author?.pseudo ?? '—' })}</span>
                    {article.publishedAt && (
                      <time dateTime={article.publishedAt}>
                        {formatDate(article.publishedAt)}
                      </time>
                    )}
                  </div>

                  {/* Lien lire la suite */}
                  <Link
                    to={`/blog/${article.slug}`}
                    className="text-sm font-medium text-gold-500 dark:text-gold-400 hover:underline"
                  >
                    {t('blog.readMore')}
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.prev')}
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.page', { current: page, total: totalPages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
