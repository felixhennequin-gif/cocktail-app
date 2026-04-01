import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import Skeleton from '../components/Skeleton'

export default function AdventCalendar() {
  const { t } = useTranslation()
  const { authFetch } = useAuth()
  const [data, setData] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await authFetch('/api/recipes/advent')
        const json = await res.json()
        setData(json)
      } catch {
        setData({ available: false })
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [authFetch])

  const openDay = async (day) => {
    if (selectedDay === day) {
      setSelectedDay(null)
      setSelectedRecipe(null)
      return
    }
    setSelectedDay(day)
    setLoadingRecipe(true)
    try {
      const res = await authFetch(`/api/recipes/advent/${day}`)
      const json = await res.json()
      if (json.available && json.recipe) {
        setSelectedRecipe(json.recipe)
      }
    } catch {
      setSelectedRecipe(null)
    } finally {
      setLoadingRecipe(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {Array.from({ length: 24 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!data?.available) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Helmet>
          <title>{t('advent.title')} — Écume</title>
          <link rel="canonical" href="https://cocktail-app.fr/advent" />
          <meta name="description" content="Découvrez chaque jour un nouveau cocktail avec le calendrier de l'avent Écume." />
        </Helmet>
        <div className="text-6xl mb-6">🎄</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('advent.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">{t('advent.notAvailable')}</p>
        <Link to="/" className="inline-block mt-6 px-6 py-3 bg-gold-400 text-ink-900 rounded-xl font-semibold hover:bg-gold-300 transition-colors">
          {t('common.backHome')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Helmet>
        <title>{t('advent.title')} — Écume</title>
        <link rel="canonical" href="https://cocktail-app.fr/advent" />
        <meta name="description" content="Découvrez chaque jour un nouveau cocktail avec le calendrier de l'avent Écume." />
      </Helmet>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🎄 {t('advent.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{t('advent.subtitle', { year: data.year })}</p>
      </div>

      {/* Grille 4x6 */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-8">
        {data.days.map((item) => {
          const isOpened = item.opened
          const isSelected = selectedDay === item.day
          const isToday = item.day === data.currentDay

          return (
            <button
              key={item.day}
              onClick={() => isOpened && openDay(item.day)}
              disabled={!isOpened}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center
                text-lg font-bold transition-all duration-300 relative overflow-hidden
                ${isSelected
                  ? 'ring-2 ring-gold-400 bg-gold-400 text-ink-900 scale-105 shadow-lg'
                  : isOpened
                    ? 'bg-green-600/90 dark:bg-green-700/80 text-white hover:scale-105 hover:shadow-md cursor-pointer'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }
                ${isToday && !isSelected ? 'ring-2 ring-gold-400 animate-pulse' : ''}
              `}
            >
              <span className="text-2xl">{item.day}</span>
              {isOpened && item.imageUrl && (
                <div className="absolute inset-0 opacity-20">
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {!isOpened && (
                <svg className="w-4 h-4 mt-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* Détail de la recette sélectionnée */}
      {selectedDay && (
        <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-lg p-6 animate-in fade-in duration-300">
          {loadingRecipe ? (
            <div className="flex items-center gap-4">
              <Skeleton className="w-24 h-24 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : selectedRecipe ? (
            <div className="flex flex-col sm:flex-row gap-6">
              {selectedRecipe.imageUrl && (
                <img
                  src={selectedRecipe.imageUrl}
                  alt={selectedRecipe.name}
                  className="w-full sm:w-40 h-40 object-cover rounded-xl"
                />
              )}
              <div className="flex-1">
                <p className="text-sm text-gold-500 dark:text-gold-400 font-medium mb-1">
                  {t('advent.dayLabel', { day: selectedDay })}
                </p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedRecipe.name}
                </h2>
                {selectedRecipe.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                    {selectedRecipe.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span>{selectedRecipe.difficulty}</span>
                  <span>{selectedRecipe.prepTime} min</span>
                  {selectedRecipe.avgRating && (
                    <span>★ {selectedRecipe.avgRating}</span>
                  )}
                </div>
                <Link
                  to={`/recipes/${selectedRecipe.id}`}
                  className="inline-block px-5 py-2 bg-gold-400 text-ink-900 rounded-lg font-semibold hover:bg-gold-300 transition-colors"
                >
                  {t('advent.viewRecipe')}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
