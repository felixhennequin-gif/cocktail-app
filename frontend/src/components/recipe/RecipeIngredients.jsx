import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'

const DISCRETE_UNITS = new Set([
  'piece', 'pieces', 'pièce', 'pièces',
  'slice', 'slices', 'tranche', 'tranches',
  'leaf', 'leaves', 'feuille', 'feuilles',
  'dash', 'dashes', 'drop', 'drops', 'goutte', 'gouttes',
])

const FRACTIONS = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'],
  [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'],
]

const formatQty = (qty, unit) => {
  if (!isFinite(qty) || qty <= 0) return '—'
  const rounded = Math.round(qty * 100) / 100
  if (DISCRETE_UNITS.has(unit?.toLowerCase())) {
    const whole = Math.floor(rounded)
    const frac  = rounded - whole
    for (const [val, sym] of FRACTIONS) {
      if (Math.abs(frac - val) < 0.06) {
        return whole === 0 ? sym : `${whole} ${sym}`
      }
    }
  }
  return parseFloat(rounded.toFixed(2)).toString()
}

function SubstitutePopover({ ingredientId, onClose }) {
  const { t } = useTranslation()
  const { authFetch } = useAuth()
  const [subs, setSubs] = useState(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    authFetch(`/api/ingredients/${ingredientId}/substitutes`)
      .then((r) => r.json())
      .then(setSubs)
      .catch(() => setSubs([]))
      .finally(() => setLoading(false))
  }, [ingredientId])

  return (
    <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{t('substitution.title')}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      {loading ? (
        <div className="text-gray-400">{t('common.loading')}</div>
      ) : !subs?.length ? (
        <div className="text-gray-400">{t('substitution.noSubstitutes')}</div>
      ) : (
        <ul className="space-y-1.5">
          {subs.map((s) => (
            <li key={s.id} className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">
                {s.name}
                {s.inUserBar && <span className="ml-1 text-green-500" title={t('substitution.inStock')}>●</span>}
              </span>
              {s.ratio !== 1 && (
                <span className="text-gray-400">{s.ratio.toFixed(1)}x</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function RecipeIngredients({ ingredients, servings, portionCount }) {
  const { t } = useTranslation()
  const [openSubId, setOpenSubId] = useState(null)

  const toggleSub = useCallback((id) => {
    setOpenSubId((prev) => (prev === id ? null : id))
  }, [])

  if (!ingredients?.length) return null

  const baseServings = servings ?? 1

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('recipes.ingredients')}</h2>
      <ul className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {ingredients.map((ri) => {
          const displayQty = ri.quantity * (portionCount / baseServings)
          return (
            <li key={ri.id} className="flex justify-between items-center px-4 py-3 text-sm relative">
              <span className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                {ri.ingredient.name}
                <button
                  onClick={() => toggleSub(ri.ingredient.id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-gold-400 transition-colors"
                  title={t('substitution.title')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              </span>
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {formatQty(displayQty, ri.unit)} {ri.unit}
              </span>
              {openSubId === ri.ingredient.id && (
                <SubstitutePopover
                  ingredientId={ri.ingredient.id}
                  onClose={() => setOpenSubId(null)}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
