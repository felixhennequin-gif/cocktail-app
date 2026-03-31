import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import Skeleton from '../components/Skeleton'

const CATEGORIES = ['recipes', 'ratings', 'followers', 'comments']
const PERIODS = ['week', 'month', 'all']

export default function Leaderboard() {
  const { t } = useTranslation()
  const { user, authFetch } = useAuth()
  const [category, setCategory] = useState('recipes')
  const [period, setPeriod] = useState('all')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/leaderboard?category=${category}&period=${period}`)
        const json = await res.json()
        setData(json)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [category, period, authFetch])

  return (
    <div className="max-w-3xl mx-auto">
      <Helmet><title>{t('leaderboard.title')} — Écume</title></Helmet>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('leaderboard.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('leaderboard.subtitle')}</p>
      </div>

      {/* Onglets catégorie */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-gold-400 text-ink-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t(`leaderboard.${cat}`)}
          </button>
        ))}
      </div>

      {/* Filtres période */}
      <div className="flex gap-2 justify-center mb-8">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              period === p
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t(`leaderboard.period.${p}`)}
          </button>
        ))}
      </div>

      {/* Classement */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : !data?.rankings?.length ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">{t('leaderboard.empty')}</p>
      ) : (
        <div className="space-y-2">
          {data.rankings.map((entry) => {
            const isMe = user?.id === entry.userId
            return (
              <Link
                key={entry.userId}
                to={`/users/${entry.userId}`}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                  isMe
                    ? 'bg-gold-100 dark:bg-gold-900/30 ring-1 ring-gold-400'
                    : 'bg-white dark:bg-ink-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {/* Rang */}
                <span className={`w-8 text-center font-bold text-lg ${
                  entry.rank === 1 ? 'text-yellow-500' :
                  entry.rank === 2 ? 'text-gray-400' :
                  entry.rank === 3 ? 'text-amber-600' :
                  'text-gray-400 dark:text-gray-500'
                }`}>
                  {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                </span>

                {/* Avatar */}
                {entry.avatar ? (
                  <img src={entry.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">
                    {entry.pseudo?.[0]?.toUpperCase()}
                  </div>
                )}

                {/* Pseudo */}
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {entry.pseudo}
                  </span>
                  {isMe && (
                    <span className="ml-2 text-xs text-gold-500 dark:text-gold-400 font-medium">
                      {t('leaderboard.you')}
                    </span>
                  )}
                </div>

                {/* Score */}
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  {entry.score}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
