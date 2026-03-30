import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Données des questions
// Chaque option contient un objet `scores` qui additionne des points
// à des profils de cocktails identifiés par leur clé.
// ---------------------------------------------------------------------------
const QUESTIONS = [
  {
    key: 'mood',
    titleKey: 'quiz.q1.title',
    options: [
      { labelKey: 'quiz.q1.a', scores: { mojito: 2, pinacol: 2 } },
      { labelKey: 'quiz.q1.b', scores: { margarita: 2, negroni: 1 } },
      { labelKey: 'quiz.q1.c', scores: { cosmo: 2, espresso: 1 } },
      { labelKey: 'quiz.q1.d', scores: { cosmo: 2, oldFashioned: 2 } },
    ],
  },
  {
    key: 'taste',
    titleKey: 'quiz.q2.title',
    options: [
      { labelKey: 'quiz.q2.a', scores: { cosmo: 2, pinacol: 1 } },
      { labelKey: 'quiz.q2.b', scores: { negroni: 3, oldFashioned: 2 } },
      { labelKey: 'quiz.q2.c', scores: { margarita: 3, mojito: 1 } },
      { labelKey: 'quiz.q2.d', scores: { espresso: 2, virginMojito: 2 } },
    ],
  },
  {
    key: 'season',
    titleKey: 'quiz.q3.title',
    options: [
      { labelKey: 'quiz.q3.a', scores: { mojito: 3, pinacol: 2, margarita: 1 } },
      { labelKey: 'quiz.q3.b', scores: { oldFashioned: 3, negroni: 2 } },
      { labelKey: 'quiz.q3.c', scores: { cosmo: 2, virginMojito: 2 } },
      { labelKey: 'quiz.q3.d', scores: { espresso: 2, negroni: 1 } },
    ],
  },
  {
    key: 'occasion',
    titleKey: 'quiz.q4.title',
    options: [
      { labelKey: 'quiz.q4.a', scores: { negroni: 3, cosmo: 1 } },
      { labelKey: 'quiz.q4.b', scores: { mojito: 2, margarita: 2, cosmo: 1 } },
      { labelKey: 'quiz.q4.c', scores: { oldFashioned: 3, espresso: 2 } },
      { labelKey: 'quiz.q4.d', scores: { virginMojito: 3, pinacol: 1 } },
    ],
  },
  {
    key: 'spirit',
    titleKey: 'quiz.q5.title',
    options: [
      { labelKey: 'quiz.q5.a', scores: { mojito: 3, pinacol: 2 } },
      { labelKey: 'quiz.q5.b', scores: { cosmo: 3, margarita: 1 } },
      { labelKey: 'quiz.q5.c', scores: { negroni: 3, oldFashioned: 1 } },
      { labelKey: 'quiz.q5.d', scores: { oldFashioned: 3, espresso: 1 } },
      { labelKey: 'quiz.q5.e', scores: { margarita: 3 } },
      { labelKey: 'quiz.q5.f', scores: { virginMojito: 5, espresso: 1 } },
    ],
  },
  {
    key: 'complexity',
    titleKey: 'quiz.q6.title',
    options: [
      { labelKey: 'quiz.q6.a', scores: { mojito: 2, margarita: 1, virginMojito: 2 } },
      { labelKey: 'quiz.q6.b', scores: { negroni: 2, espresso: 2, oldFashioned: 2 } },
    ],
  },
  {
    key: 'vibe',
    titleKey: 'quiz.q7.title',
    options: [
      { labelKey: 'quiz.q7.a', scores: { mojito: 3, pinacol: 3 } },
      { labelKey: 'quiz.q7.b', scores: { oldFashioned: 3, negroni: 2 } },
      { labelKey: 'quiz.q7.c', scores: { espresso: 3, cosmo: 2 } },
      { labelKey: 'quiz.q7.d', scores: { margarita: 2, pinacol: 2 } },
    ],
  },
]

