import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

/**
 * Modale pour ajouter/retirer une recette d'une collection.
 * Props :
 *   isOpen    : boolean
 *   onClose   : () => void
 *   recipeId  : number — identifiant de la recette
 */
export default function AddToCollectionModal({ isOpen, onClose, recipeId }) {
  const { authFetch } = useAuth()
  const { showToast } = useToast()
  const { t }         = useTranslation()

  const [collections, setCollections] = useState([])
  const [loading, setLoading]         = useState(false)

  // Identifiants des collections contenant déjà cette recette
  const [includedIds, setIncludedIds] = useState(new Set())

  // Création inline d'une nouvelle collection
  const [newName, setNewName]     = useState('')
  const [creating, setCreating]   = useState(false)

  // Charger les collections de l'utilisateur à l'ouverture
  // Le paramètre recipeId permet au backend de calculer containsRecipe en une seule requête
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    authFetch(`/api/collections/me?recipeId=${parseInt(recipeId)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((list) => {
        setCollections(list)
        // Construire l'ensemble des ids à partir du champ containsRecipe fourni par le backend
        const ids = new Set(list.filter((col) => col.containsRecipe).map((col) => col.id))
        setIncludedIds(ids)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, recipeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ajouter la recette à une collection
  const handleAdd = async (collectionId) => {
    try {
      const res = await authFetch(`/api/collections/${collectionId}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: parseInt(recipeId) }),
      })
      if (res.ok) {
        setIncludedIds((prev) => new Set([...prev, collectionId]))
        showToast(t('collections.addedToast'), 'success')
      } else if (res.status === 409) {
        showToast(t('collections.alreadyIn'), 'info')
        setIncludedIds((prev) => new Set([...prev, collectionId]))
      } else {
        showToast(t('collections.errorToast'), 'error')
      }
    } catch {
      showToast(t('collections.errorToast'), 'error')
    }
  }

  // Retirer la recette d'une collection
  const handleRemove = async (collectionId) => {
    try {
      const res = await authFetch(`/api/collections/${collectionId}/recipes/${recipeId}`, {
        method: 'DELETE',
      })
      if (res.ok || res.status === 204) {
        setIncludedIds((prev) => {
          const next = new Set(prev)
          next.delete(collectionId)
          return next
        })
        showToast(t('collections.removedToast'), 'info')
      } else {
        showToast(t('collections.errorToast'), 'error')
      }
    } catch {
      showToast(t('collections.errorToast'), 'error')
    }
  }

  // Créer une nouvelle collection et y ajouter la recette
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await authFetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), isPublic: true }),
      })
      if (res.ok) {
        const created = await res.json()
        showToast(t('collections.createdToast'), 'success')
        setNewName('')
        // Ajouter la recette à la nouvelle collection
        const addRes = await authFetch(`/api/collections/${created.id}/recipes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId: parseInt(recipeId) }),
        })
        const newCol = { ...created, recipesCount: addRes.ok ? 1 : 0 }
        setCollections((prev) => [newCol, ...prev])
        if (addRes.ok) {
          setIncludedIds((prev) => new Set([...prev, created.id]))
          showToast(t('collections.addedToast'), 'success')
        }
      } else {
        const data = await res.json().catch(() => ({}))
        showToast(data.error || t('collections.errorToast'), 'error')
      }
    } catch {
      showToast(t('collections.errorToast'), 'error')
    } finally {
      setCreating(false)
    }
  }

  const modalRef = useRef(null)

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector('button, input, [tabindex]:not([tabindex="-1"])')
      firstFocusable?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="collection-modal-title" className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="collection-modal-title" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          {t('collections.addRecipe')}
        </h2>

        {/* Formulaire de création inline */}
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('collections.namePlaceholder')}
            className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-3 py-2 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors shrink-0"
          >
            {creating ? t('collections.saving') : t('collections.save')}
          </button>
        </form>

        {/* Liste des collections */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">{t('common.loading')}</p>
          ) : collections.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">{t('collections.noCollections')}</p>
          ) : (
            collections.map((col) => {
              const isIncluded = includedIds.has(col.id)
              return (
                <button
                  key={col.id}
                  onClick={() => isIncluded ? handleRemove(col.id) : handleAdd(col.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left text-sm transition-colors ${
                    isIncluded
                      ? 'border-gold-300 dark:border-gold-600 bg-gold-50 dark:bg-gold-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gold-300 dark:hover:border-gold-500'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{col.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('collections.recipesCount', { count: col.recipesCount ?? 0 })}
                    </p>
                  </div>
                  {isIncluded && (
                    <span className="text-gold-400 text-lg shrink-0 ml-2">✓</span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
        >
          {t('profile.cancel')}
        </button>
      </div>
    </div>
  )
}
