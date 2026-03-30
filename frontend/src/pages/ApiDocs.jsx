import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function ApiDocs() {
  const { t } = useTranslation()
  const { user, authFetch } = useAuth()
  const { showToast } = useToast()

  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState(null) // clé affichée juste après création
  const [revokeTargetId, setRevokeTargetId] = useState(null)

  // Charge la liste des clés de l'utilisateur connecté
  const fetchKeys = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await authFetch('/api/api-keys')
      if (res.ok) {
        const data = await res.json()
        setKeys(data)
      }
    } catch {
      // erreur réseau silencieuse
    } finally {
      setLoading(false)
    }
  }, [user, authFetch])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  // Crée une nouvelle clé API
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await authFetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || t('common.error'), 'error')
        return
      }
      setNewKey(data.key) // valeur brute affichée une seule fois
      setNewKeyName('')
      await fetchKeys()
      showToast(t('apiDocs.created'), 'success')
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setCreating(false)
    }
  }

  // Révoque une clé API
  const handleRevoke = async (id) => {
    try {
      const res = await authFetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id))
        if (revokeTargetId === id) setRevokeTargetId(null)
        showToast(t('apiDocs.revoke'), 'info')
      } else {
        const data = await res.json()
        showToast(data.error || t('common.error'), 'error')
      }
    } catch {
      showToast(t('common.error'), 'error')
    }
  }

  // Copie la clé dans le presse-papier
  const handleCopy = (value) => {
    navigator.clipboard.writeText(value).then(() => {
      showToast(t('apiDocs.copied'), 'success')
    })
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })

  return (
    <>
      <Helmet>
        <title>{t('apiDocs.title')} — Cocktails</title>
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-10">
        {/* Titre */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('apiDocs.title')}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {t('apiDocs.subtitle')}
          </p>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm text-gold-500 dark:text-gold-400 underline hover:text-gold-600 dark:hover:text-gold-300"
          >
            {t('apiDocs.title')} (full reference) &rarr;
          </a>
        </div>

        {/* Section clés API — visible uniquement si connecté */}
        {user ? (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {t('apiDocs.myKeys')}
            </h2>

            {/* Affichage unique de la clé créée */}
            {newKey && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                  {t('apiDocs.created')} — {t('apiDocs.copied').replace('!', '')} now, it will not be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white dark:bg-ink-900 border border-green-300 dark:border-green-700 rounded px-3 py-2 font-mono break-all">
                    {newKey}
                  </code>
                  <button
                    onClick={() => handleCopy(newKey)}
                    className="shrink-0 px-3 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    {t('apiDocs.copied').replace('!', '')}
                  </button>
                </div>
                <button
                  onClick={() => setNewKey(null)}
                  className="mt-2 text-xs text-green-600 dark:text-green-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Formulaire de création */}
            <form onSubmit={handleCreate} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={t('apiDocs.keyNamePlaceholder')}
                maxLength={100}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-ink-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              <button
                type="submit"
                disabled={creating || !newKeyName.trim()}
                className="px-4 py-2 text-sm font-medium bg-gold-400 hover:bg-gold-300 text-ink-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? t('common.loading') : t('apiDocs.createKey')}
              </button>
            </form>

            {/* Note limite */}
            {keys.length >= 5 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                {t('apiDocs.maxKeys')}
              </p>
            )}

            {/* Liste des clés */}
            {loading ? (
              <div className="text-sm text-gray-400">{t('common.loading')}</div>
            ) : keys.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('apiDocs.noKeys')}</p>
            ) : (
              <ul className="space-y-3">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-ink-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {k.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Created {formatDate(k.createdAt)}
                        {k.lastUsedAt && ` · Last used ${formatDate(k.lastUsedAt)}`}
                      </p>
                    </div>
                    {revokeTargetId === k.id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('apiDocs.revokeConfirm')}
                        </span>
                        <button
                          onClick={() => handleRevoke(k.id)}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          {t('common.confirm')}
                        </button>
                        <button
                          onClick={() => setRevokeTargetId(null)}
                          className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:underline"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevokeTargetId(k.id)}
                        className="shrink-0 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        {t('apiDocs.revoke')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-800 dark:text-amber-300">
            <a href="/login" className="underline font-medium">
              {t('nav.login')}
            </a>{' '}
            to create and manage your API keys.
          </div>
        )}

        {/* Lien vers la documentation complète */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Reference
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Complete endpoint reference, parameters, response examples and code snippets:
          </p>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium bg-gold-400 hover:bg-gold-300 text-ink-900 rounded-lg transition-colors"
          >
            Open API reference &rarr;
          </a>
        </section>
      </div>
    </>
  )
}
