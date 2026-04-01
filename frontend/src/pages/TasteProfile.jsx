import { useState, useEffect, useCallback, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

// Valeurs min/max de chaque curseur
const SLIDER_MIN = 1
const SLIDER_MAX = 5

// Libellés visuels des niveaux 1–5
const LEVEL_LABELS = {
  1: { en: 'Very low',  fr: 'Très faible' },
  2: { en: 'Low',       fr: 'Faible'      },
  3: { en: 'Medium',    fr: 'Moyen'       },
  4: { en: 'High',      fr: 'Élevé'       },
  5: { en: 'Very high', fr: 'Très élevé'  },
}

// Composant radar SVG minimaliste représentant le profil gustatif (4 axes)
function TasteRadar({ values }) {
  const { sweetness = 3, bitterness = 3, sourness = 3, strength = 3 } = values
  const size   = 160
  const center = size / 2
  const maxR   = center - 20

  // Normalise une valeur 1-5 en rayon 0-maxR
  const toR = (v) => ((v - 1) / 4) * maxR

  // Les 4 axes : haut, droite, bas, gauche
  const axes = [
    { label: 'sweetness',  angle: -90,  value: sweetness  },
    { label: 'bitterness', angle: 0,    value: bitterness },
    { label: 'sourness',   angle: 90,   value: sourness   },
    { label: 'strength',   angle: 180,  value: strength   },
  ]

  // Coordonnées d'un point sur un axe
  const point = (angle, radius) => {
    const rad = (angle * Math.PI) / 180
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) }
  }

  const polyPoints = axes.map(({ angle, value }) => {
    const p = point(angle, toR(value))
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      aria-hidden="true"
      className="mx-auto"
    >
      {/* Grilles de fond — niveaux 1 à 5 */}
      {[1, 2, 3, 4, 5].map((level) => {
        const pts = axes.map(({ angle }) => {
          const p = point(angle, toR(level))
          return `${p.x},${p.y}`
        }).join(' ')
        return (
          <polygon
            key={level}
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="1"
            className="text-gray-500 dark:text-gray-400"
          />
        )
      })}
      {/* Axes */}
      {axes.map(({ angle, label }) => {
        const outer = point(angle, maxR)
        return (
          <line
            key={label}
            x1={center} y1={center}
            x2={outer.x} y2={outer.y}
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth="1"
            className="text-gray-500 dark:text-gray-400"
          />
        )
      })}
      {/* Polygone du profil */}
      <polygon
        points={polyPoints}
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="2"
        className="text-gold-400"
      />
      {/* Points sur chaque axe */}
      {axes.map(({ angle, value, label }) => {
        const p = point(angle, toR(value))
        return <circle key={label} cx={p.x} cy={p.y} r="4" fill="currentColor" className="text-gold-400" />
      })}
    </svg>
  )
}

