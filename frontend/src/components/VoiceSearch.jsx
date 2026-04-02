import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export default function VoiceSearch({ onResult }) {
  const { t, i18n } = useTranslation()
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  // Déterminer la langue pour la reconnaissance vocale
  const getLang = useCallback(() => {
    return i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US'
  }, [i18n.language])

  useEffect(() => {
    return () => {
      // Nettoyage à la destruction du composant
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  const toggle = useCallback(() => {
    if (listening) {
      // Arrêter l'écoute
      recognitionRef.current?.stop()
      return
    }

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = getLang()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      if (transcript && onResult) {
        onResult(transcript)
      }
    }

    recognition.onerror = () => {
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [listening, getLang, onResult])

  // Ne pas afficher le bouton si l'API n'est pas supportée
  if (!SpeechRecognition) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? t('recipes.listening') : t('recipes.voiceSearch')}
      aria-label={listening ? t('recipes.listening') : t('recipes.voiceSearch')}
      className={`
        flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0
        ${listening
          ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
          : 'text-gray-400 dark:text-gray-500 hover:text-gold-500 dark:hover:text-gold-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-4 h-4 ${listening ? 'animate-pulse' : ''}`}
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    </button>
  )
}
