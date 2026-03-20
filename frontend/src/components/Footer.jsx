import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  const links = [
    { label: t('footer.legal'), href: '#' },
    { label: t('footer.contact'), href: '#' },
    { label: t('footer.about'), href: '#' },
  ]

  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-900 transition-colors">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <span className="font-serif text-lg text-gray-900 dark:text-gray-100">
          Cocktails
        </span>

        <div className="flex flex-col items-center gap-3 sm:items-end">
          <nav className="flex gap-4">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-gray-400 dark:text-gray-500 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-gray-500">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
