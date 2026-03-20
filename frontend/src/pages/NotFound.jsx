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
      <div className="text-6xl font-serif font-normal text-gold-400 mb-4">404</div>
      <h1 className="text-2xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-3">{t('common.notFoundTitle')}</h1>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
        {t('common.notFoundMessage')}
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-gold-400 text-ink-900 font-medium rounded-xl hover:bg-gold-300 transition-colors"
      >
        {t('common.backHome')}
      </Link>
    </div>
  )
}