// Curseur individuel pour un axe gustatif
function TasteSlider({ name, label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label htmlFor={`slider-${name}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className="text-xs text-gold-500 dark:text-gold-400 font-semibold tabular-nums">
          {value} / {SLIDER_MAX}
        </span>
      </div>
      <input
        id={`slider-${name}`}
        type="range"
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-gold-400 cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 select-none">
        <span>{SLIDER_MIN}</span>
        <span>{SLIDER_MAX}</span>
      </div>
    </div>
  )
}

export default function TasteProfile() {
  const { t, i18n } = useTranslation()
  const { authFetch } = useAuth()
  const { addToast } = useToast()

  // Préférences gustatives
  const [sweetness,  setSweetness]  = useState(3)
  const [bitterness, setBitterness] = useState(3)
  const [sourness,   setSourness]   = useState(3)
  const [strength,   setStrength]   = useState(3)

  // Exclusion d'ingrédients
  const [excludedIngredients, setExcludedIngredients] = useState([]) // [{ id, name }]
  const [ingredientSearch, setIngredientSearch]       = useState('')
  const [searchResults, setSearchResults]             = useState([])
  const [searching, setSearching]                     = useState(false)
  const debounceRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  // Chargement initial des préférences
  useEffect(() => {
    authFetch('/api/users/me/preferences')
      .then((r) => r.ok ? r.json() : null)
      .then(async (prefs) => {
        if (!prefs) return
        setSweetness(prefs.sweetness   ?? 3)
        setBitterness(prefs.bitterness ?? 3)
        setSourness(prefs.sourness     ?? 3)
        setStrength(prefs.strength     ?? 3)

        // Résolution des ingrédients exclus : on charge leurs noms depuis l'API
        const ids = prefs.excludedIngredients ?? []
        if (ids.length > 0) {
          const resolved = await Promise.all(
            ids.map((id) =>
              fetch(`/api/bar/ingredients?q=`).then((r) => r.ok ? r.json() : [])
            )
          )
          // On récupère tous les ingrédients en une seule requête vide (renvoie les 50 premiers)
          // puis on filtre — pour des raisons de performance on charge via la requête vide
          const all = resolved[0] ?? []
          const matched = all.filter((ing) => ids.includes(ing.id))
          // Pour les IDs non trouvés dans les 50 premiers, on les représente avec l'ID
          const fromAll = ids.map((id) => matched.find((m) => m.id === id) ?? { id, name: `#${id}` })
          setExcludedIngredients(fromAll)
        }
      })
      .finally(() => setLoading(false))
  }, [authFetch])

  // Recherche d'ingrédients avec debounce 300ms
  useEffect(() => {
    if (!ingredientSearch.trim()) {
      setSearchResults([])
      return
    }
    clearTimeout(debounceRef.current)
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/bar/ingredients?q=${encodeURIComponent(ingredientSearch.trim())}`)
        .then((r) => r.ok ? r.json() : [])
        .then((data) => setSearchResults(Array.isArray(data) ? data : []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [ingredientSearch])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authFetch('/api/users/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sweetness,
          bitterness,
          sourness,
          strength,
          excludedIngredients: excludedIngredients.map((i) => i.id),
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde')
      addToast(t('preferences.saved'), 'success')
    } catch {
      addToast(t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // Ajoute ou retire un ingrédient de la liste d'exclusion
  const toggleExcluded = useCallback((ingredient) => {
    setExcludedIngredients((prev) => {
      const exists = prev.some((i) => i.id === ingredient.id)
      return exists ? prev.filter((i) => i.id !== ingredient.id) : [...prev, ingredient]
    })
  }, [])

  const isExcluded = (id) => excludedIngredients.some((i) => i.id === id)

  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  const currentValues = { sweetness, bitterness, sourness, strength }

  const axes = [
    { name: 'sweetness',  label: t('preferences.sweetness'),  value: sweetness,  onChange: setSweetness  },
    { name: 'bitterness', label: t('preferences.bitterness'), value: bitterness, onChange: setBitterness },
    { name: 'sourness',   label: t('preferences.sourness'),   value: sourness,   onChange: setSourness   },
    { name: 'strength',   label: t('preferences.strength'),   value: strength,   onChange: setStrength   },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{t('preferences.title')} — Cocktails</title>
        <meta name="description" content="Consultez et ajustez votre profil de goût pour des recommandations cocktails sur mesure." />
        <link rel="canonical" href="https://cocktail-app.fr/taste-profile" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-2">
          {t('preferences.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('preferences.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Radar + curseurs côte à côte sur grand écran */}
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            {/* Radar visuel */}
            <div className="flex flex-col items-center gap-3 w-full sm:w-auto">
              <TasteRadar values={currentValues} />
              {/* Légende */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                {axes.map(({ name, label, value }) => (
                  <span key={name} className="flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-400 shrink-0" />
                    {label} :&nbsp;
                    <span className="text-gold-500 dark:text-gold-400 font-medium">
                      {LEVEL_LABELS[value]?.[lang]}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Curseurs */}
            <div className="flex-1 w-full space-y-5">
              {axes.map(({ name, label, value, onChange }) => (
                <TasteSlider key={name} name={name} label={label} value={value} onChange={onChange} />
              ))}
            </div>
          </div>

          {/* Section ingrédients à éviter */}
          <section>
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              {t('preferences.excludedIngredients')}
            </h2>

            {/* Badges des ingrédients exclus */}
            {excludedIngredients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {excludedIngredients.map((ing) => (
                  <span
                    key={ing.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  >
                    {ing.name}
                    <button
                      type="button"
                      onClick={() => toggleExcluded(ing)}
                      aria-label={`Retirer ${ing.name}`}
                      className="ml-0.5 hover:text-red-900 dark:hover:text-red-200 transition-colors leading-none"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Champ de recherche */}
            <div className="relative">
              <input
                type="text"
                placeholder={t('preferences.searchIngredient')}
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-ink-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Résultats de la recherche */}
            {ingredientSearch.trim() && (
              <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                {searchResults.length === 0 && !searching ? (
                  <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">{t('bar.noResults')}</p>
                ) : (
                  searchResults.map((ing) => {
                    const excluded = isExcluded(ing.id)
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => toggleExcluded(ing)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          excluded
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-ink-700'
                        }`}
                      >
                        {excluded && <span className="mr-1">&#10003;</span>}
                        {ing.name}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </section>

          {/* Bouton de sauvegarde */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 bg-gold-400 text-ink-900 rounded-xl font-medium text-sm hover:bg-gold-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? t('common.loading') : t('preferences.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
