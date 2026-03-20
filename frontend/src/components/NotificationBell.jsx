import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

// Texte affiché pour chaque type de notification
const formatNotif = (notif, t) => {
  const d = notif.data || {}
  switch (notif.type) {
    case 'NEW_RECIPE':
      return t('common.notifNewRecipe', { author: d.authorPseudo, recipe: d.recipeName })
    case 'COMMENT_ON_RECIPE':
      return t('common.notifComment', { commenter: d.commenterPseudo, recipe: d.recipeName, preview: d.commentPreview })
    case 'RECIPE_APPROVED':
      return t('common.notifApproved', { recipe: d.recipeName })
    default:
      return notif.type
  }
}

export default function NotificationBell() {
  const { user, authFetch }           = useAuth()
  const { t }                         = useTranslation()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen]               = useState(false)
  const containerRef                  = useRef(null)
  const navigate                      = useNavigate()

  // Polling toutes les 60s, uniquement si l'onglet est actif
  useEffect(() => {
    if (!user) return

    const load = () => {
      if (document.visibilityState !== 'visible') return
      authFetch('/api/notifications')
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return
          setNotifications(data.data)
          setUnreadCount(data.unreadCount)
        })
        .catch(() => {})
    }

    load()
    const interval = setInterval(load, 60_000)

    // Reprendre le polling dès que l'onglet redevient visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fermer au clic extérieur
  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    // À l'ouverture, marquer tout comme lu
    if (next && unreadCount > 0) {
      setUnreadCount(0)
      authFetch('/api/notifications/read-all', { method: 'PUT' }).catch(() => {})
    }
  }

  const handleClickNotif = (notif) => {
    setOpen(false)
    if (notif.data?.recipeId) navigate(`/recipes/${notif.data.recipeId}`)
  }

  if (!user) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
        title={t('common.notifications')}
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('common.notifications')}</p>
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('common.noNotifications')}</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotif(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors ${
                    !notif.read ? 'bg-gold-50/40 dark:bg-gold-900/10' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notif.read && (
                      <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-gold-400" />
                    )}
                    <div className={!notif.read ? '' : 'ml-3.5'}>
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                        {formatNotif(notif, t)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
