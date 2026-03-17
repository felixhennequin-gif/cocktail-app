import { useTranslation } from 'react-i18next'

export default function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const isEn = i18n.language === 'en'

  const toggle = () => {
    const next = isEn ? 'fr' : 'en'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
    document.documentElement.setAttribute('lang', next)
  }

  return (
    <button
      onClick={toggle}
      className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors tracking-wide"
      title={isEn ? t('common.switchToFrench') : t('common.switchToEnglish')}
    >
      {isEn ? 'FR' : 'EN'}
    </button>
  )
}
