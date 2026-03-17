import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import ConfirmModal from '../../components/ConfirmModal'

export default function AdminPendingList() {
  const { user, authFetch } = useAuth()
  const { showToast }       = useToast()
  const navigate = useNavigate()

  const [recipes, setRecipes]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [rejectId, setRejectId] = useState(null)

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') { navigate('/'); return }
    authFetch('/api/recipes?status=PENDING&limit=100')
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((data) => setRecipes(data.data))
      .catch(() => setError('Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = async (id) => {
    const res = await authFetch(`/api/recipes/${id}/publish`, { method: 'PATCH' })
    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r.id !== id))
      showToast('Recette publiée avec succès !', 'success')
    } else {
      showToast('Erreur lors de la publication', 'error')
    }
  }

  const handleReject = (id) => setRejectId(id)

  const confirmReject = async () => {
    const id = rejectId
    setRejectId(null)
    const res = await authFetch(`/api/recipes/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setRecipes((prev) => prev.filter((r) => r.id !== id))
      showToast('Recette refusée et supprimée', 'info')
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-16">Chargement...</p>

  return (
    <div>
      <ConfirmModal
        isOpen={!!rejectId}
        title="Refuser la recette"
        message="Supprimer définitivement cette recette ? Cette action est irréversible."
        confirmLabel="Refuser et supprimer"
        variant="danger"
        onConfirm={confirmReject}
        onCancel={() => setRejectId(null)}
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Recettes en attente{' '}
          {recipes.length > 0 && (
            <span className="text-sm font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {recipes.length}
            </span>
          )}
        </h1>
        <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-800">
          ← Retour admin
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {recipes.length === 0 ? (
        <p className="text-center text-gray-400 py-16">Aucune recette en attente de validation.</p>
      ) : (
        <div className="space-y-4">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-xl border border-amber-200 p-5 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-gray-900">{recipe.name}</h2>
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">En attente</span>
                </div>
                <p className="text-sm text-gray-500 mb-1">
                  {recipe.category?.name} · {recipe.prepTime} min
                </p>
                {recipe.author && (
                  <p className="text-xs text-gray-400">
                    Proposé par{' '}
                    <Link to={`/users/${recipe.author.id}`} className="text-amber-600 hover:underline">
                      {recipe.author.pseudo}
                    </Link>
                  </p>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
                >
                  Voir
                </Link>
                <button
                  onClick={() => handlePublish(recipe.id)}
                  className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  Publier
                </button>
                <button
                  onClick={() => handleReject(recipe.id)}
                  className="px-3 py-1.5 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
