import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Helmet>
        <title>404 — {t('common.notFoundTitle')} — Cocktails</title>
      </Helmet>
      <div className="text-7xl mb-6">🍹</div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">{t('common.notFound404')}</h1>
      <p className="text-xl text-gray-500 dark:text-gray-400 mb-2">{t('common.notFoundTitle')}</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
        {t('common.notFoundMessage')}
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors"
      >
        {t('common.backHome')}
      </Link>
    </div>
  )
}
