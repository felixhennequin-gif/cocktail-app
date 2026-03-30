import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useFavorites } from '../contexts/FavoritesContext'
import RecipeCard from '../components/RecipeCard'
import ConfirmModal from '../components/ConfirmModal'
import { getImageUrl } from '../utils/image'

export default function CollectionDetail() {
  const { id }              = useParams()
  const { user, authFetch } = useAuth()
  const { showToast }       = useToast()
  const { t }               = useTranslation()
  const { isFavorited, toggleFavorite } = useFavorites()
  const navigate            = useNavigate()

  const [collection, setCollection] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  // État pour l'édition inline
  const [editing, setEditing]       = useState(false)
  const [editName, setEditName]     = useState('')
  const [editDesc, setEditDesc]     = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Suppression de la collection
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Retrait de recette
  const [removeRecipeId, setRemoveRecipeId] = useState(null)

  // Chargement de la collection
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    authFetch(`/api/collections/${id}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Erreur ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        setCollection(data)
        setEditName(data.name)
        setEditDesc(data.description || '')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sauvegarder les modifications de la collection
  const handleEditSave = async (e) => {
    e.preventDefault()
    if (!editName.trim()) return
    setEditSaving(true)
    try {
      const res = await authFetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCollection((c) => ({ ...c, ...updated }))
        setEditing(false)
        showToast(t('collections.updatedToast'), 'success')
      } else {
        showToast(t('collections.errorToast'), 'error')
      }
    } catch {
      showToast(t('collections.errorToast'), 'error')
    } finally {
      setEditSaving(false)
    }
  }

  // Supprimer la collection
  const confirmDelete = async () => {
    setDeleteOpen(false)
    try {
      const res = await authFetch(`/api/collections/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        showToast(t('collections.deletedToast'), 'info')
        navigate(`/users/${user.id}`)
      } else {
        showToast(t('collections.errorToast'), 'error')
      }
    } catch {
      showToast(t('collections.errorToast'), 'error')
    }
  }

  // Retirer une recette de la collection
  const confirmRemoveRecipe = async () => {
    const recipeId = removeRecipeId
    setRemoveRecipeId(null)
    try {
      const res = await authFetch(`/api/collections/${id}/recipes/${recipeId}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setCollection((c) => ({
          ...c,
          recipes: c.recipes.filter((r) => r.id !== recipeId),
        }))
        showToast(t('collections.removedToast'), 'info')
      } else {
        showToast(t('collections.errorToast'), 'error')
      }
    } catch {
      showToast(t('collections.errorToast'), 'error')
    }
  }

  if (loading) return <p className="text-center text-gray-400 dark:text-gray-500 py-16">{t('common.loading')}</p>
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('common.error')}</h2>
      <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">{error}</p>
      <Link to="/" className="px-5 py-2.5 bg-gold-400 text-ink-900 rounded-xl hover:bg-gold-500 transition-colors text-sm font-medium">
        {t('recipes.backToHome')}
      </Link>
    </div>
  )

  const isOwner = user?.id === collection.user?.id

  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{collection.name} — Cocktails</title>
        <meta name="description" content={collection.description || `Collection de cocktails par ${collection.user?.pseudo}`} />
        <meta property="og:site_name" content="Cocktail App" />
        <meta property="og:title" content={`${collection.name} — Collection`} />
        <meta property="og:description" content={collection.description || `Collection de cocktails par ${collection.user?.pseudo}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://cocktail-app.fr/collections/${collection.id}`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${collection.name} — Collection`} />
      </Helmet>

      {/* Modale de confirmation de suppression */}
      <ConfirmModal
        isOpen={deleteOpen}
        title={t('collections.delete')}
        message={t('collections.deleteMessage')}
        confirmLabel={t('collections.delete')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Modale de confirmation de retrait de recette */}
      <ConfirmModal
        isOpen={!!removeRecipeId}
        title={t('collections.removeRecipe')}
        message={t('collections.deleteMessage')}
        confirmLabel={t('collections.removeRecipe')}
        variant="warning"
        onConfirm={confirmRemoveRecipe}
        onCancel={() => setRemoveRecipeId(null)}
      />

      {/* Lien retour */}
      {isOwner && (
        <Link to={`/users/${user.id}`} className="text-sm text-gold-500 dark:text-gold-400 hover:underline mb-6 inline-block">
          {t('recipes.backToList')}
        </Link>
      )}

      {/* En-tête de la collection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        {editing ? (
          // Formulaire d'édition
          <form onSubmit={handleEditSave} className="space-y-3">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              placeholder={t('collections.namePlaceholder')}
              required
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
              placeholder={t('collections.descriptionPlaceholder')}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={editSaving || !editName.trim()}
                className="px-4 py-2 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors"
              >
                {editSaving ? t('collections.editSaving') : t('collections.editSave')}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditName(collection.name); setEditDesc(collection.description || '') }}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
              >
                {t('profile.cancel')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{collection.name}</h1>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                collection.isPublic
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {collection.isPublic ? t('collections.public') : t('collections.private')}
              </span>
            </div>

            {collection.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{collection.description}</p>
            )}

            {/* Auteur */}
            {collection.user && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
                {t('collections.by', { pseudo: '' })}
                <Link
                  to={`/users/${collection.user.id}`}
                  className="text-gold-500 dark:text-gold-400 hover:underline"
                >
                  {collection.user.pseudo}
                </Link>
              </p>
            )}

            {/* Nombre de recettes */}
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              {t('collections.recipesCount', { count: collection.recipes?.length || 0 })}
            </p>

            {/* Actions propriétaire */}
            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-full hover:border-gold-300 dark:hover:border-gold-500 hover:text-gold-400 dark:hover:text-gold-300 transition-colors"
                >
                  {t('collections.edit')}
                </button>
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 text-red-400 dark:text-red-500 rounded-full hover:border-red-300 dark:hover:border-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  {t('collections.delete')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Liste des recettes */}
      {collection.recipes?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-3">{t('collections.empty')}</p>
          <Link to="/recipes" className="text-sm text-gold-500 dark:text-gold-400 hover:underline">
            {t('collections.browseLink')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {collection.recipes.map((recipe) => (
            <div key={recipe.id} className="relative">
              <RecipeCard
                recipe={recipe}
                isFavorited={isFavorited(recipe.id)}
                onToggleFavorite={toggleFavorite}
              />
              {/* Bouton retirer (propriétaire uniquement) */}
              {isOwner && (
                <button
                  onClick={() => setRemoveRecipeId(recipe.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:border-red-300 dark:hover:border-red-500 text-xs flex items-center justify-center transition-colors"
                  title={t('collections.removeRecipe')}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
