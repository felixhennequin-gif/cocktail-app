import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOfflineCache } from '../hooks/useOfflineCache'

// Bannière affichée en haut de page quand l'utilisateur est hors-ligne
export default function OfflineBanner() {
  const { t } = useTranslation()
  const { isOnline } = useOfflineCache()
  const [visible, setVisible] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)
  const [showBackOnline, setShowBackOnline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setVisible(true)
      setWasOffline(true)
      setShowBackOnline(false)
    } else if (wasOffline) {
      // Retour en ligne : affiche un message temporaire puis masque
      setVisible(false)
      setShowBackOnline(true)
      const timer = setTimeout(() => setShowBackOnline(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  if (!visible && !showBackOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        w-full text-sm font-medium text-center py-2 px-4
        transition-all duration-300 ease-in-out
        motion-reduce:transition-none
        ${showBackOnline
          ? 'bg-green-600 dark:bg-green-700 text-white'
          : 'bg-ink-800 dark:bg-ink-900 text-gold-400 border-b border-gold-400/30'
        }
        animate-slide-down
      `}
    >
      {showBackOnline ? t('offline.backOnline') : t('offline.banner')}
    </div>
  )
}
