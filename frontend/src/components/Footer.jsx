import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Logo from './Logo'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer data-bubble-collider className="relative z-1 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-900 transition-colors">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <Logo className="h-8 text-gray-900 dark:text-gray-100" />

        <div className="flex flex-col items-center gap-3 sm:items-end">
          <nav className="flex gap-4">
            <Link
              to="/blog"
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
            >
              {t('blog.title')}
            </Link>
            <Link
              to="/legal"
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
            >
              {t('footer.legal')}
            </Link>
          </nav>
          <p className="text-xs text-gray-500">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  )
}
