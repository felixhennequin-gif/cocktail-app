import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

// Génère un bip via Web Audio API
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
    // 3 bips courts
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

const PRESETS = [60, 120, 300] // 1min, 2min, 5min

export default function PartyTimer() {
  const { t } = useTranslation()
  const [seconds, setSeconds] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [customInput, setCustomInput] = useState('')
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

  const startTimer = (secs) => {
    setSeconds(secs)
    setRemaining(secs)
    setDone(false)
    setRunning(true)
  }

  const handleCustom = () => {
    const mins = parseInt(customInput, 10)
    if (mins > 0 && mins <= 60) {
      startTimer(mins * 60)
      setCustomInput('')
    }
  }

  const togglePause = () => {
    if (running) {
      stop()
    } else if (remaining > 0) {
      setRunning(true)
    }
  }

  const reset = () => {
    stop()
    setRemaining(0)
    setSeconds(0)
    setDone(false)
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0

  return (
    <div className="bg-gray-900/50 rounded-2xl p-6 backdrop-blur-sm border border-amber-500/20">
      <h3 className="text-amber-400 text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {t('party.timer')}
      </h3>

      {/* Affichage du temps */}
      {seconds > 0 && (
        <div className="text-center mb-4">
          <div className={`text-5xl md:text-6xl font-mono font-bold mb-2 ${done ? 'text-green-400 animate-pulse' : 'text-white'}`}>
            {formatTime(remaining)}
          </div>
          {done && (
            <p className="text-green-400 text-lg font-medium">{t('party.timerDone')}</p>
          )}
          {/* Barre de progression */}
          <div className="w-full h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Presets — affichés seulement quand pas de timer actif */}
      {seconds === 0 && (
        <div className="space-y-3">
          <div className="flex gap-3 justify-center">
            {PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => startTimer(s)}
                className="px-5 py-3 bg-amber-500/20 text-amber-300 rounded-xl text-lg font-medium hover:bg-amber-500/30 active:bg-amber-500/40 transition-colors min-w-[80px]"
              >
                {s / 60} min
              </button>
            ))}
          </div>
          {/* Custom */}
          <div className="flex gap-2 justify-center items-center">
            <input
              type="number"
              min="1"
              max="60"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
              placeholder="min"
              className="w-20 px-3 py-2.5 bg-gray-800 text-white rounded-xl text-center text-lg border border-gray-700 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={handleCustom}
              disabled={!customInput || parseInt(customInput, 10) <= 0}
              className="px-4 py-2.5 bg-amber-500 text-gray-900 rounded-xl font-medium hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Controles play/pause/reset */}
      {seconds > 0 && (
        <div className="flex gap-3 justify-center mt-4">
          <button
            onClick={togglePause}
            className="px-6 py-3 bg-amber-500/20 text-amber-300 rounded-xl text-lg font-medium hover:bg-amber-500/30 active:bg-amber-500/40 transition-colors min-h-[48px]"
          >
            {running ? '⏸' : '▶'}
          </button>
          <button
            onClick={reset}
            className="px-6 py-3 bg-gray-700/50 text-gray-300 rounded-xl text-lg font-medium hover:bg-gray-700/70 active:bg-gray-600/50 transition-colors min-h-[48px]"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
