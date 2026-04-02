import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'

const sections = [
  { num: 1, title: 'siteEditor', content: 'siteEditorContent' },
  { num: 2, title: 'hosting', content: 'hostingContent' },
  { num: 3, title: 'ip', content: 'ipContent' },
  { num: 4, title: 'gdpr', content: 'gdprContent' },
  { num: 5, title: 'cookies', content: 'cookiesContent' },
  { num: 6, title: 'liability', content: 'liabilityContent' },
]

export default function LegalPage() {
  const { t } = useTranslation()

  return (
    <>
      <Helmet>
        <title>{t('legal.title')} — Cocktails</title>
        <meta name="description" content="Mentions légales et conditions d'utilisation du site Écume." />
        <link rel="canonical" href="https://cocktail-app.fr/legal" />
      </Helmet>

      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-8">
          {t('legal.title')}
        </h1>

        {sections.map(({ num, title, content }) => (
          <section key={num} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {num}. {t(`legal.${title}`)}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
              {t(`legal.${content}`)}
            </p>
          </section>
        ))}
      </div>
    </>
  )
}
