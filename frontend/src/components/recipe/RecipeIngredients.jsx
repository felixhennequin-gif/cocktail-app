import { useTranslation } from 'react-i18next'

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

export default function RecipeIngredients({ ingredients, servings, portionCount }) {
  const { t } = useTranslation()

  if (!ingredients?.length) return null

  const baseServings = servings ?? 1

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('recipes.ingredients')}</h2>
      <ul className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {ingredients.map((ri) => {
          const displayQty = ri.quantity * (portionCount / baseServings)
          return (
            <li key={ri.id} className="flex justify-between items-center px-4 py-3 text-sm">
              <span className="text-gray-800 dark:text-gray-200">{ri.ingredient.name}</span>
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                {formatQty(displayQty, ri.unit)} {ri.unit}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
