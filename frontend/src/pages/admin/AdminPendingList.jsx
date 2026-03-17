import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import ConfirmModal from '../../components/ConfirmModal'

export default function AdminPendingList() {
  const { user, authFetch } = useAuth()
  const { showToast }       = useToast()
  const { t }               = useTranslation()
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
      .catch(() => setError(t('admin.loadError')))
      .finally(() => setLoading(false))
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePublish = async (id) => {
    const res = await authFetch(`/api/recipes/${id}/publish`, { method: 'PATCH' })
    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r.id !== id))
      showToast(t('admin.publishedToast'), 'success')
    } else {
      showToast(t('admin.publishErrorToast'), 'error')
    }
  }

  const handleReject = (id) => setRejectId(id)

  const confirmReject = async () => {
    const id = rejectId
    setRejectId(null)
    const res = await authFetch(`/api/recipes/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setRecipes((prev) => prev.filter((r) => r.id !== id))
      showToast(t('admin.rejectedToast'), 'info')
    }
  }

  if (loading) return <p className="text-center text-gray-400 dark:text-gray-500 py-16">{t('admin.loading')}</p>

  return (
    <div>
      <ConfirmModal
        isOpen={!!rejectId}
        title={t('admin.rejectTitle')}
        message={t('admin.rejectMessage')}
        confirmLabel={t('admin.rejectConfirm')}
        variant="danger"
        onConfirm={confirmReject}
        onCancel={() => setRejectId(null)}
      />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('admin.pendingTitle')}{' '}
          {recipes.length > 0 && (
            <span className="text-sm font-normal text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
              {recipes.length}
            </span>
          )}
        </h1>
        <Link to="/admin" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          {t('admin.backAdmin')}
        </Link>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {recipes.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-gray-500 py-16">{t('admin.noPending')}</p>
      ) : (
        <div className="space-y-4">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700 p-5 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">{recipe.name}</h2>
                  <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{t('admin.filters.pending')}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {recipe.category?.name} · {recipe.prepTime} min
                </p>
                {recipe.author && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('admin.proposedBy')}{' '}
                    <Link to={`/users/${recipe.author.id}`} className="text-amber-600 dark:text-amber-400 hover:underline">
                      {recipe.author.pseudo}
                    </Link>
                  </p>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                >
                  {t('admin.view')}
                </Link>
                <button
                  onClick={() => handlePublish(recipe.id)}
                  className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  {t('admin.publishButton')}
                </button>
                <button
                  onClick={() => handleReject(recipe.id)}
                  className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                >
                  {t('admin.rejectButton')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
