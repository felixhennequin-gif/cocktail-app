import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import RecipeCard from '../components/RecipeCard'
import useFavorites from '../hooks/useFavorites'

export default function MyBar() {
  const { user, authFetch } = useAuth()
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { favoriteIds, toggleFavorite } = useFavorites()

  // Ingrédients du bar
  const [barIngredients, setBarIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Recherche d'ingrédients
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  // Recettes réalisables
  const [makeable, setMakeable] = useState([])
  const [almostMakeable, setAlmostMakeable] = useState([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)

  // Charger le bar au montage
  useEffect(() => {
    if (!user) return
    authFetch('/api/bar')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setBarIngredients(data))
      .finally(() => setLoading(false))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Charger les recettes réalisables quand le bar change (et n'est pas dirty)
  const fetchMakeable = useCallback(async () => {
    if (!user || barIngredients.length === 0) {
      setMakeable([])
      setAlmostMakeable([])
      return
    }
    setLoadingRecipes(true)
    try {
      const res = await authFetch('/api/bar/makeable')
      if (res.ok) {
        const data = await res.json()
        setMakeable(data.makeable || [])
        setAlmostMakeable(data.almostMakeable || [])
      }
    } finally {
      setLoadingRecipes(false)
    }
  }, [user, barIngredients.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty && !loading) fetchMakeable()
  }, [dirty, loading, fetchMakeable])

  // Recherche d'ingrédients avec debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/bar/ingredients?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          // Filtrer ceux déjà dans le bar
          const barIds = new Set(barIngredients.map((i) => i.id))
          setSuggestions(data.filter((i) => !barIds.has(i.id)))
          setHighlightIndex(-1)
        }
      } catch {
        // Silencieux
      }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query, barIngredients])

  // Fermer les suggestions au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addIngredient = (ingredient) => {
    if (barIngredients.some((i) => i.id === ingredient.id)) return
    setBarIngredients((prev) => [...prev, ingredient])
    setDirty(true)
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
  }

  const removeIngredient = (id) => {
    setBarIngredients((prev) => prev.filter((i) => i.id !== id))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authFetch('/api/bar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientIds: barIngredients.map((i) => i.id) }),
      })
      if (res.ok) {
        const data = await res.json()
        setBarIngredients(data)
        setDirty(false)
        addToast(t('bar.saved'), 'success')
      }
    } catch {
      addToast(t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // Navigation clavier dans les suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      addIngredient(suggestions[highlightIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 dark:text-gray-500 py-16">{t('common.loading')}</p>
  }

  return (
    <div>
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('bar.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('bar.subtitle')}</p>
      </div>

      {/* Barre de recherche d'ingrédients */}
      <div ref={searchRef} className="relative mb-6 max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('bar.search')}
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-ink-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400 transition-colors"
        />
        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((ingredient, index) => (
              <li
                key={ingredient.id}
                onClick={() => addIngredient(ingredient)}
                onMouseEnter={() => setHighlightIndex(index)}
                className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                  index === highlightIndex
                    ? 'bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {ingredient.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ingrédients sélectionnés */}
      {barIngredients.length > 0 ? (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('bar.ingredientCount', { count: barIngredients.length })}
            </span>
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gold-400 text-ink-900 hover:bg-gold-300 disabled:opacity-50 transition-colors"
              >
                {saving ? t('bar.saving') : t('bar.save')}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {barIngredients.map((ingredient) => (
              <span
                key={ingredient.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 border border-gold-200 dark:border-gold-800"
              >
                {ingredient.name}
                <button
                  onClick={() => removeIngredient(ingredient.id)}
                  className="ml-0.5 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  aria-label={`Retirer ${ingredient.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 mb-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-400 dark:text-gray-500">{t('bar.empty')}</p>
        </div>
      )}

      {/* Section recettes réalisables */}
      {barIngredients.length > 0 && !dirty && (
        <div className="space-y-10 mt-8">
          {/* Réalisables */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {t('bar.makeable')}
              {makeable.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">({makeable.length})</span>
              )}
            </h2>
            {loadingRecipes ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t('common.loading')}</p>
            ) : makeable.length > 0 ? (
              <div className="flex flex-col gap-3">
                {makeable.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isFavorited={favoriteIds.has(recipe.id)}
                    onToggleFavorite={toggleFavorite}
                    userId={user?.id}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 text-sm">{t('bar.noResults')}</p>
            )}
          </section>

          {/* Presque réalisables */}
          {almostMakeable.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {t('bar.almostMakeable')}
                <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">({almostMakeable.length})</span>
              </h2>
              <div className="flex flex-col gap-3">
                {almostMakeable.map(({ recipe, missingCount, missingIngredients }) => (
                  <div key={recipe.id} className="relative">
                    <RecipeCard
                      recipe={recipe}
                      isFavorited={favoriteIds.has(recipe.id)}
                      onToggleFavorite={toggleFavorite}
                      userId={user?.id}
                    />
                    <div className="mt-1 ml-1 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                        {t('bar.missingCount', { count: missingCount })}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {t('bar.missing', { ingredients: missingIngredients.join(', ') })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
