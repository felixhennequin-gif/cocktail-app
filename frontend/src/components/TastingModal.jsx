import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function TastingModal({ recipeId, recipeName, isOpen, onClose }) {
  const { t } = useTranslation()
  const { authFetch } = useAuth()
  const { showToast } = useToast()

  const [notes, setNotes] = useState('')
  const [adjustments, setAdjustments] = useState('')
  const [personalRating, setPersonalRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await authFetch('/api/upload', { method: 'POST', body: formData, rawBody: true })
      if (res.ok) {
        const data = await res.json()
        setPhotoUrl(data.url)
      }
    } catch { /* upload silencieux */ }
    setUploading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    const body = { recipeId }
    if (notes.trim()) body.notes = notes.trim()
    if (adjustments.trim()) body.adjustments = adjustments.trim()
    if (personalRating > 0) body.personalRating = personalRating
    if (photoUrl) body.photoUrl = photoUrl

    try {
      const res = await authFetch('/api/tastings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        showToast(t('tastings.loggedToast'))
        // Reset
        setNotes('')
        setAdjustments('')
        setPersonalRating(0)
        setPhotoUrl('')
        onClose()
      }
    } catch { /* erreur gérée silencieusement */ }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasting-modal-title"
        className="bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-5">
          <h2 id="tasting-modal-title" className="text-lg font-serif font-medium text-gray-900 dark:text-gray-100 mb-1">
            {t('tastings.logTitle')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{recipeName}</p>

          {/* Note personnelle */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('tastings.personalRating')}
            </label>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={t('tastings.ratingAria', { count: i + 1 })}
                  className={`text-2xl transition-colors ${
                    i < (hoverRating || personalRating) ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'
                  }`}
                  onMouseEnter={() => setHoverRating(i + 1)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setPersonalRating(i + 1 === personalRating ? 0 : i + 1)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('tastings.notesLabel')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm text-gray-700 dark:text-gray-300 resize-none"
              placeholder={t('tastings.notesPlaceholder')}
            />
          </div>

          {/* Ajustements */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('tastings.adjustmentsLabel')}
            </label>
            <textarea
              value={adjustments}
              onChange={(e) => setAdjustments(e.target.value)}
              rows={2}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-ink-800 text-sm text-gray-700 dark:text-gray-300 resize-none"
              placeholder={t('tastings.adjustmentsPlaceholder')}
            />
          </div>

          {/* Photo */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('tastings.photo')}
            </label>
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-gold-400 transition-colors">
                {uploading ? t('submit.fields.uploading') : t('tastings.addPhoto')}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gold-400 text-ink-900 rounded-lg font-medium text-sm hover:bg-gold-300 disabled:opacity-50 transition-colors"
            >
              {submitting ? t('common.loading') : t('tastings.logButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
