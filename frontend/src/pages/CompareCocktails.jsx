import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { getImageUrl } from '../utils/image'
import DifficultyBadge from '../components/DifficultyBadge'
import Stars from '../components/Stars'

// Classifie les ingrédients en communs / uniques
function classifyIngredients(ingredientsA, ingredientsB) {
  const mapA = new Map(ingredientsA.map((ri) => [ri.ingredient.name.toLowerCase(), ri]))
  const mapB = new Map(ingredientsB.map((ri) => [ri.ingredient.name.toLowerCase(), ri]))

  const common = []
  const onlyA = []
  const onlyB = []

  for (const [key, ri] of mapA) {
    if (mapB.has(key)) {
      const riB = mapB.get(key)
      const same = ri.quantity === riB.quantity && ri.unit === riB.unit
      common.push({ name: ri.ingredient.name, a: ri, b: riB, same })
    } else {
      onlyA.push(ri)
    }
  }
  for (const [key, ri] of mapB) {
    if (!mapA.has(key)) {
      onlyB.push(ri)
    }
  }

  return { common, onlyA, onlyB }
}

function RecipeColumn({ recipe, side }) {
  if (!recipe) return null
  const { t } = useTranslation()

  return (
    <div className="flex-1 min-w-0">
      {/* Image */}
      <div className="relative h-48 sm:h-56 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 mb-4">
        <img
          src={getImageUrl(recipe.imageUrl)}
          alt={recipe.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <Link
            to={`/recipes/${recipe.id}`}
            className="text-lg font-serif font-medium text-white hover:text-gold-300 transition-colors drop-shadow-md"
          >
            {recipe.name}
          </Link>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricCard label={t('compare.difficulty')} className="col-span-2">
          <DifficultyBadge difficulty={recipe.difficulty} />
        </MetricCard>
        <MetricCard label={t('compare.prepTime')}>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{recipe.prepTime}</span>
          <span className="text-xs text-gray-500 ml-1">min</span>
        </MetricCard>
        <MetricCard label={t('compare.rating')}>
          {recipe.avgRating != null ? (
            <Stars value={recipe.avgRating} count={recipe.ratingsCount} />
          ) : (
            <span className="text-sm text-gray-400">{t('recipes.notRated')}</span>
          )}
        </MetricCard>
        <MetricCard label={t('compare.servings')}>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{recipe.servings ?? 1}</span>
        </MetricCard>
        <MetricCard label={t('compare.favorites')}>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{recipe.favoritesCount ?? 0}</span>
        </MetricCard>
      </div>

      {/* Étapes (résumé) */}
      {recipe.steps?.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('compare.stepsCount', { count: recipe.steps.length })}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-ink-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${className}`}>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="flex items-center">{children}</div>
    </div>
  )
}

function IngredientRow({ name, qtyA, unitA, qtyB, unitB, variant }) {
  const bgClass = variant === 'common'
    ? 'bg-green-50 dark:bg-green-900/10'
    : variant === 'diff'
    ? 'bg-amber-50 dark:bg-amber-900/10'
    : 'bg-orange-50 dark:bg-orange-900/10'

  const dotClass = variant === 'common'
    ? 'bg-green-400'
    : variant === 'diff'
    ? 'bg-amber-400'
    : 'bg-orange-400'

  return (
    <tr className={bgClass}>
      <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
        <span className={`inline-block w-2 h-2 rounded-full ${dotClass} mr-2`} />
        {name}
      </td>
      <td className="px-3 py-2 text-sm text-right text-gray-500 dark:text-gray-400 font-medium">
        {qtyA != null ? `${qtyA} ${unitA || ''}` : '—'}
      </td>
      <td className="px-3 py-2 text-sm text-right text-gray-500 dark:text-gray-400 font-medium">
        {qtyB != null ? `${qtyB} ${unitB || ''}` : '—'}
      </td>
    </tr>
  )
}

export default function CompareCocktails() {
  const { t } = useTranslation()
  const { authFetch } = useAuth()
  const [searchParams] = useSearchParams()

  const [recipes, setRecipes] = useState([null, null])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const ids = useMemo(() => {
    const raw = searchParams.get('ids') || ''
    return raw.split(',').map(Number).filter((n) => n > 0).slice(0, 2)
  }, [searchParams])

  useEffect(() => {
    if (ids.length < 2) {
      setLoading(false)
      return
    }

    Promise.all(
      ids.map((id) =>
        authFetch(`/api/recipes/${id}`)
          .then((r) => r.ok ? r.json() : null)
      )
    )
      .then(([a, b]) => setRecipes([a, b]))
      .catch(() => setError(t('compare.error')))
      .finally(() => setLoading(false))
  }, [ids, authFetch, t])

  const [recipeA, recipeB] = recipes

  const ingredientAnalysis = useMemo(() => {
    if (!recipeA?.ingredients?.length || !recipeB?.ingredients?.length) return null
    return classifyIngredients(recipeA.ingredients, recipeB.ingredients)
  }, [recipeA, recipeB])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (ids.length < 2) {
    return (
      <div className="text-center py-16">
        <Helmet><title>{t('compare.title')} — Cocktails</title></Helmet>
        <h1 className="text-2xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('compare.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {t('compare.selectTwo')}
        </p>
        <Link
          to="/recipes"
          className="px-6 py-2.5 bg-gold-400 text-ink-900 rounded-xl font-medium text-sm hover:bg-gold-300 transition-colors"
        >
          {t('compare.browseRecipes')}
        </Link>
      </div>
    )
  }

  if (error || !recipeA || !recipeB) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 dark:text-red-400">{error || t('compare.error')}</p>
      </div>
    )
  }

  return (
    <div>
      <Helmet>
        <title>{t('compare.titleWith', { a: recipeA.name, b: recipeB.name })} — Cocktails</title>
      </Helmet>

      <h1 className="text-2xl sm:text-3xl font-serif font-medium text-gray-900 dark:text-gray-100 text-center mb-2">
        {t('compare.title')}
      </h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
        {recipeA.name} vs {recipeB.name}
      </p>

      {/* Colonnes recettes */}
      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <RecipeColumn recipe={recipeA} side="left" />
        {/* Séparateur */}
        <div className="hidden md:flex items-start pt-24">
          <div className="w-px h-64 bg-gray-200 dark:bg-gray-700 relative">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold-50 dark:bg-ink-950 px-2 py-1 text-xs font-semibold text-gold-500 dark:text-gold-400 rounded-full border border-gold-200 dark:border-gold-700">
              VS
            </span>
          </div>
        </div>
        <div className="md:hidden flex justify-center py-2">
          <span className="px-4 py-1.5 text-sm font-semibold text-gold-500 dark:text-gold-400 rounded-full border border-gold-200 dark:border-gold-700 bg-gold-50 dark:bg-ink-900">
            VS
          </span>
        </div>
        <RecipeColumn recipe={recipeB} side="right" />
      </div>

      {/* Comparaison des ingrédients */}
      {ingredientAnalysis && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('compare.ingredients')}
          </h2>

          {/* Légende */}
          <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              {t('compare.ingredientCommon')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {t('compare.ingredientDiffQty')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              {t('compare.ingredientUnique')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-ink-800">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('compare.ingredient')}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {recipeA.name}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {recipeB.name}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {ingredientAnalysis.common.map(({ name, a, b, same }) => (
                  <IngredientRow
                    key={name}
                    name={name}
                    qtyA={a.quantity}
                    unitA={a.unit}
                    qtyB={b.quantity}
                    unitB={b.unit}
                    variant={same ? 'common' : 'diff'}
                  />
                ))}
                {ingredientAnalysis.onlyA.map((ri) => (
                  <IngredientRow
                    key={`a-${ri.ingredient.name}`}
                    name={ri.ingredient.name}
                    qtyA={ri.quantity}
                    unitA={ri.unit}
                    qtyB={null}
                    unitB={null}
                    variant="unique"
                  />
                ))}
                {ingredientAnalysis.onlyB.map((ri) => (
                  <IngredientRow
                    key={`b-${ri.ingredient.name}`}
                    name={ri.ingredient.name}
                    qtyA={null}
                    unitA={null}
                    qtyB={ri.quantity}
                    unitB={ri.unit}
                    variant="unique"
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Boutons d'action */}
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to={`/recipes/${recipeA.id}`}
          className="px-5 py-2 bg-gold-400 text-ink-900 rounded-lg font-medium text-sm hover:bg-gold-300 transition-colors"
        >
          {t('compare.goTo', { name: recipeA.name })}
        </Link>
        <Link
          to={`/recipes/${recipeB.id}`}
          className="px-5 py-2 bg-gold-400 text-ink-900 rounded-lg font-medium text-sm hover:bg-gold-300 transition-colors"
        >
          {t('compare.goTo', { name: recipeB.name })}
        </Link>
        <Link
          to="/recipes"
          className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg font-medium text-sm hover:border-gold-400 hover:text-gold-500 transition-colors"
        >
          {t('compare.browseRecipes')}
        </Link>
      </div>
    </div>
  )
}
