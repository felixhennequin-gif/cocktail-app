import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Texte affiché pour chaque type de notification
const formatNotif = (notif) => {
  const d = notif.data || {}
  switch (notif.type) {
    case 'NEW_RECIPE':
      return `${d.authorPseudo} a publié "${d.recipeName}"`
    case 'COMMENT_ON_RECIPE':
      return `${d.commenterPseudo} a commenté "${d.recipeName}" : ${d.commentPreview}`
    case 'RECIPE_APPROVED':
      return `Votre recette "${d.recipeName}" a été publiée !`
    default:
      return notif.type
  }
}

export default function NotificationBell() {
  const { user, authFetch }           = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen]               = useState(false)
  const containerRef                  = useRef(null)
  const navigate                      = useNavigate()

  // Polling toutes les 30s
  useEffect(() => {
    if (!user) return

    const load = () => {
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
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
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
        className="relative text-gray-500 hover:text-gray-800 transition-colors"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune notification</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotif(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors ${
                    !notif.read ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notif.read && (
                      <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                    <div className={!notif.read ? '' : 'ml-3.5'}>
                      <p className="text-sm text-gray-800 leading-snug">
                        {formatNotif(notif)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
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