// ---------------------------------------------------------------------------
// Profils de résultats
// ---------------------------------------------------------------------------
const PROFILES = {
  mojito: {
    key: 'mojito',
    nameKey: 'quiz.profiles.mojito.name',
    descKey: 'quiz.profiles.mojito.desc',
    emoji: '🌿',
    searchQuery: 'mojito',
  },
  margarita: {
    key: 'margarita',
    nameKey: 'quiz.profiles.margarita.name',
    descKey: 'quiz.profiles.margarita.desc',
    emoji: '🍋',
    searchQuery: 'margarita',
  },
  oldFashioned: {
    key: 'oldFashioned',
    nameKey: 'quiz.profiles.oldFashioned.name',
    descKey: 'quiz.profiles.oldFashioned.desc',
    emoji: '🥃',
    searchQuery: 'old fashioned',
  },
  cosmo: {
    key: 'cosmo',
    nameKey: 'quiz.profiles.cosmo.name',
    descKey: 'quiz.profiles.cosmo.desc',
    emoji: '🍸',
    searchQuery: 'cosmopolitan',
  },
  pinacol: {
    key: 'pinacol',
    nameKey: 'quiz.profiles.pinacol.name',
    descKey: 'quiz.profiles.pinacol.desc',
    emoji: '🍍',
    searchQuery: 'pina colada',
  },
  negroni: {
    key: 'negroni',
    nameKey: 'quiz.profiles.negroni.name',
    descKey: 'quiz.profiles.negroni.desc',
    emoji: '🍊',
    searchQuery: 'negroni',
  },
  espresso: {
    key: 'espresso',
    nameKey: 'quiz.profiles.espresso.name',
    descKey: 'quiz.profiles.espresso.desc',
    emoji: '☕',
    searchQuery: 'espresso martini',
  },
  virginMojito: {
    key: 'virginMojito',
    nameKey: 'quiz.profiles.virginMojito.name',
    descKey: 'quiz.profiles.virginMojito.desc',
    emoji: '🫧',
    searchQuery: 'virgin mojito',
  },
}

