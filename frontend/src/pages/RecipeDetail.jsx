import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import useFavorites from '../hooks/useFavorites'
import { getImageUrl } from '../utils/image'
import AddToCollectionModal from '../components/AddToCollectionModal'
import DifficultyBadge from '../components/DifficultyBadge'
import RecipeMeta from '../components/recipe/RecipeMeta'
import RecipeIngredients from '../components/recipe/RecipeIngredients'
import CommentSection from '../components/recipe/CommentSection'
import StepTimer, { extractDuration } from '../components/recipe/StepTimer'
import TastingModal from '../components/TastingModal'
import useShoppingCart from '../hooks/useShoppingCart'

export default function RecipeDetail() {
  const { id }              = useParams()
  const { user, authFetch } = useAuth()
  const { showToast }       = useToast()
  const { t }               = useTranslation()
  const { isFavorited: isFavoritedFn, toggleFavorite } = useFavorites()

  const [recipe, setRecipe]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [avgRating, setAvgRating]     = useState(null)
  const [ratingsCount, setRatingsCount] = useState(0)
  const [comments, setComments]         = useState([])
  const [myComment, setMyComment]       = useState(null)
  const [commentScore, setCommentScore] = useState(null)
  const [portionCount, setPortionCount] = useState(1)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [tastingModalOpen, setTastingModalOpen] = useState(false)
  const { toggle: toggleShoppingCart, has: isInCart } = useShoppingCart()

  // Chargement de la recette et des commentaires
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    authFetch(`/api/recipes/${id}`, { signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Erreur ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        setRecipe(data)
        setAvgRating(data.avgRating)
        setRatingsCount(data.ratingsCount)
        setPortionCount(data.servings ?? 1)
        setCommentScore(data.userScore ?? null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))

    authFetch(`/api/comments/${id}`, { signal })
      .then((r) => r.ok ? r.json() : { comments: [], myComment: null })
      .then(({ comments: list, myComment: mine, avgRating: avg, ratingsCount: cnt }) => {
        setComments(list)
        setMyComment(mine)
        if (avg !== undefined) { setAvgRating(avg); setRatingsCount(cnt ?? 0) }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [id, user?.id, authFetch])

  const isFavorited = recipe ? isFavoritedFn(recipe.id) : false

  const handleToggleFavorite = async () => {
    if (!user) return
    await toggleFavorite(parseInt(id))
    showToast(!isFavorited ? t('favorites.addToast') : t('favorites.removeToast'), 'success')
  }

  if (loading) return <p className="text-center text-gray-400 dark:text-gray-500 py-16">{t('common.loading')}</p>
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="text-5xl mb-4">🍹</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('recipes.notFound')}</h2>
      <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">{error}</p>
      <Link to="/" className="px-5 py-2.5 bg-gold-400 text-white rounded-xl hover:bg-gold-500 transition-colors text-sm font-medium">
        {t('recipes.backToHome')}
      </Link>
    </div>
  )

  const isOwnRecipe = recipe.author?.id === user?.id

  const metaDescription = recipe.description
    || `${recipe.name} — ${t(`recipes.difficulty.${recipe.difficulty}`)}, ${recipe.prepTime} min.`

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    image: recipe.imageUrl ? getImageUrl(recipe.imageUrl) : undefined,
    author: recipe.author ? { '@type': 'Person', name: recipe.author.pseudo } : undefined,
    datePublished: recipe.createdAt,
    description: metaDescription,
    prepTime: recipe.prepTime ? `PT${recipe.prepTime}M` : undefined,
    recipeCategory: recipe.category?.name,
    recipeIngredient: recipe.ingredients?.map((ri) =>
      `${ri.quantity || ''} ${ri.unit || ''} ${ri.ingredient?.name || ''}`.trim()
    ),
    recipeInstructions: recipe.steps?.map((s) => ({
      '@type': 'HowToStep', position: s.order, text: s.description,
    })),
    recipeYield: recipe.servings ? `${recipe.servings} portions` : undefined,
    ...(avgRating && ratingsCount > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating.toFixed(1),
        ratingCount: ratingsCount,
        bestRating: '5',
        worstRating: '1',
      },
    } : {}),
  })

  const metaProps = {
    recipe, avgRating, ratingsCount, isFavorited,
    onToggleFavorite: handleToggleFavorite,
    onAddToCollection: () => setCollectionModalOpen(true),
    onLogTasting: () => setTastingModalOpen(true),
    onAddToShoppingList: () => toggleShoppingCart(parseInt(id)),
    isInShoppingCart: isInCart(parseInt(id)),
    portionCount, onPortionChange: setPortionCount, user,
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Helmet>
        <title>{recipe.name} — Écume</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:site_name" content="Écume" />
        <meta property="og:title" content={recipe.name} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/recipes/${recipe.id}`} />
        {recipe.imageUrl && <meta property="og:image" content={getImageUrl(recipe.imageUrl)} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={recipe.name} />
        <meta name="twitter:description" content={metaDescription} />
        {recipe.imageUrl && <meta name="twitter:image" content={getImageUrl(recipe.imageUrl)} />}
        <script type="application/ld+json">{jsonLd}</script>
      </Helmet>

      <AddToCollectionModal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        recipeId={parseInt(id)}
      />
      <TastingModal
        recipeId={parseInt(id)}
        recipeName={recipe?.name}
        isOpen={tastingModalOpen}
        onClose={() => setTastingModalOpen(false)}
      />

      <Link to="/recipes" className="text-sm text-gold-500 dark:text-gold-400 hover:underline mb-6 inline-block">
        {t('recipes.backToList')}
      </Link>

      {/* Bannière variante de */}
      {recipe.parentRecipe && (
        <div className="mb-4 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg text-sm text-indigo-700 dark:text-indigo-400">
          {t('recipes.variantOfFull')}{' '}
          <Link to={`/recipes/${recipe.parentRecipe.id}`} className="font-semibold hover:underline">
            {recipe.parentRecipe.name}
          </Link>
        </div>
      )}

      {/* Bannière sponsoring */}
      {recipe.isSponsored && recipe.sponsorName && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          {recipe.sponsorLogo && (
            <img
              src={recipe.sponsorLogo}
              alt={recipe.sponsorName}
              rel="sponsored"
              className="h-6 w-auto object-contain shrink-0"
            />
          )}
          <span className="italic">
            {t('recipes.sponsoredBy', { sponsor: recipe.sponsorName })}
          </span>
        </div>
      )}

      {/* Layout 2 colonnes sur desktop */}
      <div className="lg:flex lg:gap-8">
        {/* Colonne gauche : image + ingrédients (sidebar) */}
        <div className="lg:w-2/5 lg:shrink-0">
          <div className="relative aspect-video rounded-xl overflow-hidden mb-6 bg-gray-100 dark:bg-gray-700">
            <img
              src={getImageUrl(recipe.imageUrl)}
              alt={recipe.name}
              fetchpriority="high"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Titre + meta (mobile uniquement) */}
          <div className="lg:hidden mb-8">
            <RecipeMeta {...metaProps} />
          </div>

          {/* Ingrédients (sidebar sticky sur desktop) */}
          <div className="hidden lg:block lg:sticky lg:top-24">
            <RecipeIngredients ingredients={recipe.ingredients} servings={recipe.servings} portionCount={portionCount} />
          </div>
        </div>

        {/* Colonne droite : titre (desktop) + ingrédients (mobile) + étapes + variantes */}
        <div className="lg:flex-1 min-w-0">
          {/* Titre + meta (desktop uniquement) */}
          <div className="hidden lg:block mb-6">
            <RecipeMeta {...metaProps} />
          </div>

          {/* Ingrédients (mobile uniquement) */}
          <div className="lg:hidden">
            <RecipeIngredients ingredients={recipe.ingredients} servings={recipe.servings} portionCount={portionCount} />
          </div>

          {/* Étapes */}
          {recipe.steps?.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('recipes.preparation')}</h2>
              <ol className="space-y-4">
                {recipe.steps.map((step) => {
                  const duration = extractDuration(step.description)
                  return (
                    <li key={step.id} className="flex gap-4">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-gold-400 text-white text-sm font-bold flex items-center justify-center">
                        {step.order}
                      </span>
                      <div className="flex-1 pt-0.5">
                        {step.imageUrl && (
                          <img
                            src={getImageUrl(step.imageUrl)}
                            alt={t('recipes.stepAlt', { order: step.order })}
                            loading="lazy"
                            className="w-full max-w-sm aspect-[5/4] object-cover rounded-lg mb-2 border border-gray-100 dark:border-gray-700"
                          />
                        )}
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{step.description}</p>
                        {duration && <StepTimer durationSeconds={duration} />}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}

          {/* Variantes */}
          {recipe.variants?.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('recipes.variants')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {recipe.variants.map((v) => (
                  <Link
                    key={v.id}
                    to={`/recipes/${v.id}`}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md hover:border-gold-300 dark:hover:border-gold-500 transition-all"
                  >
                    <img
                      src={getImageUrl(v.imageUrl)}
                      alt={v.name}
                      loading="lazy"
                      className="w-full h-24 object-cover bg-gray-100 dark:bg-gray-700"
                    />
                    <div className="p-2.5">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{v.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <DifficultyBadge difficulty={v.difficulty} />
                        <span>{v.prepTime} min</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Bouton proposer une variante */}
          {user && !recipe.parentRecipeId && (
            <div className="mb-8">
              <Link
                to={`/recipes/new?variantOf=${recipe.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                {t('recipes.proposeVariant')}
              </Link>
            </div>
          )}

          {/* Bouton mode soirée */}
          {recipe.steps?.length > 0 && (
            <div className="mb-8">
              <Link
                to={`/recipes/${recipe.id}/party`}
                onMouseEnter={() => { import('../pages/PartyMode') }}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t('party.title')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Commentaires */}
      <CommentSection
        recipeId={id}
        isOwnRecipe={isOwnRecipe}
        comments={comments}
        setComments={setComments}
        myComment={myComment}
        setMyComment={setMyComment}
        commentScore={commentScore}
        setCommentScore={setCommentScore}
        avgRating={avgRating}
        setAvgRating={setAvgRating}
        ratingsCount={ratingsCount}
        setRatingsCount={setRatingsCount}
      />
    </div>
  )
}
