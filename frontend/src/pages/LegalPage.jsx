import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'

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

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('legal.editor')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('legal.editorInfo')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('legal.hosting')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('legal.hostingInfo')}
          </p>
        </section>
      </div>
    </>
  )
}
