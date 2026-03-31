import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useShoppingCart from '../hooks/useShoppingCart'

export default function ShoppingCartBar() {
  const { t } = useTranslation()
  const { count, clear } = useShoppingCart()

  if (count === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-ink-800 rounded-xl border border-green-300 dark:border-green-600 shadow-lg animate-fade-in">
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {t('shoppingList.cartCount', { count })}
      </span>
      <Link
        to="/shopping-list"
        className="px-4 py-1.5 bg-gold-400 text-ink-900 rounded-lg font-medium text-sm hover:bg-gold-300 transition-colors"
      >
        {t('shoppingList.viewList')}
      </Link>
      <button
        onClick={clear}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        aria-label={t('common.cancel')}
      >
        ✕
      </button>
    </div>
  )
}
