import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import RecipeCardGrid from '../components/RecipeCardGrid'
import { SkeletonCardGrid } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import useFavorites from '../hooks/useFavorites'

const LIMIT = 12
const SITE_URL = 'https://cocktail-app.fr'

export default function TagPage() {
  const { name } = useParams()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { favoriteIds, toggleFavorite } = useFavorites()

  const [tag, setTag] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const sentinelRef = useRef(null)

  // Charger les infos du tag
  useEffect(() => {
    setLoading(true)
    setRecipes([])
    setCurrentPage(1)
    fetch(`/api/tags/${encodeURIComponent(name)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Tag non trouvé')
        return r.json()
      })
      .then(setTag)
      .catch((err) => setError(err.message))
  }, [name])

  // Charger les recettes avec ce tag
  const fetchPage = useCallback((page, append = false, signal) => {
    if (!tag) return
    if (page === 1) setLoading(true)
    else setLoadingMore(true)

    const params = new URLSearchParams({ page, limit: LIMIT, tags: tag.id })
    fetch(`/api/recipes?${params}`, { signal })
      .then((r) => r.json())
      .then((data) => {
        setRecipes((prev) => append ? [...prev, ...(data.data ?? [])] : (data.data ?? []))
        setTotal(data.total ?? 0)
        setCurrentPage(page)
      })
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }, [tag])

  useEffect(() => {
    if (!tag) return
    const controller = new AbortController()
    fetchPage(1, false, controller.signal)
    return () => controller.abort()
  }, [tag, fetchPage])

  const hasMore = recipes.length < total

  // IntersectionObserver pour infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPage(currentPage + 1, true)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, currentPage, fetchPage])

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 dark:text-gray-500 mb-4">{error}</p>
        <Link to="/recipes" className="text-gold-500 hover:text-gold-600 font-medium">
          {t('recipes.allTitle')} &rarr;
        </Link>
      </div>
    )
  }

  const pageTitle = tag
    ? t('tagPage.title', { tag: tag.name })
    : ''
  const pageDescription = tag
    ? t('tagPage.description', { tag: tag.name, count: tag.recipesCount })
    : ''

  // JSON-LD breadcrumbs Schema.org
  const breadcrumbJsonLd = tag ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('tagPage.breadcrumbHome'), item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: t('tagPage.breadcrumbTags'), item: `${SITE_URL}/recipes` },
      { '@type': 'ListItem', position: 3, name: tag.name, item: `${SITE_URL}/tags/${encodeURIComponent(tag.name)}` },
    ],
  }) : null

  // JSON-LD CollectionPage
  const collectionJsonLd = tag ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    description: pageDescription,
    url: `${SITE_URL}/tags/${encodeURIComponent(tag.name)}`,
    numberOfItems: tag.recipesCount,
  }) : null

  return (
    <div>
      {tag && (
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDescription} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDescription} />
          <meta property="og:url" content={`${SITE_URL}/tags/${encodeURIComponent(tag.name)}`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Cocktail App" />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={pageTitle} />
          <meta name="twitter:description" content={pageDescription} />
          <link rel="canonical" href={`${SITE_URL}/tags/${encodeURIComponent(tag.name)}`} />
          <script type="application/ld+json">{breadcrumbJsonLd}</script>
          <script type="application/ld+json">{collectionJsonLd}</script>
        </Helmet>
      )}

      {/* Breadcrumbs */}
      {tag && (
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          <ol className="flex items-center gap-1.5">
            <li><Link to="/" className="hover:text-gold-500 transition-colors">{t('tagPage.breadcrumbHome')}</Link></li>
            <li><span className="mx-1">/</span></li>
            <li><Link to="/recipes" className="hover:text-gold-500 transition-colors">{t('tagPage.breadcrumbTags')}</Link></li>
            <li><span className="mx-1">/</span></li>
            <li className="text-gray-900 dark:text-gray-100 font-medium">{tag.name}</li>
          </ol>
        </nav>
      )}

      {/* En-tête tag */}
      {tag && (
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-2">
            {pageTitle}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('landing.recipesCount', { count: tag.recipesCount })}
          </p>
        </header>
      )}

      {/* Catégories associées */}
      {tag?.relatedCategories?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            {t('tagPage.relatedCategories')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {tag.relatedCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.slug}`}
                className="px-3 py-1 rounded-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
              >
                {cat.name}
                <span className="ml-1 opacity-60">{cat.recipesCount}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Grille de recettes */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonCardGrid key={i} />)}
        </div>
      ) : recipes.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500 py-16">
          {t('tagPage.noRecipes')}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recipes.map((recipe) => (
              <RecipeCardGrid
                key={recipe.id}
                recipe={recipe}
                isFavorited={favoriteIds.has(recipe.id)}
                onToggleFavorite={toggleFavorite}
                userId={user?.id}
              />
            ))}
          </div>

          {loadingMore && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
              {[1, 2, 3].map((i) => <SkeletonCardGrid key={i} />)}
            </div>
          )}

          <div ref={sentinelRef} className="h-4" />

          {!hasMore && total > 0 && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
              {t('recipes.allLoaded')}
            </p>
          )}
        </>
      )}

      {!loading && total > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
          {t('recipes.totalCount', { count: total })}
        </p>
      )}
    </div>
  )
}
