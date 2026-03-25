import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import RecipeCardGrid from '../components/RecipeCardGrid'
import DifficultyBadge from '../components/DifficultyBadge'
import { SkeletonCardGrid } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'
import useFavorites from '../hooks/useFavorites'

export default function LandingPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { favoriteIds, toggleFavorite } = useFavorites()

  const [dailyRecipe, setDailyRecipe] = useState(null)
  const [popularRecipes, setPopularRecipes] = useState([])
  const [totalRecipes, setTotalRecipes] = useState(0)
  const [categoryCount, setCategoryCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/recipes/daily').then((r) => r.ok ? r.json() : null),
      fetch('/api/recipes?sortBy=avgRating&sortOrder=desc&limit=8').then((r) => r.ok ? r.json() : { data: [], total: 0 }),
      fetch('/api/categories').then((r) => r.ok ? r.json() : []),
    ]).then(([dailyResult, recipesResult, categoriesResult]) => {
      if (dailyResult.status === 'fulfilled') setDailyRecipe(dailyResult.value)
      if (recipesResult.status === 'fulfilled') {
        setPopularRecipes(recipesResult.value.data ?? [])
        setTotalRecipes(recipesResult.value.total ?? 0)
      }
      if (categoriesResult.status === 'fulfilled') setCategoryCount(categoriesResult.value.length)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <Helmet>
        <title>Cocktails — Recettes & Inspiration</title>
        <meta name="description" content="Découvrez des centaines de recettes de cocktails. Recherchez, filtrez, notez et partagez vos cocktails préférés." />
        <meta property="og:title" content="Cocktails — Recettes & Inspiration" />
        <meta property="og:description" content="Découvrez des centaines de recettes de cocktails artisanales." />
        <meta property="og:type" content="website" />
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
        {totalRecipes > 0 && categoryCount > 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
            {t('recipes.heroSocialProof', { recipes: totalRecipes, categories: categoryCount })}
          </p>
        )}
        <div className="flex justify-center gap-3">
          <Link
            to="/recipes"
            className="px-6 py-2.5 bg-gold-400 text-ink-900 rounded-xl font-medium text-sm hover:bg-gold-300 transition-colors"
          >
            {t('recipes.heroCta')}
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
                  src={dailyRecipe.imageUrl}
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
    </div>
  )
}
