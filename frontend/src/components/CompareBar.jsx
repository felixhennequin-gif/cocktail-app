import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useCompare from '../hooks/useCompare'

export default function CompareBar() {
  const { t } = useTranslation()
  const { ids, clear, compareUrl } = useCompare()

  if (ids.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-ink-800 rounded-xl border border-gold-300 dark:border-gold-600 shadow-lg animate-fade-in">
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {t('compare.selected', { count: ids.length })}
      </span>
      {compareUrl ? (
        <Link
          to={compareUrl}
          className="px-4 py-1.5 bg-gold-400 text-ink-900 rounded-lg font-medium text-sm hover:bg-gold-300 transition-colors"
        >
          {t('compare.compareNow')}
        </Link>
      ) : (
        <span className="text-xs text-gray-400 dark:text-gray-500">{t('compare.selectOneMore')}</span>
      )}
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
