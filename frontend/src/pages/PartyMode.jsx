import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import PartyTimer from '../components/PartyTimer'

// Empêche l'écran de se mettre en veille via Wake Lock API
function useWakeLock() {
  const wakeLockRef = useRef(null)

  useEffect(() => {
    let active = true

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator && active) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake Lock non disponible ou refusé
      }
    }

    requestWakeLock()

    // Réacquérir le wake lock quand l'onglet redevient visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      document.removeEventListener('visibilitychange', handleVisibility)
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])
}

// Support du swipe tactile pour la navigation entre étapes
function useSwipe(onLeft, onRight) {
  const startX = useRef(null)
  const startY = useRef(null)

  const handleTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current
    // Seuil minimal de 50px et mouvement plus horizontal que vertical
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) onRight?.()
      else onLeft?.()
    }
    startX.current = null
    startY.current = null
  }, [onLeft, onRight])

  return { handleTouchStart, handleTouchEnd }
}

export default function PartyMode() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { authFetch } = useAuth()

  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // currentStep: -1 = ingrédients, 0..n = étapes, n+1 = terminé
  const [currentStep, setCurrentStep] = useState(-1)
  const [checkedIngredients, setCheckedIngredients] = useState(new Set())
  const [showTimer, setShowTimer] = useState(false)
  const containerRef = useRef(null)

  useWakeLock()

  // Charger la recette
  useEffect(() => {
    const controller = new AbortController()
    authFetch(`/api/recipes/${id}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Erreur ${res.status}`)
        }
        return res.json()
      })
      .then(setRecipe)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [id, authFetch])

  // Fullscreen au montage
  useEffect(() => {
    try {
      const el = document.documentElement
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } catch {
      // Fullscreen non supporté ou refusé
    }
    return () => {
      try {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      } catch {}
    }
  }, [])

  const totalSteps = recipe?.steps?.length ?? 0

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps))
  }, [totalSteps])

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, -1))
  }, [])

  // Navigation clavier
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      if (e.key === 'Escape') handleExit()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

  const { handleTouchStart, handleTouchEnd } = useSwipe(goNext, goPrev)

  const toggleIngredient = (idx) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleExit = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    } catch {}
    navigate(`/recipes/${id}`)
  }

  // Écran de chargement
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Écran d'erreur
  if (error || !recipe) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center text-white px-6">
        <p className="text-xl mb-4">{error || t('recipes.notFound')}</p>
        <button onClick={() => navigate(`/recipes/${id}`)} className="px-6 py-3 bg-amber-500 text-gray-900 rounded-xl font-medium">
          {t('party.exit')}
        </button>
      </div>
    )
  }

  const steps = recipe.steps?.sort((a, b) => a.order - b.order) ?? []
  const isOnIngredients = currentStep === -1
  const isOnDone = currentStep >= totalSteps
  const activeStep = !isOnIngredients && !isOnDone ? steps[currentStep] : null
  const progressPercent = totalSteps > 0 ? ((currentStep + 1) / (totalSteps + 1)) * 100 : 0

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-gray-950 text-white overflow-y-auto flex flex-col select-none"
    >
      {/* Barre de progression */}
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm">
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${Math.max(progressPercent, 2)}%` }}
          />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-8">
          <h1 className="text-amber-400 font-bold text-lg md:text-xl truncate mr-4">
            {recipe.name}
          </h1>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowTimer((v) => !v)}
              className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-colors text-amber-400"
              aria-label={t('party.timer')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={handleExit}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-colors text-sm font-medium text-gray-300"
            >
              {t('party.exit')}
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-6 max-w-3xl mx-auto w-full">

        {/* Timer (panneau déroulant) */}
        {showTimer && (
          <div className="w-full mb-6">
            <PartyTimer />
          </div>
        )}

        {/* Vue ingrédients */}
        {isOnIngredients && (
          <div className="w-full animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-bold text-amber-400 mb-6 text-center">
              {t('party.ingredients')}
            </h2>
            <ul className="space-y-3 mb-8">
              {recipe.ingredients?.map((ri, idx) => {
                const checked = checkedIngredients.has(idx)
                return (
                  <li key={idx}>
                    <button
                      onClick={() => toggleIngredient(idx)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all min-h-[48px] ${
                        checked
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? 'bg-amber-500 border-amber-500' : 'border-gray-600'
                      }`}>
                        {checked && (
                          <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-lg md:text-xl ${checked ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {ri.quantity && <span className="font-semibold text-amber-300">{ri.quantity} </span>}
                        {ri.unit && <span className="text-amber-300/70">{ri.unit} </span>}
                        {ri.ingredient?.name || ri.name}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Vue étape courante */}
        {activeStep && (
          <div className="w-full animate-fade-in text-center">
            <p className="text-amber-400/70 text-sm md:text-base font-medium mb-4 tracking-wide uppercase">
              {t('party.step', { current: currentStep + 1, total: totalSteps })}
            </p>
            {activeStep.imageUrl && (
              <img
                src={activeStep.imageUrl.startsWith('http') ? activeStep.imageUrl : `/api${activeStep.imageUrl.startsWith('/') ? '' : '/'}${activeStep.imageUrl}`}
                alt={t('recipes.stepAlt', { order: activeStep.order })}
                className="w-full max-w-md mx-auto aspect-video object-cover rounded-xl mb-6 border border-gray-800"
              />
            )}
            <p className="text-2xl md:text-[32px] leading-relaxed md:leading-relaxed text-gray-100 font-light">
              {activeStep.description}
            </p>
          </div>
        )}

        {/* Vue terminé */}
        {isOnDone && (
          <div className="w-full animate-fade-in text-center">
            <div className="text-6xl md:text-7xl mb-6">🍹</div>
            <h2 className="text-3xl md:text-4xl font-bold text-amber-400 mb-4">
              {t('party.done')}
            </h2>
            <button
              onClick={handleExit}
              className="mt-6 px-8 py-4 bg-amber-500 text-gray-900 rounded-2xl text-lg font-bold hover:bg-amber-400 active:bg-amber-300 transition-colors min-h-[48px]"
            >
              {t('party.exit')}
            </button>
          </div>
        )}
      </div>

      {/* Boutons navigation bas de page */}
      {!isOnDone && (
        <div className="sticky bottom-0 bg-gray-950/90 backdrop-blur-sm border-t border-gray-800 px-4 py-4 md:px-8">
          <div className="flex gap-4 max-w-3xl mx-auto">
            {currentStep > -1 && (
              <button
                onClick={goPrev}
                className="flex-1 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-colors text-gray-300 font-medium text-lg min-h-[56px]"
              >
                {t('party.prev')}
              </button>
            )}
            <button
              onClick={goNext}
              className="flex-1 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-300 transition-colors text-gray-900 font-bold text-lg min-h-[56px]"
            >
              {isOnIngredients ? t('party.start') : t('party.next')}
            </button>
          </div>
        </div>
      )}

      {/* Animation fade-in (injection CSS inline) */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
