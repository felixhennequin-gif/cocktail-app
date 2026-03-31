import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import Skeleton from '../components/Skeleton'

const CATEGORIES = ['all', 'technique', 'ingredient', 'glass', 'style', 'history']

export default function Glossary() {
  const { t } = useTranslation()
  const { authFetch } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: '200' })
        if (category !== 'all') params.set('category', category)
        if (search.length >= 2) params.set('q', search)
        const res = await authFetch(`/api/glossary?${params}`)
        const json = await res.json()
        setEntries(json.data || [])
      } catch {
        setEntries([])
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(fetchData, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [category, search, authFetch])

  // Grouper par lettre
  const grouped = entries.reduce((acc, entry) => {
    const letter = entry.term[0].toUpperCase()
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(entry)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto">
      <Helmet><title>{t('glossary.title')} — Écume</title></Helmet>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('glossary.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('glossary.subtitle')}</p>
      </div>

      {/* Recherche */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('glossary.searchPlaceholder')}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Filtres catégorie */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-gold-400 text-ink-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t(`glossary.categories.${cat}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">{t('common.noResults')}</p>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).sort().map((letter) => (
            <div key={letter}>
              <h2 className="text-lg font-bold text-gold-500 dark:text-gold-400 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                {letter}
              </h2>
              <div className="space-y-1">
                {grouped[letter].map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/glossary/${entry.slug}`}
                    className="block px-4 py-3 rounded-lg hover:bg-white dark:hover:bg-ink-900 transition-colors"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{entry.term}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      {t(`glossary.categories.${entry.category}`)}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{entry.definition}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
