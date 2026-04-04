import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import ConfirmModal from '../ConfirmModal'
import RatingStars from './RatingStars'

export default function CommentSection({ recipeId, isOwnRecipe, comments, setComments, myComment, setMyComment, commentScore, setCommentScore, avgRating: _avgRating, setAvgRating, ratingsCount: _ratingsCount, setRatingsCount }) {
  const { user, authFetch } = useAuth()
  const { showToast }       = useToast()
  const { t, i18n }         = useTranslation()

  const [commentText, setCommentText]     = useState(myComment?.content ?? '')
  const [commentTouched, setCommentTouched] = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [deleteId, setDeleteId]           = useState(null)
  const inputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const isEdit = Boolean(myComment)
    if (!isEdit && !commentScore) return
    setSubmitting(true)

    const url    = isEdit ? `/api/comments/${myComment.id}` : `/api/comments/${recipeId}`
    const method = isEdit ? 'PUT' : 'POST'
    const body   = { content: commentText }
    if (commentScore) body.score = commentScore

    try {
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const saved = await res.json()
        if (isEdit) {
          setComments((prev) => prev.map((c) => c.id === saved.id ? saved : c))
        } else {
          setComments((prev) => [saved, ...prev])
        }
        setMyComment(saved)
        showToast(isEdit ? t('recipes.editComment') + ' !' : t('recipes.submitComment') + ' !', 'success')
        authFetch(`/api/comments/${recipeId}`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.avgRating !== undefined) {
              setAvgRating(data.avgRating)
              setRatingsCount(data.ratingsCount ?? 0)
            }
          })
      } else {
        showToast(t('common.error'), 'error')
      }
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = () => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    inputRef.current?.focus()
  }

  const confirmDelete = async () => {
    const commentId = deleteId
    setDeleteId(null)
    const res = await authFetch(`/api/comments/${commentId}`, { method: 'DELETE' })
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      showToast(t('recipes.deleteComment'), 'info')
      if (myComment?.id === commentId) {
        setMyComment(null)
        setCommentText('')
      }
    } else {
      showToast(t('common.error'), 'error')
    }
  }

  return (
    <section>
      <ConfirmModal
        isOpen={!!deleteId}
        title={t('recipes.deleteComment')}
        message={t('recipes.deleteCommentMessage')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {t('recipes.commentsTitle')} {comments.length > 0 && <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">{t('recipes.commentsCount', { count: comments.length })}</span>}
      </h2>

      {user && isOwnRecipe ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
          {t('recipes.ownRecipeComment')}
        </p>
      ) : user ? (
        <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          {myComment && (
            <p className="text-xs text-gold-500 dark:text-gold-400 font-medium mb-3">
              {t('recipes.editMode')}
            </p>
          )}
          <div className="mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-2">
              {t('recipes.yourRating')} {!myComment && <span className="text-red-400">{t('recipes.required')}</span>}
            </span>
            <RatingStars value={commentScore} onChange={setCommentScore} />
          </div>
          <textarea
            ref={inputRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onBlur={() => setCommentTouched(true)}
            placeholder={t('recipes.commentPlaceholder')}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none mb-1 ${
              commentTouched && !commentText.trim() ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
            }`}
          />
          {commentTouched && !commentText.trim() && (
            <p className="text-xs text-red-500 mb-1">{t('recipes.commentEmpty')}</p>
          )}
          <button
            type="submit"
            disabled={submitting || !commentText.trim() || (!myComment && !commentScore)}
            className="px-4 py-2 bg-gold-400 text-white text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors"
          >
            {submitting ? t('recipes.sendingComment') : myComment ? t('recipes.editComment') : t('recipes.submitComment')}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
          <Link to="/login" className="text-gold-500 dark:text-gold-400 hover:underline">{t('recipes.loginToCommentLink')}</Link> {t('recipes.loginToComment')}
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">{t('recipes.noComments')}</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <Link to={`/users/${c.user.id}`} className="text-sm font-medium text-gold-500 dark:text-gold-400 hover:underline">
                  {c.user.pseudo}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString(i18n.language)}
                  </span>
                  {user?.id === c.userId && (
                    <button
                      onClick={handleEditClick}
                      className="text-xs text-gold-400 hover:text-gold-500 transition-colors"
                    >
                      {t('recipes.modifyComment')}
                    </button>
                  )}
                  {(user?.id === c.userId || user?.role === 'ADMIN' || isOwnRecipe) && (
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                    >
                      {t('recipes.deleteComment')}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
