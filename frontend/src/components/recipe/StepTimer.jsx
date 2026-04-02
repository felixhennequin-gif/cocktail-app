import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

// Génère un bip via Web Audio API (repris de PartyTimer)
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'square'
    gain.gain.value = 0.3

    osc.start()
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.setValueAtTime(0, now + 0.15)
    gain.gain.setValueAtTime(0.3, now + 0.3)
    gain.gain.setValueAtTime(0, now + 0.45)
    gain.gain.setValueAtTime(0.3, now + 0.6)
    gain.gain.setValueAtTime(0, now + 0.75)
    osc.stop(now + 0.8)
  } catch {
    // Web Audio non disponible — silencieux
  }
}

/**
 * Extrait la durée en secondes depuis un texte d'étape.
 * Reconnaît : "5 minutes", "30 sec", "2 heures", "1h30", "5 min", "10 secondes", etc.
 * Retourne null si aucune indication de temps trouvée.
 */
export function extractDuration(text) {
  if (!text) return null

  const lower = text.toLowerCase()

  // Pattern : nombre + unité (avec variantes fr/en)
  // Supporte : "5 minutes", "5 min", "30 secondes", "30 sec", "2 heures", "2h", "1h30"
  const patterns = [
    // "1h30", "2h15" → heures + minutes
    /(\d+)\s*h\s*(\d+)/,
    // "X heure(s)" ou "X h"
    /(\d+)\s*(?:heures?|hours?|h)\b/,
    // "X minute(s)" ou "X min"
    /(\d+)\s*(?:minutes?|min)\b/,
    // "X seconde(s)" ou "X sec"
    /(\d+)\s*(?:secondes?|seconds?|sec)\b/,
  ]

  // Vérifier "1h30" en premier
  const hMinMatch = lower.match(patterns[0])
  if (hMinMatch) {
    return parseInt(hMinMatch[1], 10) * 3600 + parseInt(hMinMatch[2], 10) * 60
  }

  // Heures
  const hMatch = lower.match(patterns[1])
  if (hMatch) {
    return parseInt(hMatch[1], 10) * 3600
  }

  // Minutes
  const minMatch = lower.match(patterns[2])
  if (minMatch) {
    return parseInt(minMatch[1], 10) * 60
  }

  // Secondes
  const secMatch = lower.match(patterns[3])
  if (secMatch) {
    return parseInt(secMatch[1], 10)
  }

  return null
}

/** Formate des secondes en mm:ss ou hh:mm:ss */
function formatTime(secs) {
  if (secs >= 3600) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function StepTimer({ durationSeconds }) {
  const { t } = useTranslation()
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const intervalRef = useRef(null)

  const stop = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
  }, [])

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            stop()
            setDone(true)
            playBeep()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(intervalRef.current)
    }
  }, [running, remaining, stop])

  const start = () => {
    setRemaining(durationSeconds)
    setDone(false)
    setRunning(true)
  }

  const reset = () => {
    stop()
    setRemaining(0)
    setDone(false)
  }

  // État initial : bouton "Lancer le minuteur"
  if (!running && remaining === 0 && !done) {
    return (
      <button
        onClick={start}
        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        title={t('recipes.startTimer')}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatTime(durationSeconds)}
      </button>
    )
  }

  // Timer terminé
  if (done) {
    return (
      <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg animate-pulse">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {t('recipes.timerDone')}
        <button
          onClick={reset}
          className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Reset"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  // Timer en cours
  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-mono tabular-nums">{formatTime(remaining)}</span>
      <span className="text-amber-500 dark:text-amber-500">{t('recipes.timerRunning')}</span>
      <button
        onClick={reset}
        className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="Reset"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
