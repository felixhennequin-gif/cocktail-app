import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import DifficultyBadge from '../components/DifficultyBadge'

// Couleurs des segments — palette dorée/cuivrée cohérente avec le thème
const SEGMENT_COLORS = [
  '#D4A047', '#B87333', '#c28a2e', '#9a5f2a',
  '#f5c96c', '#a06b1f', '#7d4f1a', '#fbe0a8',
  '#5c3a16', '#fdf0d4', '#3d2710', '#7c4c22',
]

// Couleurs de texte pour contraste sur chaque segment
const TEXT_COLORS = [
  '#1e293b', '#fff', '#fff', '#fff',
  '#1e293b', '#fff', '#fff', '#1e293b',
  '#fff', '#1e293b', '#fff', '#fff',
]

const SPIN_DURATION = 4000 // ms
const MIN_ROTATIONS = 5
const MAX_ROTATIONS = 8
const SEGMENT_COUNT = 10

export default function CocktailRoulette() {
  const { t } = useTranslation()
  const { user, authFetch } = useAuth()

  // Filtres
  const [categories, setCategories] = useState([])
  const [difficulty, setDifficulty] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [season, setSeason] = useState('')
  const [onlyMyBar, setOnlyMyBar] = useState(false)

  // État roue
  const [recipes, setRecipes] = useState([])
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const wheelRef = useRef(null)
  const currentRotation = useRef(0)

  // Charger les catégories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.ok ? r.json() : [])
      .then(setCategories)
      .catch(() => {})
  }, [])

  // Récupérer des recettes aléatoires depuis l'API
  const fetchRandomRecipes = useCallback(async () => {
    const params = new URLSearchParams({ limit: '100', sortBy: 'createdAt', sortOrder: 'desc' })
    if (difficulty) params.set('difficulty', difficulty)
    if (categoryId) params.set('categoryId', categoryId)
    if (season) params.set('season', season)

    // Si "uniquement mon bar", utiliser l'endpoint dédié
    if (onlyMyBar && user) {
      const res = await authFetch('/api/bar/makeable')
      if (!res.ok) throw new Error('Erreur réseau')
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.data ?? [])
      // Appliquer les filtres manuellement sur les résultats du bar
      return list.filter((r) => {
        if (difficulty && r.difficulty !== difficulty) return false
        if (categoryId && r.categoryId !== Number(categoryId)) return false
        if (season && r.season !== season) return false
        return true
      })
    }

    const res = await fetch(`/api/recipes?${params}`)
    if (!res.ok) throw new Error('Erreur réseau')
    const data = await res.json()
    return data.data ?? []
  }, [difficulty, categoryId, season, onlyMyBar, user, authFetch])

  // Mélanger un tableau (Fisher-Yates)
  const shuffle = (arr) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  // Lancer la roulette
  const spin = async () => {
    if (spinning) return
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const all = await fetchRandomRecipes()
      if (all.length === 0) {
        setError(t('roulette.noRecipes'))
        setLoading(false)
        return
      }

      // Prendre N recettes aléatoires pour la roue
      const shuffled = shuffle(all)
      const count = Math.min(SEGMENT_COUNT, shuffled.length)
      const selected = shuffled.slice(0, count)
      setRecipes(selected)

      // Choisir l'index gagnant
      const winnerIdx = Math.floor(Math.random() * count)
      const degreesPerSegment = 360 / count

      // Calculer la rotation : la flèche est en haut (0°), le segment 0 commence à 0°
      // Pour atterrir sur winnerIdx, on doit aligner le centre de ce segment avec le haut
      const segmentCenter = winnerIdx * degreesPerSegment + degreesPerSegment / 2
      const extraRotations = (MIN_ROTATIONS + Math.floor(Math.random() * (MAX_ROTATIONS - MIN_ROTATIONS + 1))) * 360
      const targetRotation = currentRotation.current + extraRotations + (360 - segmentCenter)

      setLoading(false)
      setSpinning(true)
      setRotation(targetRotation)
      currentRotation.current = targetRotation

      // Révéler le résultat après l'animation
      setTimeout(() => {
        setSpinning(false)
        setResult(selected[winnerIdx])
      }, SPIN_DURATION + 300)
    } catch {
      setError(t('roulette.error'))
      setLoading(false)
    }
  }

  const segmentCount = recipes.length || SEGMENT_COUNT
  const degreesPerSegment = 360 / segmentCount

  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{t('roulette.title')} — Cocktails</title>
        <link rel="canonical" href="https://cocktail-app.fr/roulette" />
        <meta name="description" content="Laissez le hasard choisir votre prochain cocktail avec la roulette Écume." />
      </Helmet>

      <h1 className="text-3xl sm:text-4xl font-serif font-medium text-gray-900 dark:text-gray-100 text-center mb-2">
        {t('roulette.title')}
      </h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
        {t('roulette.subtitle')}
      </p>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">{t('roulette.allDifficulties')}</option>
          <option value="EASY">{t('recipes.difficulty.EASY')}</option>
          <option value="MEDIUM">{t('recipes.difficulty.MEDIUM')}</option>
          <option value="HARD">{t('recipes.difficulty.HARD')}</option>
        </select>

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">{t('roulette.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">{t('roulette.allSeasons')}</option>
          <option value="spring">{t('recipes.season.spring')}</option>
          <option value="summer">{t('recipes.season.summer')}</option>
          <option value="autumn">{t('recipes.season.autumn')}</option>
          <option value="winter">{t('recipes.season.winter')}</option>
        </select>

        {user && (
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyMyBar}
              onChange={(e) => setOnlyMyBar(e.target.checked)}
              className="rounded accent-gold-400"
            />
            {t('roulette.onlyMyBar')}
          </label>
        )}
      </div>

      {/* Roue */}
      <div className="relative mx-auto w-72 h-72 sm:w-80 sm:h-80 mb-8">
        {/* Flèche indicatrice (en haut) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
            <path d="M12 28L0 0h24L12 28z" className="fill-gold-400" />
          </svg>
        </div>

        {/* SVG roue */}
        <svg
          ref={wheelRef}
          viewBox="0 0 300 300"
          className="w-full h-full drop-shadow-xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : 'none',
          }}
        >
          {/* Segments */}
          {Array.from({ length: segmentCount }).map((_, i) => {
            const startAngle = i * degreesPerSegment
            const endAngle = (i + 1) * degreesPerSegment
            const startRad = (startAngle - 90) * Math.PI / 180
            const endRad = (endAngle - 90) * Math.PI / 180
            const cx = 150, cy = 150, r = 145

            const x1 = cx + r * Math.cos(startRad)
            const y1 = cy + r * Math.sin(startRad)
            const x2 = cx + r * Math.cos(endRad)
            const y2 = cy + r * Math.sin(endRad)
            const largeArc = degreesPerSegment > 180 ? 1 : 0

            const midAngle = (startAngle + endAngle) / 2
            const midRad = (midAngle - 90) * Math.PI / 180
            const textR = r * 0.65
            const tx = cx + textR * Math.cos(midRad)
            const ty = cy + textR * Math.sin(midRad)

            const recipe = recipes[i]
            const label = recipe ? (recipe.name.length > 14 ? recipe.name.slice(0, 12) + '…' : recipe.name) : ''

            return (
              <g key={i}>
                <path
                  d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                  stroke="white"
                  strokeWidth="1.5"
                />
                {label && (
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${midAngle}, ${tx}, ${ty})`}
                    fill={TEXT_COLORS[i % TEXT_COLORS.length]}
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="DM Sans, sans-serif"
                  >
                    {label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Centre */}
          <circle cx="150" cy="150" r="20" className="fill-white dark:fill-ink-900" stroke="#D4A047" strokeWidth="3" />
          <text x="150" y="150" textAnchor="middle" dominantBaseline="central" fontSize="14" className="fill-gold-400">
            🍸
          </text>
        </svg>
      </div>

      {/* Bouton tourner */}
      <div className="flex justify-center mb-8">
        <button
          onClick={spin}
          disabled={spinning || loading}
          className="px-8 py-3 bg-gold-400 text-ink-900 rounded-xl font-semibold text-lg hover:bg-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('common.loading') : spinning ? t('roulette.spinning') : result ? t('roulette.spinAgain') : t('roulette.spin')}
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <p className="text-center text-red-500 dark:text-red-400 mb-6">{error}</p>
      )}

      {/* Résultat */}
      {result && !spinning && (
        <div className="animate-fade-in rounded-2xl overflow-hidden bg-gradient-to-r from-gold-100 to-gold-50 dark:from-ink-800 dark:to-ink-900 border border-gold-200 dark:border-gold-700/30">
          <div className="flex flex-col sm:flex-row">
            {result.imageUrl && (
              <div className="sm:w-48 h-44 sm:h-auto flex-shrink-0 relative">
                <img
                  src={result.imageUrl}
                  alt={result.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent sm:bg-gradient-to-l" />
              </div>
            )}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 mb-2">
                {t('roulette.yourCocktail')}
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-2">
                {result.name}
              </h2>
              {result.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {result.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                {result.avgRating != null && (
                  <span className="flex items-center gap-1">
                    <span className="text-amber-500">&#9733;</span>
                    {result.avgRating}
                  </span>
                )}
                <span>{result.prepTime} min</span>
                <DifficultyBadge difficulty={result.difficulty} />
              </div>
              <div className="flex gap-3">
                <Link
                  to={`/recipes/${result.id}`}
                  className="px-5 py-2 bg-gold-400 text-ink-900 rounded-lg font-medium text-sm hover:bg-gold-300 transition-colors"
                >
                  {t('roulette.seeRecipe')}
                </Link>
                <Link
                  to={`/recipes/${result.id}/party`}
                  className="px-5 py-2 border border-gold-300 dark:border-gold-600 text-gold-600 dark:text-gold-400 rounded-lg font-medium text-sm hover:bg-gold-50 dark:hover:bg-ink-800 transition-colors"
                >
                  {t('roulette.partyMode')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
