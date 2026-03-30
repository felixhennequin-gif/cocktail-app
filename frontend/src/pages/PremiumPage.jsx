import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../contexts/AuthContext'

// Icône coche pour le tableau de comparaison
function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-500 dark:text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

// Icône croix pour les fonctionnalités non disponibles
function CrossIcon() {
  return (
    <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// Badge Premium affiché si l'utilisateur est déjà Premium
function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      Premium
    </span>
  )
}

export default function PremiumPage() {
  const { t }    = useTranslation()
  const { user } = useAuth()

  const isPremium = user?.plan === 'PREMIUM'

  // Fonctionnalités listées dans le tableau de comparaison
  const features = [
    { label: t('premium.feature1'), free: false, premium: true },
    { label: t('premium.feature2'), free: false, premium: true },
    { label: t('premium.feature3'), free: false, premium: true },
    { label: t('premium.feature4'), free: false, premium: true },
  ]

  return (
    <>
      <Helmet>
        <title>{t('premium.title')} — Cocktails</title>
        <meta name="description" content={t('premium.heroSubtitle')} />
      </Helmet>

      <div className="max-w-3xl mx-auto">

        {/* Hero */}
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-6">
            <svg className="w-8 h-8 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>

          {isPremium ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {t('premium.alreadyPremium')}
              </h1>
              <div className="flex justify-center mb-4">
                <PremiumBadge />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-base">
                {t('premium.heroSubtitle')}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {t('premium.hero')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-base max-w-md mx-auto">
                {t('premium.heroSubtitle')}
              </p>
            </>
          )}
        </div>

        {/* Tableau de comparaison FREE vs PREMIUM */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          {/* En-têtes */}
          <div className="grid grid-cols-3 border-b border-gray-200 dark:border-gray-700">
            <div className="p-4 text-sm font-medium text-gray-500 dark:text-gray-400">
              Fonctionnalités
            </div>
            <div className="p-4 text-center border-l border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('premium.free')}</div>
              {!isPremium && user && (
                <div className="text-xs text-gold-500 dark:text-gold-400 mt-0.5">{t('premium.current')}</div>
              )}
            </div>
            <div className="p-4 text-center border-l border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/10">
              <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t('premium.premiumPlan')}</div>
              {isPremium && (
                <div className="text-xs text-amber-500 dark:text-amber-300 mt-0.5">{t('premium.current')}</div>
              )}
            </div>
          </div>

          {/* Lignes des fonctionnalités */}
          {features.map((feature, index) => (
            <div
              key={index}
              className="grid grid-cols-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
            >
              <div className="p-4 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                {feature.label}
              </div>
              <div className="p-4 border-l border-gray-100 dark:border-gray-700/50 flex items-center justify-center">
                {feature.free ? <CheckIcon /> : <CrossIcon />}
              </div>
              <div className="p-4 border-l border-gray-100 dark:border-gray-700/50 bg-amber-50/50 dark:bg-amber-900/5 flex items-center justify-center">
                {feature.premium ? <CheckIcon /> : <CrossIcon />}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {!isPremium && (
          <div className="text-center pb-12">
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              {t('premium.comingSoon')}
            </p>
            <a
              href="mailto:contact@cocktail-app.fr"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-ink-900 font-semibold rounded-xl transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('premium.contactUs')}
            </a>
          </div>
        )}

      </div>
    </>
  )
}
