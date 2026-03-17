import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import ConfirmModal from '../../components/ConfirmModal'

const statusBadge = {
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DRAFT:     'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  PENDING:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export default function AdminRecipeList() {
  const { user, authFetch } = useAuth()
  const { showToast }       = useToast()
  const { t }               = useTranslation()

  const STATUS_FILTERS = [
    { key: null,        label: t('admin.filters.all') },
    { key: 'PUBLISHED', label: t('admin.filters.published') },
    { key: 'DRAFT',     label: t('admin.filters.drafts') },
    { key: 'PENDING',   label: t('admin.filters.pending') },
  ]
  const [recipes, setRecipes]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [confirm, setConfirm]           = useState(null) // { id, name }
  const navigate = useNavigate()

  const fetchRecipes = (filter) => {
    setLoading(true)
    const qs = filter ? `?limit=100&status=${filter}` : '?limit=100'
    authFetch(`/api/recipes${qs}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur de chargement')
        return res.json()
      })
      .then((data) => setRecipes(data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') { navigate('/'); return }
    fetchRecipes(statusFilter)
  }, [user, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (id, name) => setConfirm({ id, name })

  const confirmDelete = async () => {
    const { id } = confirm
    setConfirm(null)
    const res = await authFetch(`/api/recipes/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      fetchRecipes(statusFilter)
      showToast(t('admin.deletedToast'), 'success')
    } else {
      showToast(t('admin.deleteErrorToast'), 'error')
    }
  }

  return (
    <div>
      <ConfirmModal
        isOpen={!!confirm}
        title={t('admin.deleteTitle')}
        message={confirm ? t('admin.deleteMessage', { name: confirm.name }) : ''}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirm(null)}
      />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('admin.recipesTitle')}</h1>
          <Link to="/admin/pending" className="text-sm text-amber-600 dark:text-amber-400 hover:underline font-medium">
            {t('admin.pendingLink')}
          </Link>
        </div>
        <Link
          to="/admin/recipes/new"
          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
        >
          {t('admin.newRecipe')}
        </Link>
      </div>

      {/* Filtres rapides */}
      <div className="flex gap-1 mb-4">
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={String(key)}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === key
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400 dark:text-gray-500 py-8 text-center">{t('admin.loading')}</p>}
      {error   && <p className="text-red-500 py-8 text-center">{error}</p>}

      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 w-2/5">{t('admin.table.name')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{t('admin.table.status')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{t('admin.table.category')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{t('admin.table.difficulty')}</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">{t('admin.table.createdAt')}</th>
                <th className="border-l-2 border-gray-300 dark:border-gray-600 px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-center">{t('admin.table.edit')}</th>
                <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-center">{t('admin.table.delete')}</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 dark:text-gray-500 py-8">{t('admin.table.noRecipes')}</td>
                </tr>
              )}
              {recipes.map((recipe, i) => (
                <tr
                  key={recipe.id}
                  className={`border-b border-gray-100 dark:border-gray-700 ${
                    i % 2 === 0
                      ? 'bg-white dark:bg-gray-800'
                      : 'bg-gray-50 dark:bg-gray-750'
                  } hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{recipe.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[recipe.status]}`}>
                      {t(`recipes.status.${recipe.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{recipe.category?.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t(`recipes.difficulty.${recipe.difficulty}`)}</td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500">
                    {new Date(recipe.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="border-l-2 border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                    <button
                      onClick={() => navigate(`/admin/recipes/${recipe.id}/edit`)}
                      className="inline-flex items-center gap-1.5 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer transition-all duration-150 px-3 py-1"
                    >
                      {t('admin.editRecipeButton')}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(recipe.id, recipe.name)}
                      className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-700 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer transition-all duration-150 px-3 py-1"
                    >
                      {t('admin.deleteRecipeButton')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
