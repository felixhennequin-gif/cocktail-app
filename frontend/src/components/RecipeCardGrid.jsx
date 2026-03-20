import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { getImageUrl } from '../utils/image'
import DifficultyBadge from './DifficultyBadge'

function Stars({ value, count }) {
  const { t } = useTranslation()
  if (value == null) return null
  const full = Math.round(value)
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full)
  return (
    <span className="text-amber-400 text-xs" title={`${t('recipes.avgRating', { value })} ${t('recipes.ratingsCount', { count })}`}>
      {stars} <span className="text-gray-400 dark:text-gray-500">{value}</span>
    </span>
  )
}

export default function RecipeCardGrid({ recipe, isFavorited, onToggleFavorite }) {
  const { user } = useAuth()
  const { t } = useTranslation()

  const handleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onToggleFavorite) onToggleFavorite(recipe.id)
  }

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="group flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-gold-300 dark:hover:border-gold-600 hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative w-full h-40 sm:h-44 overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img
          src={getImageUrl(recipe.imageUrl)}
          alt={recipe.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {/* Badge difficulté en overlay */}
        <div className="absolute top-2 left-2">
          <DifficultyBadge difficulty={recipe.difficulty} />
        </div>
        {/* Favori en overlay */}
        {user && (
          <button
            onClick={handleFavorite}
            className={`absolute top-2 right-2 text-lg leading-none transition-colors drop-shadow ${isFavorited ? 'text-red-500' : 'text-white/70 hover:text-red-400'}`}
            title={isFavorited ? t('recipes.removeFavorite') : t('recipes.addFavorite')}
          >
            ♥
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5 p-3">
        <h2 className="text-sm font-serif font-medium text-gray-900 dark:text-gray-100 truncate">
          {recipe.name}
        </h2>

        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span>{recipe.prepTime} min</span>
          {recipe.category && <span>{recipe.category.name}</span>}
          {recipe.avgRating != null && (
            <Stars value={recipe.avgRating} count={recipe.ratingsCount} />
          )}
        </div>

        {/* Tags (max 2) */}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {recipe.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400 border border-gold-200 dark:border-gold-700"
              >
                {tag.name}
              </span>
            ))}
            {recipe.tags.length > 2 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">+{recipe.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
