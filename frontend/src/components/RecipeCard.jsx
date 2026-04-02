import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getImageUrl } from '../utils/image'
import DifficultyBadge from './DifficultyBadge'
import Stars from './Stars'

function RecipeCard({ recipe, isFavorited, onToggleFavorite, userId, showAuthorProminent }) {
  const { t } = useTranslation()

  const handleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onToggleFavorite) onToggleFavorite(recipe.id)
  }

  return (
    <Link
      to={`/recipes/${recipe.slug || recipe.id}`}
      className="flex gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-gold-300 dark:hover:border-gold-600 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative w-20 h-16 sm:w-24 sm:h-20 aspect-[6/5] shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img
          src={getImageUrl(recipe.imageUrl)}
          alt={recipe.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="flex flex-col justify-between min-w-0 flex-1">
        {showAuthorProminent && recipe.author && (
          <Link
            to={`/users/${recipe.author.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium text-gold-500 dark:text-gold-400 hover:underline text-left mb-0.5"
          >
            {recipe.author.pseudo}
          </Link>
        )}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-serif font-medium text-gray-900 dark:text-gray-100 truncate">{recipe.name}</h2>
          <div className="flex items-center gap-2 shrink-0">
            {recipe.parentRecipeId && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {t('recipes.variant')}
              </span>
            )}
            <DifficultyBadge difficulty={recipe.difficulty} />
            {userId && (
              <button
                onClick={handleFavorite}
                className={`text-lg leading-none transition-all duration-200 active:scale-125 ${isFavorited ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}
                aria-label={isFavorited ? t('recipes.removeFavorite') : t('recipes.addFavorite')}
                title={isFavorited ? t('recipes.removeFavorite') : t('recipes.addFavorite')}
              >
                ♥
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400 border border-gold-200 dark:border-gold-700"
              >
                {tag.name}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">+{recipe.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500 mt-2 min-w-0 overflow-hidden">
          <span><span role="img" aria-label={t('recipes.prepTimeLabel')}>⏱</span> {recipe.prepTime} min</span>
          {recipe.category && <span><span role="img" aria-label={t('recipes.categoryLabel')}>📂</span> {recipe.category.name}</span>}
          {recipe.avgRating !== null && recipe.avgRating !== undefined && (
            <Stars value={recipe.avgRating} count={recipe.ratingsCount} />
          )}
          {recipe.author && (
            <Link
              to={`/users/${recipe.author.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-gold-500 dark:text-gold-400 hover:underline ml-auto"
            >
              {recipe.author.pseudo}
            </Link>
          )}
        </div>

        {/* Badge sponsoring */}
        {recipe.isSponsored && recipe.sponsorName && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 italic">
            {t('recipes.sponsoredBy', { sponsor: recipe.sponsorName })}
          </p>
        )}
      </div>
    </Link>
  )
}

export default memo(RecipeCard)
