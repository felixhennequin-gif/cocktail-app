import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getImageUrl } from '../utils/image'
import ConfirmModal from '../components/ConfirmModal'
import AddToCollectionModal from '../components/AddToCollectionModal'

const difficultyColor = {
  EASY:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HARD:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// Unités discrètes où on affiche des fractions plutôt que des décimales
const DISCRETE_UNITS = new Set([
  'piece', 'pieces', 'pièce', 'pièces',
  'slice', 'slices', 'tranche', 'tranches',
  'leaf', 'leaves', 'feuille', 'feuilles',
  'dash', 'dashes', 'drop', 'drops', 'goutte', 'gouttes',
])

// Fractions Unicode lisibles
const FRACTIONS = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'],
  [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'],
]

const formatQty = (qty, unit) => {
  if (!isFinite(qty) || qty <= 0) return '—'
  const rounded = Math.round(qty * 100) / 100
  if (DISCRETE_UNITS.has(unit?.toLowerCase())) {
    const whole = Math.floor(rounded)
    const frac  = rounded - whole
    for (const [val, sym] of FRACTIONS) {
      if (Math.abs(frac - val) < 0.06) {
        return whole === 0 ? sym : `${whole} ${sym}`
      }
    }
  }
  // Supprime les zéros inutiles : 1.50 → 1.5, 2.00 → 2
  return parseFloat(rounded.toFixed(2)).toString()
}

function PortionSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-bold flex items-center justify-center hover:border-amber-400 hover:text-amber-600 transition-colors"
      >
        −
      </button>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value)
          if (v >= 1) onChange(v)
        }}
        className="w-12 text-center border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-bold flex items-center justify-center hover:border-amber-400 hover:text-amber-600 transition-colors"
      >
        +
      </button>
    </div>
  )
}

