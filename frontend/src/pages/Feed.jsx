import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import RecipeCard from '../components/RecipeCard'
import { SkeletonCard } from '../components/Skeleton'
import { useAuth } from '../contexts/AuthContext'

const LIMIT = 20

export default function Feed() {
  const { user, authFetch } = useAuth()
  const { t }               = useTranslation()
  const navigate            = useNavigate()

  const [recipes, setRecipes]         = useState([])
  const [nextCursor, setNextCursor]   = useState(null)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState(new Set())

  useEffect(() => {
    if (!user) { navigate('/login'); return }
  }, [user, navigate])

  // Chargement initial
  useEffect(() => {
    if (!user) return
    authFetch(`/api/feed?limit=${LIMIT}`)
      .then((r) => r.ok ? r.json() : { data: [], nextCursor: null })
      .then((data) => {
        setRecipes(data.data)
        setNextCursor(data.nextCursor)
        setHasMore(data.nextCursor !== null)
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Favoris
  useEffect(() => {
    if (!user) return
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFavoriteIds(new Set(data.map((r) => r.id))))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const res = await authFetch(`/api/feed?cursor=${nextCursor}&limit=${LIMIT}`)
    if (res.ok) {
      const data = await res.json()
      setRecipes((prev) => [...prev, ...data.data])
      setNextCursor(data.nextCursor)
      setHasMore(data.nextCursor !== null)
    }
    setLoadingMore(false)
  }

  const handleToggleFavorite = async (recipeId) => {
    if (!user) return
    const res = await authFetch(`/api/favorites/${recipeId}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      data.favorited ? next.add(recipeId) : next.delete(recipeId)
      return next
    })
  }

  if (!user) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('feed.title')}</h1>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400 mb-2 text-lg">{t('feed.empty')}</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">{t('feed.emptyHint')}</p>
          <Link
            to="/recipes"
            className="inline-block px-5 py-2.5 bg-gold-400 text-ink-900 rounded-lg text-sm font-medium hover:bg-gold-500 transition-colors"
          >
            {t('feed.discover')}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorited={favoriteIds.has(recipe.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? t('feed.loading') : t('feed.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
