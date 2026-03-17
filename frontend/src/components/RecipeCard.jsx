import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getImageUrl } from '../utils/image'

const difficultyLabel = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' }
const difficultyColor = {
  EASY:   'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HARD:   'bg-red-100   text-red-700',
}

// Affichage étoiles — ex: 3.7 → ★★★★☆
function Stars({ value, count }) {
  if (value === null || value === undefined) return null
  const full  = Math.round(value)
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full)
  return (
    <span className="text-amber-400 text-xs" title={`${value}/5 (${count} note${count > 1 ? 's' : ''})`}>
      {stars} <span className="text-gray-400">{value}</span>
    </span>
  )
}

export default function RecipeCard({ recipe, isFavorited, onToggleFavorite }) {
  const { user } = useAuth()
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
      className="flex gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-amber-300 transition-all"
    >
      <img
        src={getImageUrl(recipe.imageUrl)}
        alt={recipe.name}
        className="w-24 h-20 object-cover rounded-lg shrink-0 bg-gray-100"
      />

      <div className="flex flex-col justify-between min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900 truncate">{recipe.name}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColor[recipe.difficulty]}`}>
              {difficultyLabel[recipe.difficulty]}
            </span>
            {user && (
              <button
                onClick={handleFavorite}
                className={`text-lg leading-none transition-colors ${isFavorited ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                title={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                ♥
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
          <span>⏱ {recipe.prepTime} min</span>
          {recipe.category && <span>📂 {recipe.category.name}</span>}
          {recipe.avgRating !== null && recipe.avgRating !== undefined && (
            <Stars value={recipe.avgRating} count={recipe.ratingsCount} />
          )}
          {recipe.author && (
            <button
              onClick={handleAuthorClick}
              className="text-amber-600 hover:underline ml-auto"
            >
              {recipe.author.pseudo}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
