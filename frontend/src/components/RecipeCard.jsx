import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { getImageUrl } from '../utils/image'

const difficultyColor = {
  EASY:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HARD:   'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400',
}

// Affichage étoiles — ex: 3.7 → ★★★★☆
function Stars({ value, count }) {
  const { t } = useTranslation()
  if (value === null || value === undefined) return null
  const full  = Math.round(value)
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full)
  return (
    <span
      className="text-amber-400 text-xs"
      title={`${t('recipes.avgRating', { value })} ${t('recipes.ratingsCount', { count })}`}
    >
      {stars} <span className="text-gray-400 dark:text-gray-500">{value}</span>
    </span>
  )
}

export default function RecipeCard({ recipe, isFavorited, onToggleFavorite }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onToggleFavorite) onToggleFavorite(recipe.id)
  }

  const handleAuthorClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/users/${recipe.author.id}`)
  }

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="flex gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500 transition-all"
    >
      <img
        src={getImageUrl(recipe.imageUrl)}
        alt={recipe.name}
        className="w-20 h-16 sm:w-24 sm:h-20 object-cover rounded-lg shrink-0 bg-gray-100 dark:bg-gray-700"
      />

      <div className="flex flex-col justify-between min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{recipe.name}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColor[recipe.difficulty]}`}>
              {t(`recipes.difficulty.${recipe.difficulty}`)}
            </span>
            {user && (
              <button
                onClick={handleFavorite}
                className={`text-lg leading-none transition-colors ${isFavorited ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}
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
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
              >
                {tag.name}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">+{recipe.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mt-2">
          <span>⏱ {recipe.prepTime} min</span>
          {recipe.category && <span>📂 {recipe.category.name}</span>}
          {recipe.avgRating !== null && recipe.avgRating !== undefined && (
            <Stars value={recipe.avgRating} count={recipe.ratingsCount} />
          )}
          {recipe.author && (
            <button
              onClick={handleAuthorClick}
              className="text-amber-600 dark:text-amber-400 hover:underline ml-auto"
            >
              {recipe.author.pseudo}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