// Étoiles interactives (contrôlées par le parent via value/onChange)
function RatingStars({ value, onChange }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value ?? 0

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className={`text-2xl leading-none transition-colors ${
            n <= display ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600'
          } hover:text-amber-400`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function RecipeDetail() {
  const { id }              = useParams()
  const { user, authFetch } = useAuth()
  const { showToast }       = useToast()
  const { t, i18n }         = useTranslation()

  const [recipe, setRecipe]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [avgRating, setAvgRating]     = useState(null)
  const [ratingsCount, setRatingsCount] = useState(0)
  const [comments, setComments]         = useState([])
  const [myComment, setMyComment]       = useState(null)
  const [commentText, setCommentText]   = useState('')
  const [commentScore, setCommentScore] = useState(null)
  const [commentTouched, setCommentTouched] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [deleteCommentId, setDeleteCommentId] = useState(null)
  const [portionCount, setPortionCount] = useState(1)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const commentInputRef = useRef(null)

  // Chargement de la recette (isFavorited + userScore inclus si connecté) et des commentaires
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    authFetch(`/api/recipes/${id}`, { signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Erreur ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        setRecipe(data)
        setAvgRating(data.avgRating)
        setRatingsCount(data.ratingsCount)
        setPortionCount(data.servings ?? 1)
        setIsFavorited(data.isFavorited ?? false)
        setCommentScore(data.userScore ?? null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))

    // Commentaires (avec avgRating mis à jour)
    authFetch(`/api/comments/${id}`, { signal })
      .then((r) => r.ok ? r.json() : { comments: [], myComment: null })
      .then(({ comments: list, myComment: mine, avgRating: avg, ratingsCount: cnt }) => {
        setComments(list)
        setMyComment(mine)
        if (mine) setCommentText(mine.content)
        if (avg !== undefined) { setAvgRating(avg); setRatingsCount(cnt ?? 0) }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [id, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleFavorite = async () => {
    if (!user) return
    const res = await authFetch(`/api/favorites/${id}`, { method: 'POST' })
    if (!res.ok) { showToast(t('favorites.errorToast'), 'error'); return }
    const data = await res.json()
    setIsFavorited(data.favorited)
    showToast(data.favorited ? t('favorites.addToast') : t('favorites.removeToast'), 'success')
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const isEdit = Boolean(myComment)
    // Score obligatoire pour un nouveau commentaire
    if (!isEdit && !commentScore) return
    setSubmittingComment(true)

    const url    = isEdit ? `/api/comments/${myComment.id}` : `/api/comments/${id}`
    const method = isEdit ? 'PUT' : 'POST'
    const body   = { content: commentText }
    if (commentScore) body.score = commentScore

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
      // Rafraîchir la moyenne depuis le endpoint commentaires
      fetch(`/api/comments/${id}`, {
        headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {},
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.avgRating !== undefined) {
            setAvgRating(data.avgRating)
            setRatingsCount(data.ratingsCount ?? 0)
          }
        })
    }
    setSubmittingComment(false)
  }

  const handleEditClick = () => {
    commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    commentInputRef.current?.focus()
  }

  const handleDeleteComment = (commentId) => setDeleteCommentId(commentId)

  const confirmDeleteComment = async () => {
    const commentId = deleteCommentId
    setDeleteCommentId(null)
    const res = await authFetch(`/api/comments/${commentId}`, { method: 'DELETE' })
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      showToast(t('recipes.deleteComment'), 'info')
      // Si l'utilisateur supprime son propre commentaire, réinitialiser le formulaire
      if (myComment?.id === commentId) {
        setMyComment(null)
        setCommentText('')
      }
    } else {
      showToast(t('common.error'), 'error')
    }
  }

  if (loading) return <p className="text-center text-gray-400 dark:text-gray-500 py-16">{t('common.loading')}</p>
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="text-5xl mb-4">🍹</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('recipes.notFound')}</h2>
      <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">{error}</p>
      <Link to="/" className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-medium">
        {t('recipes.backToHome')}
      </Link>
    </div>
  )

  const isOwnRecipe = recipe.author?.id === user?.id

  const metaDescription = recipe.description
    || `${recipe.name} — ${t(`recipes.difficulty.${recipe.difficulty}`)}, ${recipe.prepTime} min.`

  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>{recipe.name} — Cocktails</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={recipe.name} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        {recipe.imageUrl && <meta property="og:image" content={getImageUrl(recipe.imageUrl)} />}
      </Helmet>
      <ConfirmModal
        isOpen={!!deleteCommentId}
        title={t('recipes.deleteComment')}
        message={t('recipes.deleteCommentMessage')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={confirmDeleteComment}
        onCancel={() => setDeleteCommentId(null)}
      />
      {/* Modale d'ajout à une collection */}
      <AddToCollectionModal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        recipeId={id}
      />
      <Link to="/" className="text-sm text-amber-600 dark:text-amber-400 hover:underline mb-6 inline-block">
        {t('recipes.backToList')}
      </Link>

      {/* Bannière variante de */}
      {recipe.parentRecipe && (
        <div className="mb-4 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg text-sm text-indigo-700 dark:text-indigo-400">
          {t('recipes.variantOfFull')}{' '}
          <Link to={`/recipes/${recipe.parentRecipe.id}`} className="font-semibold hover:underline">
            {recipe.parentRecipe.name}
          </Link>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-8">
        <img
          src={getImageUrl(recipe.imageUrl)}
          alt={recipe.name}
          className="w-full h-56 object-cover rounded-xl mb-6 bg-gray-100 dark:bg-gray-700"
        />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{recipe.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${difficultyColor[recipe.difficulty]}`}>
              {t(`recipes.difficulty.${recipe.difficulty}`)}
            </span>
            {user && (
              <button
                onClick={handleToggleFavorite}
                className={`text-2xl leading-none transition-colors ${isFavorited ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}
                title={isFavorited ? t('recipes.removeFavorite') : t('recipes.addFavorite')}
              >
                ♥
              </button>
            )}
            {user && (
              <button
                onClick={() => setCollectionModalOpen(true)}
                className="text-xl leading-none text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors"
                title={t('collections.addRecipe')}
              >
                +
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span>⏱ {recipe.prepTime} min</span>
          {recipe.category && <span>📂 {recipe.category.name}</span>}
          {recipe.author && (
            <Link
              to={`/users/${recipe.author.id}`}
              className="text-amber-600 dark:text-amber-400 hover:underline"
            >
              {t('common.by')} {recipe.author.pseudo}
            </Link>
          )}
        </div>

        {/* Note moyenne */}
        <div className="flex items-center gap-3 mb-4">
          {avgRating !== null ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ★ <span className="font-medium text-gray-800 dark:text-gray-200">{t('recipes.avgRating', { value: avgRating })}</span>
              <span className="text-gray-400 dark:text-gray-500 ml-1">{t('recipes.ratingsCount', { count: ratingsCount })}</span>
            </span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">{t('recipes.notRated')}</span>
          )}
        </div>

        {recipe.description && (
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{recipe.description}</p>
        )}

        {/* Tags */}
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {recipe.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/?tags=${tag.id}`}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        )}

        {recipe.servings && (
          <div className="flex items-center gap-3 mt-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('recipes.for')}</span>
            <PortionSelector value={portionCount} onChange={setPortionCount} />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('recipes.glasses', { count: portionCount })}
            </span>
          </div>
        )}

        {recipe.status === 'PENDING' && (
          <div className="mt-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-400">
            {t('recipes.pending')}
          </div>
        )}
      </div>

      {/* Ingrédients */}
      {recipe.ingredients?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('recipes.ingredients')}</h2>
          <ul className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {recipe.ingredients.map((ri) => {
              const baseServings = recipe.servings ?? 1
              const displayQty   = ri.quantity * (portionCount / baseServings)
              return (
                <li key={ri.id} className="flex justify-between items-center px-4 py-3 text-sm">
                  <span className="text-gray-800 dark:text-gray-200">{ri.ingredient.name}</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {formatQty(displayQty, ri.unit)} {ri.unit}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Étapes */}
      {recipe.steps?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('recipes.preparation')}</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step) => (
              <li key={step.id} className="flex gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">
                  {step.order}
                </span>
                <div className="flex-1 pt-0.5">
                  {step.imageUrl && (
                    <img
                      src={getImageUrl(step.imageUrl)}
                      alt={t('recipes.stepAlt', { order: step.order })}
                      className="w-full max-w-sm rounded-lg mb-2 border border-gray-100 dark:border-gray-700"
                    />
                  )}
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Variantes */}
      {recipe.variants?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('recipes.variants')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recipe.variants.map((v) => (
              <Link
                key={v.id}
                to={`/recipes/${v.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500 transition-all"
              >
                <img
                  src={getImageUrl(v.imageUrl)}
                  alt={v.name}
                  className="w-full h-24 object-cover bg-gray-100 dark:bg-gray-700"
                />
                <div className="p-2.5">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{v.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className={`font-medium px-1.5 py-0.5 rounded-full ${difficultyColor[v.difficulty]}`}>
                      {t(`recipes.difficulty.${v.difficulty}`)}
                    </span>
                    <span>{v.prepTime} min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bouton proposer une variante — seulement si connecté et recette non-variante */}
      {user && !recipe.parentRecipeId && (
        <div className="mb-8">
          <Link
            to={`/recipes/new?variantOf=${recipe.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            {t('recipes.proposeVariant')}
          </Link>
        </div>
      )}

      {/* Commentaires */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('recipes.commentsTitle')} {comments.length > 0 && <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">{t('recipes.commentsCount', { count: comments.length })}</span>}
        </h2>

        {user && isOwnRecipe ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            {t('recipes.ownRecipeComment')}
          </p>
        ) : user ? (
          <form onSubmit={handleSubmitComment} className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            {myComment && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-3">
                {t('recipes.editMode')}
              </p>
            )}
            {/* Note obligatoire */}
            <div className="mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-2">
                {t('recipes.yourRating')} {!myComment && <span className="text-red-400">{t('recipes.required')}</span>}
              </span>
              <RatingStars value={commentScore} onChange={setCommentScore} />
            </div>
            <textarea
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onBlur={() => setCommentTouched(true)}
              placeholder={t('recipes.commentPlaceholder')}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-1 ${
                commentTouched && !commentText.trim() ? 'border-red-400' : 'border-gray-200 dark:border-gray-600'
              }`}
            />
            {commentTouched && !commentText.trim() && (
              <p className="text-xs text-red-500 mb-1">{t('recipes.commentEmpty')}</p>
            )}
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim() || (!myComment && !commentScore)}
              className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors"
            >
              {submittingComment ? t('recipes.sendingComment') : myComment ? t('recipes.editComment') : t('recipes.submitComment')}
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
            <Link to="/login" className="text-amber-600 dark:text-amber-400 hover:underline">{t('recipes.loginToCommentLink')}</Link> {t('recipes.loginToComment')}
          </p>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('recipes.noComments')}</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <Link to={`/users/${c.user.id}`} className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline">
                    {c.user.pseudo}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString(i18n.language)}
                    </span>
                    {user?.id === c.userId && (
                      <button
                        onClick={handleEditClick}
                        className="text-xs text-amber-400 hover:text-amber-600 transition-colors"
                      >
                        {t('recipes.modifyComment')}
                      </button>
                    )}
                    {(user?.id === c.userId || user?.role === 'ADMIN' || isOwnRecipe) && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
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
    </div>
  )
}
