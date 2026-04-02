import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import useShoppingCart from '../hooks/useShoppingCart'

export default function ShoppingList() {
  const { t } = useTranslation()
  const { authFetch } = useAuth()
  const { showToast } = useToast()
  const { ids: cartIds, clear: clearCart } = useShoppingCart()

  const [items, setItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [stats, setStats] = useState({ totalItems: 0, inStockCount: 0 })
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shopping_checked') || '{}') } catch { return {} }
  })
  const [loading, setLoading] = useState(false)
  const [servingsMultiplier, setServingsMultiplier] = useState({})

  // Charger la liste consolidée depuis le backend
  useEffect(() => {
    if (cartIds.length === 0) return

    setLoading(true)
    const body = { recipeIds: cartIds }
    if (Object.keys(servingsMultiplier).length > 0) body.servingsMultiplier = servingsMultiplier

    authFetch('/api/shopping-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setItems(data.items)
          setRecipes(data.recipes)
          setStats({ totalItems: data.totalItems, inStockCount: data.inStockCount })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cartIds, servingsMultiplier, authFetch])

  // Persister les cases cochées
  useEffect(() => {
    localStorage.setItem('shopping_checked', JSON.stringify(checked))
  }, [checked])

  const toggleCheck = (ingredientId) => {
    setChecked((prev) => ({ ...prev, [ingredientId]: !prev[ingredientId] }))
  }

  const handleMultiplierChange = (recipeId, value) => {
    setServingsMultiplier((prev) => ({ ...prev, [String(recipeId)]: Math.max(1, parseInt(value) || 1) }))
  }

  const handleShare = async () => {
    const lines = items
      .filter((i) => !i.inStock)
      .map((i) => {
        const qty = i.quantities.map((q) => `${q.quantity} ${q.unit}`).join(' + ')
        return `${checked[i.ingredientId] ? '✓' : '☐'} ${i.name} — ${qty}`
      })
    const text = `${t('shoppingList.title')}\n\n${lines.join('\n')}`

    if (navigator.share) {
      try {
        await navigator.share({ title: t('shoppingList.title'), text })
        return
      } catch {}
    }
    await navigator.clipboard.writeText(text)
    showToast(t('shoppingList.copiedToast'))
  }

  const handleClear = () => {
    clearCart()
    setChecked({})
    setItems([])
    setRecipes([])
  }

  if (cartIds.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Helmet>
          <title>{t('shoppingList.title')} — Cocktails</title>
          <meta name="description" content="Liste de courses consolidée pour préparer vos cocktails préférés." />
          <link rel="canonical" href="https://cocktail-app.fr/shopping-list" />
        </Helmet>
        <h1 className="text-2xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('shoppingList.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('shoppingList.empty')}</p>
        <Link
          to="/recipes"
          className="px-6 py-2.5 bg-gold-400 text-ink-900 rounded-xl font-medium text-sm hover:bg-gold-300 transition-colors"
        >
          {t('shoppingList.browseRecipes')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Helmet><title>{t('shoppingList.title')} — Cocktails</title></Helmet>

      <h1 className="text-3xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-2">
        {t('shoppingList.title')}
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        {t('shoppingList.subtitle', { count: cartIds.length })}
      </p>

      {/* Recettes sélectionnées + multiplicateur de portions */}
      <div className="mb-6 flex flex-wrap gap-2">
        {recipes.map((r) => (
          <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-ink-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
            <Link to={`/recipes/${r.slug || r.id}`} className="text-gray-700 dark:text-gray-300 hover:text-gold-500 transition-colors">
              {r.name}
            </Link>
            <span className="text-gray-400">×</span>
            <input
              type="number"
              min="1"
              max="20"
              value={servingsMultiplier[String(r.id)] || 1}
              onChange={(e) => handleMultiplierChange(r.id, e.target.value)}
              className="w-12 px-1 py-0.5 text-center border border-gray-200 dark:border-gray-700 rounded bg-transparent text-sm text-gray-700 dark:text-gray-300"
            />
          </div>
        ))}
      </div>

      {/* Stats */}
      {!loading && items.length > 0 && (
        <div className="flex items-center gap-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
          <span>{t('shoppingList.toBuy', { count: stats.totalItems - stats.inStockCount })}</span>
          {stats.inStockCount > 0 && (
            <span className="text-green-500">{t('shoppingList.inStockCount', { count: stats.inStockCount })}</span>
          )}
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-ink-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 mb-6">
          {items.map((item) => (
            <div
              key={item.ingredientId}
              className={`flex items-center gap-3 px-4 py-3 ${item.inStock ? 'opacity-50' : ''}`}
            >
              <input
                type="checkbox"
                checked={!!checked[item.ingredientId] || item.inStock}
                onChange={() => !item.inStock && toggleCheck(item.ingredientId)}
                disabled={item.inStock}
                className="rounded accent-gold-400 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${checked[item.ingredientId] || item.inStock ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                  {item.name}
                </span>
                {item.inStock && (
                  <span className="ml-2 text-xs text-green-500">{t('shoppingList.inStock')}</span>
                )}
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {item.recipes.map((r) => r.name).join(', ')}
                </div>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium text-right shrink-0">
                {item.quantities.map((q, i) => (
                  <span key={i}>{i > 0 && ' + '}{q.quantity} {q.unit}</span>
                ))}
              </div>
              {item.affiliateUrl && !item.inStock && (
                <a
                  href={item.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-xs text-gold-500 hover:text-gold-600 shrink-0"
                >
                  {t('recipes.buyIngredient')}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={handleShare}
          className="px-5 py-2 bg-gold-400 text-ink-900 rounded-lg font-medium text-sm hover:bg-gold-300 transition-colors"
        >
          {t('shoppingList.share')}
        </button>
        <button
          onClick={handleClear}
          className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg font-medium text-sm hover:border-red-400 hover:text-red-500 transition-colors"
        >
          {t('shoppingList.clearAll')}
        </button>
      </div>
    </div>
  )
}
