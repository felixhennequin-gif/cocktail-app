import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DifficultyBadge from '../DifficultyBadge'
import PortionSelector from './PortionSelector'

export default function RecipeMeta({ recipe, avgRating, ratingsCount, isFavorited, onToggleFavorite, onAddToCollection, portionCount, onPortionChange, user }) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <h1 className="text-2xl sm:text-3xl font-serif font-medium text-gray-900 dark:text-gray-100">{recipe.name}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <DifficultyBadge difficulty={recipe.difficulty} size="md" />
          {user && (
            <button
              onClick={onToggleFavorite}
              className={`text-2xl leading-none transition-colors ${isFavorited ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}
              aria-label={isFavorited ? t('recipes.removeFavorite') : t('recipes.addFavorite')}
              title={isFavorited ? t('recipes.removeFavorite') : t('recipes.addFavorite')}
            >
              ♥
            </button>
          )}
          {user && (
            <button
              onClick={onAddToCollection}
              className="text-xl leading-none text-gray-300 dark:text-gray-600 hover:text-gold-400 transition-colors"
              title={t('collections.addRecipe')}
            >
              +
            </button>
          )}
          {user && (recipe.author?.id === user?.id || user?.role === 'ADMIN') && (
            <Link
              to={`/recipes/${recipe.id}/edit`}
              className="text-xl leading-none text-gray-300 dark:text-gray-600 hover:text-gold-400 transition-colors"
              title={t('common.edit')}
            >
              ✎
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
        <span>⏱ {recipe.prepTime} min</span>
        {recipe.category && <span>📂 {recipe.category.name}</span>}
        {recipe.author && (
          <Link to={`/users/${recipe.author.id}`} className="text-gold-500 dark:text-gold-400 hover:underline">
            {t('common.by')} {recipe.author.pseudo}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3 mb-4">
        {avgRating !== null ? (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ★ <span className="font-medium text-gray-800 dark:text-gray-200">{t('recipes.avgRating', { value: avgRating })}</span>
            <span className="text-gray-400 dark:text-gray-500 ml-1">{t('recipes.ratingsCount', { count: ratingsCount })}</span>
          </span>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500">{t('recipes.notRated')}</span>
        )}
      </div>
      {recipe.description && (
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{recipe.description}</p>
      )}
      {recipe.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {recipe.tags.map((tag) => (
            <Link key={tag.id} to={`/recipes?tags=${tag.id}`} className="text-xs px-2.5 py-1 rounded-full bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400 border border-gold-200 dark:border-gold-700 hover:bg-gold-100 dark:hover:bg-gold-900/40 transition-colors">
              {tag.name}
            </Link>
          ))}
        </div>
      )}
      {recipe.servings && (
        <div className="flex items-center gap-3 mt-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('recipes.for')}</span>
          <PortionSelector value={portionCount} onChange={onPortionChange} />
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('recipes.glasses', { count: portionCount })}</span>
        </div>
      )}
      {recipe.status === 'PENDING' && (
        <div className="mt-3 px-3 py-2 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700 rounded-lg text-sm text-gold-700 dark:text-gold-400">
          {t('recipes.pending')}
        </div>
      )}
    </div>
  )
}
