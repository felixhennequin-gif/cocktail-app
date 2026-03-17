import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function FollowButton({ targetUserId, initialIsFollowing }) {
  const { user, authFetch }     = useAuth()
  const { showToast }           = useToast()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading]   = useState(false)
  const [hovered, setHovered]   = useState(false)

  // Ne pas afficher si non connecté ou si c'est son propre profil
  if (!user || user.id === targetUserId) return null

  const toggle = async () => {
    setLoading(true)
    const prev = isFollowing
    setIsFollowing(!isFollowing) // optimistic update
    try {
      const res = await authFetch(
        `/api/users/${targetUserId}/follow`,
        { method: isFollowing ? 'DELETE' : 'POST' }
      )
      if (!res.ok) {
        setIsFollowing(prev) // rollback
        showToast('Erreur lors de la mise à jour du suivi', 'error')
      } else {
        showToast(isFollowing ? 'Abonnement retiré' : 'Abonnement ajouté !', 'success')
      }
    } catch {
      setIsFollowing(prev) // rollback
      showToast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={loading}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? hovered
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
          : 'bg-amber-500 text-white hover:bg-amber-600'
      }`}
    >
      {isFollowing ? (hovered ? 'Se désabonner' : 'Suivi ✓') : 'Suivre'}
    </button>
  )
}
