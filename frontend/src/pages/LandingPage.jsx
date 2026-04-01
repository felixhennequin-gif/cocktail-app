import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import RecipeCardGrid from '../components/RecipeCardGrid'
import DifficultyBadge from '../components/DifficultyBadge'
import { SkeletonCardGrid } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import useFavorites from '../hooks/useFavorites'
import { getImageUrl } from '../utils/image'

export default function LandingPage() {
  const { user, authFetch } = useAuth()
  const { t } = useTranslation()
  const { favoriteIds, toggleFavorite } = useFavorites()

  const [dailyRecipe, setDailyRecipe] = useState(null)
  const [popularRecipes, setPopularRecipes] = useState([])
  const [seasonalRecipes, setSeasonalRecipes] = useState([])
  const [recommendedRecipes, setRecommendedRecipes] = useState([])
  const [currentSeason, setCurrentSeason] = useState(null)
  const [totalRecipes, setTotalRecipes] = useState(0)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [currentChallenge, setCurrentChallenge] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const publicFetches = [
      fetch('/api/recipes/daily', { signal }).then((r) => r.ok ? r.json() : null),
      fetch('/api/recipes?sortBy=avgRating&sortOrder=desc&limit=8', { signal }).then((r) => r.ok ? r.json() : { data: [], total: 0 }),
      fetch('/api/categories', { signal }).then((r) => r.ok ? r.json() : []),
      fetch('/api/recipes/seasonal?limit=4', { signal }).then((r) => r.ok ? r.json() : { data: [], season: null }),
      fetch('/api/challenges/current', { signal }).then((r) => r.ok ? r.json() : null),
      fetch('/api/tags', { signal }).then((r) => r.ok ? r.json() : []),
    ]

    Promise.allSettled(publicFetches).then(([dailyResult, recipesResult, categoriesResult, seasonalResult, challengeResult, tagsResult]) => {
      if (signal.aborted) return
      if (dailyResult.status === 'fulfilled') setDailyRecipe(dailyResult.value)
      if (recipesResult.status === 'fulfilled') {
        setPopularRecipes(recipesResult.value.data ?? [])
        setTotalRecipes(recipesResult.value.total ?? 0)
      }
      if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value)
      if (seasonalResult.status === 'fulfilled') {
        setSeasonalRecipes(seasonalResult.value.data ?? [])
        setCurrentSeason(seasonalResult.value.season ?? null)
      }
      if (challengeResult.status === 'fulfilled') setCurrentChallenge(challengeResult.value)
      if (tagsResult.status === 'fulfilled') setTags(tagsResult.value)
    }).finally(() => { if (!signal.aborted) setLoading(false) })

    return () => controller.abort()
  }, [])

  // Chargement des recommandations personnalisées pour l'utilisateur connecté
  useEffect(() => {
    if (!user) return
    authFetch('/api/recipes/recommended')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setRecommendedRecipes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [user, authFetch])

  return (
    <div>
      <Helmet>
        <title>Écume — Recettes & Inspiration</title>
        <meta name="description" content="Découvrez des centaines de recettes de cocktails. Recherchez, filtrez, notez et partagez vos cocktails préférés." />
        <meta property="og:site_name" content="Écume" />
        <meta property="og:title" content="Écume — Recettes & Inspiration" />
        <meta property="og:description" content="Découvrez des centaines de recettes de cocktails artisanales." />
        <meta property="og:image" content="https://cocktail-app.fr/og-default.png" />
        <meta property="og:url" content="https://cocktail-app.fr" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Écume — Recettes & Inspiration" />
        <meta name="twitter:description" content="Découvrez des centaines de recettes de cocktails artisanales." />
        <meta name="twitter:image" content="https://cocktail-app.fr/og-default.png" />
      </Helmet>

      {/* Hero */}
      <div className="mb-10 text-center py-10 sm:py-14">
        <h1 className="text-4xl sm:text-5xl font-serif font-normal text-gray-900 dark:text-gray-100 leading-tight mb-4">
          {(() => {
            const highlights = new Set(t('recipes.heroTitleHighlight').split(','))
            return t('recipes.heroTitle').split(' ').map((word, i) =>
              highlights.has(word.toLowerCase())
                ? <em key={i} className="text-gold-400 dark:text-gold-400 not-italic">{word} </em>
                : word + ' '
            )
          })()}
        </h1>
        <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto mb-4">
          {t('recipes.heroSubtitle')}
        </p>
        {totalRecipes > 0 && categories.length > 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
            {t('recipes.heroSocialProof', { recipes: totalRecipes, categories: categories.length })}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <Link
            to="/recipes"
            className="px-6 py-2.5 bg-gold-400 text-ink-900 rounded-xl font-medium text-sm hover:bg-gold-300 transition-colors"
          >
            {t('recipes.heroCta')}
          </Link>
          <Link
            to="/roulette"
            className="px-6 py-2.5 border border-gold-300 dark:border-gold-600 text-gold-600 dark:text-gold-400 rounded-xl font-medium text-sm hover:bg-gold-50 dark:hover:bg-ink-800 transition-colors"
          >
            {t('roulette.landingCta')}
          </Link>
          {!user && (
            <Link
              to="/register"
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl font-medium text-sm hover:border-gold-400 dark:hover:border-gold-400 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
            >
              {t('recipes.heroCtaSecondary')}
            </Link>
          )}
        </div>
        {!user && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            {t('recipes.heroCtaHint')}
          </p>
        )}
      </div>

      {/* Cocktail du jour */}
      {dailyRecipe && (
        <Link
          to={`/recipes/${dailyRecipe.id}`}
          className="block mb-10 rounded-2xl overflow-hidden bg-gradient-to-r from-gold-100 to-gold-50 dark:from-ink-800 dark:to-ink-900 border border-gold-200 dark:border-gold-700/30 hover:shadow-lg transition-shadow"
        >
          <div className="flex flex-col sm:flex-row">
            {dailyRecipe.imageUrl && (
              <div className="sm:w-56 h-48 sm:h-auto flex-shrink-0 relative">
                <img
                  src={getImageUrl(dailyRecipe.imageUrl)}
                  alt={dailyRecipe.name}
                  width="224"
                  height="192"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent sm:bg-gradient-to-l" />
              </div>
            )}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 mb-2">
                {t('recipes.dailyCocktail')}
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-2">
                {dailyRecipe.name}
              </h2>
              {dailyRecipe.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {dailyRecipe.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-3">
                {dailyRecipe.avgRating !== null && (
                  <span className="flex items-center gap-1">
                    <span className="text-amber-500">&#9733;</span>
                    {dailyRecipe.avgRating}
                  </span>
                )}
                <span>{dailyRecipe.prepTime} min</span>
                <DifficultyBadge difficulty={dailyRecipe.difficulty} />
              </div>
              <span className="inline-flex items-center text-sm font-medium text-gold-500 dark:text-gold-400 hover:text-gold-600 dark:hover:text-gold-300">
                {t('recipes.discover')} &rarr;
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Défi de la semaine */}
      {currentChallenge && (
        <Link
          to={`/challenges/${currentChallenge.id}`}
          className="block mb-10 rounded-2xl overflow-hidden bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700/30 hover:shadow-lg transition-shadow"
        >
          <div className="p-5 sm:p-6">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2">
              {t('challenges.currentChallenge')}
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-2">
              {currentChallenge.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {currentChallenge.description}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {currentChallenge.tag && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {currentChallenge.tag.name}
                </span>
              )}
              <span>{t('challenges.entriesCount', { count: currentChallenge._count?.entries ?? 0 })}</span>
              <span className="inline-flex items-center text-sm font-medium text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300">
                {t('challenges.seeDetails')} &rarr;
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Explorer par catégorie */}
      {categories.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-gray-100">
              {t('landing.exploreByCategory')}
            </h2>
            <Link
              to="/recipes"
              className="text-sm text-gold-500 hover:text-gold-600 dark:text-gold-400 dark:hover:text-gold-300 transition-colors"
            >
              {t('landing.seeAll')} &rarr;
            </Link>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('landing.exploreByCategorySubtitle')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.slug}`}
                className="group relative rounded-xl overflow-hidden bg-gradient-to-br from-gold-100 to-gold-50 dark:from-ink-800 dark:to-ink-900 border border-gold-200 dark:border-gold-700/30 p-5 hover:shadow-lg hover:border-gold-300 dark:hover:border-gold-600 transition-all"
              >
                <h3 className="text-lg font-serif font-medium text-gray-900 dark:text-gray-100 mb-1 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('landing.recipesCount', { count: cat.recipesCount ?? 0 })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tags populaires — nuage de tags */}
      {tags.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-gray-100">
              {t('landing.popularTags')}
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('landing.popularTagsSubtitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {tags.filter((tag) => tag.recipesCount > 0).slice(0, 20).map((tag) => {
              // Taille proportionnelle au nombre de recettes
              const maxCount = Math.max(...tags.map((t2) => t2.recipesCount || 0), 1)
              const ratio = (tag.recipesCount || 0) / maxCount
              const sizeClass = ratio > 0.7 ? 'text-base px-4 py-1.5'
                : ratio > 0.4 ? 'text-sm px-3 py-1'
                : 'text-xs px-2.5 py-0.5'
              return (
                <Link
                  key={tag.id}
                  to={`/tags/${encodeURIComponent(tag.name)}`}
                  className={`${sizeClass} rounded-full font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500 hover:text-gold-600 dark:hover:text-gold-400 transition-colors`}
                >
                  {tag.name}
                  <span className="ml-1 opacity-50">{tag.recipesCount}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Recommandations personnalisées — visible uniquement pour les utilisateurs connectés */}
      {user && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-gray-100">
              {t('preferences.forYou')}
            </h2>
            <Link
              to="/taste-profile"
              className="text-sm text-gold-500 hover:text-gold-600 dark:text-gold-400 dark:hover:text-gold-300 transition-colors"
            >
              {t('nav.tasteProfile')} &rarr;
            </Link>
          </div>

          {recommendedRecipes.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              {t('preferences.noRecommendations')}
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recommendedRecipes.map((recipe) => (
                <RecipeCardGrid
                  key={recipe.id}
                  recipe={recipe}
                  isFavorited={favoriteIds.has(recipe.id)}
                  onToggleFavorite={toggleFavorite}
                  userId={user?.id}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recettes populaires */}
      <section>
        <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-6">
          {t('landing.popularTitle')}
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <SkeletonCardGrid key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {popularRecipes.map((recipe) => (
              <RecipeCardGrid
                key={recipe.id}
                recipe={recipe}
                isFavorited={favoriteIds.has(recipe.id)}
                onToggleFavorite={toggleFavorite}
                userId={user?.id}
              />
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link
            to="/recipes"
            className="text-gold-500 hover:text-gold-600 dark:text-gold-400 dark:hover:text-gold-300 font-medium transition-colors"
          >
            {t('landing.seeAllRecipes', { count: totalRecipes })} &rarr;
          </Link>
        </div>
      </section>

      {/* Cocktails de saison */}
      {seasonalRecipes.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-1">
            {t('recipes.seasonal')}
          </h2>
          {currentSeason && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t(`recipes.season.${currentSeason}`)}
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {seasonalRecipes.map((recipe) => (
              <RecipeCardGrid
                key={recipe.id}
                recipe={recipe}
                isFavorited={favoriteIds.has(recipe.id)}
                onToggleFavorite={toggleFavorite}
                userId={user?.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