// ---------------------------------------------------------------------------
// Calcul du profil gagnant à partir des réponses
// ---------------------------------------------------------------------------
function computeResult(answers) {
  const totals = {}
  QUESTIONS.forEach((q, qi) => {
    const optIdx = answers[qi]
    if (optIdx == null) return
    const scores = q.options[optIdx]?.scores ?? {}
    Object.entries(scores).forEach(([profile, pts]) => {
      totals[profile] = (totals[profile] ?? 0) + pts
    })
  })
  let best = 'mojito'
  let bestPts = -1
  Object.entries(totals).forEach(([k, v]) => {
    if (v > bestPts) { bestPts = v; best = k }
  })
  return best
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
export default function CocktailQuiz() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Si un paramètre ?result= est présent dans l'URL, afficher directement le résultat
  const resultParam = searchParams.get('result')
  const initialResult = resultParam && PROFILES[resultParam] ? resultParam : null

  const [step, setStep] = useState(initialResult ? 'result' : 'intro') // 'intro' | 'question' | 'result'
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(initialResult)
  const [animating, setAnimating] = useState(false)
  const [copied, setCopied] = useState(false)

  const total = QUESTIONS.length
  const profile = result ? PROFILES[result] : null

  // Sélection d'une option — déclenche une transition avant de passer à la question suivante
  const selectOption = useCallback((optIdx) => {
    if (animating) return
    const newAnswers = { ...answers, [currentQ]: optIdx }
    setAnswers(newAnswers)

    setAnimating(true)
    setTimeout(() => {
      if (currentQ < total - 1) {
        setCurrentQ((q) => q + 1)
      } else {
        const winner = computeResult(newAnswers)
        setResult(winner)
        setStep('result')
        // Mettre à jour l'URL pour partage sans recharger la page
        const url = new URL(window.location.href)
        url.searchParams.set('result', winner)
        window.history.replaceState({}, '', url.toString())
      }
      setAnimating(false)
    }, 280)
  }, [animating, answers, currentQ, total])

  // Retour à la question précédente
  const goBack = useCallback(() => {
    if (currentQ === 0) {
      setStep('intro')
    } else {
      setCurrentQ((q) => q - 1)
    }
  }, [currentQ])

  // Recommencer le quiz
  const retake = useCallback(() => {
    setAnswers({})
    setCurrentQ(0)
    setResult(null)
    setStep('intro')
    setCopied(false)
    // Retirer le paramètre result de l'URL
    const url = new URL(window.location.href)
    url.searchParams.delete('result')
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Démarrer le quiz
  const start = useCallback(() => {
    setStep('question')
  }, [])

  // Partager le résultat
  const share = useCallback(() => {
    if (!result) return
    const url = new URL(window.location.href)
    url.searchParams.set('result', result)
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => {
      // Fallback : sélectionner le texte
    })
  }, [result])

  const progressPercent = total > 0 ? ((currentQ) / total) * 100 : 0
  const lang = i18n.language

  // ---------------------------------------------------------------------------
  // Rendu — Écran d'introduction
  // ---------------------------------------------------------------------------
  if (step === 'intro') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Helmet>
          <title>{t('quiz.title')} — Cocktails</title>
        </Helmet>
        <div
          className="text-7xl mb-6 select-none"
          role="img"
          aria-hidden="true"
          style={{ animation: 'quizBounce 2s ease-in-out infinite' }}
        >
          🍹
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
          {t('quiz.title')}
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-md mx-auto">
          {t('quiz.subtitle')}
        </p>
        <button
          onClick={start}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gold-400 hover:bg-gold-300 text-ink-900 font-bold text-lg rounded-2xl transition-colors shadow-md hover:shadow-lg active:scale-95"
          style={{ transition: 'background-color 0.15s, box-shadow 0.15s, transform 0.1s' }}
        >
          {t('quiz.startQuiz')}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5-5 5M6 7l5 5-5 5" />
          </svg>
        </button>
        <QuizAnimStyles />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Rendu — Résultat
  // ---------------------------------------------------------------------------
  if (step === 'result' && profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center" style={{ animation: 'quizFadeUp 0.4s ease-out' }}>
        <Helmet>
          <title>{t('quiz.resultTitle', { cocktail: t(profile.nameKey) })} — Cocktails</title>
        </Helmet>

        {/* Emoji principal */}
        <div
          className="text-8xl mb-5 select-none"
          role="img"
          aria-label={t(profile.nameKey)}
          style={{ animation: 'quizBounce 2.5s ease-in-out infinite' }}
        >
          {profile.emoji}
        </div>

        {/* Titre résultat */}
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
          {t('quiz.resultTitle', { cocktail: t(profile.nameKey) })}
        </h1>

        {/* Description */}
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-10 max-w-md mx-auto leading-relaxed">
          {t(profile.descKey)}
        </p>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            to={`/recipes?q=${encodeURIComponent(profile.searchQuery)}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gold-400 hover:bg-gold-300 text-ink-900 font-bold rounded-xl transition-colors shadow-sm hover:shadow-md active:scale-95"
            style={{ transition: 'background-color 0.15s, box-shadow 0.15s, transform 0.1s' }}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {t('quiz.seeRecipe')}
          </Link>

          <button
            onClick={share}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white dark:bg-ink-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-ink-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors active:scale-95"
            style={{ transition: 'background-color 0.15s, transform 0.1s' }}
          >
            {copied ? (
              <>
                <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {t('quiz.copied')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t('quiz.share')}
              </>
            )}
          </button>

          <button
            onClick={retake}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium rounded-xl transition-colors active:scale-95 underline-offset-2 hover:underline"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('quiz.retake')}
          </button>
        </div>

        <QuizAnimStyles />
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Rendu — Question en cours
  // ---------------------------------------------------------------------------
  const question = QUESTIONS[currentQ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Helmet>
        <title>{t('quiz.title')} — Cocktails</title>
      </Helmet>

      {/* Barre de progression */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('quiz.question', { current: currentQ + 1, total })}
          </span>
          <button
            onClick={goBack}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
            aria-label={t('common.prev')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-400 rounded-full"
            style={{
              width: `${Math.max(progressPercent, 4)}%`,
              transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            role="progressbar"
            aria-valuenow={currentQ + 1}
            aria-valuemin={1}
            aria-valuemax={total}
          />
        </div>
      </div>

      {/* Question */}
      <div
        key={currentQ}
        style={{ animation: animating ? 'quizFadeOut 0.28s ease-in forwards' : 'quizFadeUp 0.32s ease-out' }}
      >
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-7 leading-snug text-center">
          {t(question.titleKey)}
        </h2>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {question.options.map((opt, idx) => {
            const selected = answers[currentQ] === idx
            return (
              <button
                key={idx}
                onClick={() => selectOption(idx)}
                disabled={animating}
                className={[
                  'w-full text-left px-5 py-4 rounded-xl border-2 font-medium text-base transition-all min-h-[56px]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2',
                  selected
                    ? 'border-gold-400 bg-gold-400/10 dark:bg-gold-400/15 text-gray-900 dark:text-white'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-800 text-gray-700 dark:text-gray-200 hover:border-gold-300 dark:hover:border-gold-500 hover:bg-gold-50 dark:hover:bg-gold-400/5',
                  animating ? 'opacity-60 cursor-wait' : 'cursor-pointer active:scale-[0.98]',
                ].join(' ')}
                style={{ transition: 'border-color 0.15s, background-color 0.15s, transform 0.1s, opacity 0.2s' }}
              >
                <span className="flex items-center gap-3">
                  {/* Indicateur de sélection */}
                  <span
                    className={[
                      'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                      selected ? 'border-gold-400 bg-gold-400' : 'border-gray-300 dark:border-gray-600',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    {selected && (
                      <svg className="w-3 h-3 text-ink-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {t(opt.labelKey)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <QuizAnimStyles />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Injection des keyframes CSS (évite les animations de bibliothèques tierces)
// prefers-reduced-motion respecté
// ---------------------------------------------------------------------------
function QuizAnimStyles() {
  return (
    <style>{`
      @keyframes quizFadeUp {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes quizFadeOut {
        from { opacity: 1; transform: translateY(0); }
        to   { opacity: 0; transform: translateY(-12px); }
      }
      @keyframes quizBounce {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-8px); }
      }
      @media (prefers-reduced-motion: reduce) {
        [style*="quizFadeUp"],
        [style*="quizFadeOut"],
        [style*="quizBounce"] {
          animation: none !important;
        }
      }
    `}</style>
  )
}
