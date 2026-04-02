import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import RecipeCard from '../components/RecipeCard'
import useFavorites from '../hooks/useFavorites'

const LIMIT = 20

export default function Favorites() {
  const { user, authFetch } = useAuth()
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const { favoriteIds: globalFavoriteIds, toggleFavorite } = useFavorites()

  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [total, setTotal]     = useState(0)

  useEffect(() => {
    if (!user) { navigate('/login', { state: { from: '/favorites' } }); return }
    setLoading(true)
    authFetch(`/api/favorites?page=${page}&limit=${LIMIT}`)
      .then((r) => r.ok ? r.json() : { data: [], total: 0, page: 1, limit: LIMIT })
      .then(({ data, total: t }) => {
        setRecipes(data)
        setTotal(t)
      })
      .finally(() => setLoading(false))
  }, [user, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnfavorite = async (recipeId) => {
    await toggleFavorite(recipeId)
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId))
    setTotal((prev) => Math.max(0, prev - 1))
  }

  const totalPages = Math.ceil(total / LIMIT)

  if (loading) return <p className="text-center text-gray-400 dark:text-gray-500 py-16">{t('common.loading')}</p>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('favorites.title')}</h1>
        <span className="text-sm text-gray-400 dark:text-gray-500">
          {t('favorites.count', { count: total })}
        </span>
      </div>

      {recipes.length === 0 && page === 1 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 dark:text-gray-500 mb-4">{t('favorites.empty')}</p>
          <Link to="/recipes" className="text-gold-500 dark:text-gold-400 hover:underline text-sm">
            {t('favorites.browseLink')}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorited={globalFavoriteIds.has(recipe.id)}
                onToggleFavorite={handleUnfavorite}
                userId={user?.id}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.prev')}
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
