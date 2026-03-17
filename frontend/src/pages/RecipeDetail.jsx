import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getImageUrl } from '../utils/image'
import ConfirmModal from '../components/ConfirmModal'

const difficultyLabel = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' }
const difficultyColor = {
  EASY:   'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HARD:   'bg-red-100 text-red-700',
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
        className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 text-sm font-bold flex items-center justify-center hover:border-amber-400 hover:text-amber-600 transition-colors"
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
        className="w-12 text-center border border-gray-200 rounded-lg py-1 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 text-sm font-bold flex items-center justify-center hover:border-amber-400 hover:text-amber-600 transition-colors"
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
            n <= display ? 'text-amber-400' : 'text-gray-200'
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
  const commentInputRef = useRef(null)

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
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
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    // Commentaires (avec avgRating mis à jour)
    fetch(`/api/comments/${id}`, {
      headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {},
    })
      .then((r) => r.ok ? r.json() : { comments: [], myComment: null })
      .then(({ comments: list, myComment: mine, avgRating: avg, ratingsCount: cnt }) => {
        setComments(list)
        setMyComment(mine)
        if (mine) setCommentText(mine.content)
        // Mise à jour de la moyenne depuis le endpoint commentaires (plus frais)
        if (avg !== undefined) { setAvgRating(avg); setRatingsCount(cnt ?? 0) }
      })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Données spécifiques à l'utilisateur connecté
  useEffect(() => {
    if (!user) { setIsFavorited(false); setCommentScore(null); return }
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((favs) => setIsFavorited(favs.some((r) => r.id === parseInt(id))))
    authFetch(`/api/ratings/${id}/me`)
      .then((r) => r.ok ? r.json() : { score: null })
      .then((data) => setCommentScore(data.score))
  }, [user, id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleFavorite = async () => {
    if (!user) return
    const res = await authFetch(`/api/favorites/${id}`, { method: 'POST' })
    if (!res.ok) { showToast('Erreur lors de la mise à jour des favoris', 'error'); return }
    const data = await res.json()
    setIsFavorited(data.favorited)
    showToast(data.favorited ? 'Ajouté aux favoris !' : 'Retiré des favoris', 'success')
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
      showToast(isEdit ? 'Commentaire modifié !' : 'Commentaire publié !', 'success')
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
      showToast('Commentaire supprimé', 'info')
      // Si l'utilisateur supprime son propre commentaire, réinitialiser le formulaire
      if (myComment?.id === commentId) {
        setMyComment(null)
        setCommentText('')
      }
    } else {
      showToast('Erreur lors de la suppression', 'error')
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-16">Chargement...</p>
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="text-5xl mb-4">🍹</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Recette introuvable</h2>
      <p className="text-gray-400 text-sm mb-6">{error}</p>
      <Link to="/" className="px-5 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-medium">
        ← Retour à la liste
      </Link>
    </div>
  )

  const isOwnRecipe = recipe.author?.id === user?.id

  return (
    <div className="max-w-2xl mx-auto">
      <ConfirmModal
        isOpen={!!deleteCommentId}
        title="Supprimer le commentaire"
        message="Supprimer ce commentaire ? Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={confirmDeleteComment}
        onCancel={() => setDeleteCommentId(null)}
      />
      <Link to="/" className="text-sm text-amber-600 hover:underline mb-6 inline-block">
        ← Toutes les recettes
      </Link>

      {/* En-tête */}
      <div className="mb-8">
        <img
          src={getImageUrl(recipe.imageUrl)}
          alt={recipe.name}
          className="w-full h-56 object-cover rounded-xl mb-6 bg-gray-100"
        />
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{recipe.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${difficultyColor[recipe.difficulty]}`}>
              {difficultyLabel[recipe.difficulty]}
            </span>
            {user && (
              <button
                onClick={handleToggleFavorite}
                className={`text-2xl leading-none transition-colors ${isFavorited ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                title={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                ♥
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
          <span>⏱ {recipe.prepTime} min</span>
          {recipe.category && <span>📂 {recipe.category.name}</span>}
          {recipe.author && (
            <Link
              to={`/users/${recipe.author.id}`}
              className="text-amber-600 hover:underline"
            >
              par {recipe.author.pseudo}
            </Link>
          )}
        </div>

        {/* Note moyenne */}
        <div className="flex items-center gap-3 mb-4">
          {avgRating !== null ? (
            <span className="text-sm text-gray-500">
              ★ <span className="font-medium text-gray-800">{avgRating}</span>/5
              <span className="text-gray-400 ml-1">({ratingsCount} note{ratingsCount > 1 ? 's' : ''})</span>
            </span>
          ) : (
            <span className="text-sm text-gray-400">Pas encore noté</span>
          )}
        </div>

        {recipe.description && (
          <p className="text-gray-600 leading-relaxed">{recipe.description}</p>
        )}

        {recipe.servings && (
          <div className="flex items-center gap-3 mt-4">
            <span className="text-sm text-gray-500">Pour</span>
            <PortionSelector value={portionCount} onChange={setPortionCount} />
            <span className="text-sm text-gray-500">
              {portionCount > 1 ? 'verres' : 'verre'}
            </span>
          </div>
        )}

        {recipe.status === 'PENDING' && (
          <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            En attente de validation par un administrateur
          </div>
        )}
      </div>

      {/* Ingrédients */}
      {recipe.ingredients?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Ingrédients</h2>
          <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {recipe.ingredients.map((ri) => {
              const baseServings = recipe.servings ?? 1
              const displayQty   = ri.quantity * (portionCount / baseServings)
              return (
                <li key={ri.id} className="flex justify-between items-center px-4 py-3 text-sm">
                  <span className="text-gray-800">{ri.ingredient.name}</span>
                  <span className="text-gray-500 font-medium">
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
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Préparation</h2>
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
                      alt={`Étape ${step.order}`}
                      className="w-full max-w-sm rounded-lg mb-2 border border-gray-100"
                    />
                  )}
                  <p className="text-gray-700 leading-relaxed">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Commentaires */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Commentaires {comments.length > 0 && <span className="text-gray-400 font-normal text-sm">({comments.length})</span>}
        </h2>

        {user && isOwnRecipe ? (
          <p className="text-sm text-gray-400 mb-6 px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
            Vous ne pouvez pas commenter votre propre recette.
          </p>
        ) : user ? (
          <form onSubmit={handleSubmitComment} className="mb-6 bg-gray-50 rounded-xl border border-gray-100 p-4">
            {myComment && (
              <p className="text-xs text-amber-600 font-medium mb-3">
                Mode édition — vous avez déjà commenté cette recette
              </p>
            )}
            {/* Note obligatoire */}
            <div className="mb-3">
              <span className="text-xs text-gray-500 font-medium mr-2">
                Votre note {!myComment && <span className="text-red-400">*</span>}
              </span>
              <RatingStars value={commentScore} onChange={setCommentScore} />
            </div>
            <textarea
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onBlur={() => setCommentTouched(true)}
              placeholder="Votre commentaire..."
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-1 bg-white ${
                commentTouched && !commentText.trim() ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {commentTouched && !commentText.trim() && (
              <p className="text-xs text-red-500 mb-1">Le commentaire ne peut pas être vide</p>
            )}
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim() || (!myComment && !commentScore)}
              className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors"
            >
              {submittingComment ? 'Envoi...' : myComment ? 'Modifier' : 'Commenter'}
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-400 mb-6">
            <Link to="/login" className="text-amber-600 hover:underline">Connectez-vous</Link> pour laisser un commentaire.
          </p>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun commentaire pour l'instant.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <Link to={`/users/${c.user.id}`} className="text-sm font-medium text-amber-600 hover:underline">
                    {c.user.pseudo}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    {user?.id === c.userId && (
                      <button
                        onClick={handleEditClick}
                        className="text-xs text-amber-400 hover:text-amber-600 transition-colors"
                      >
                        Modifier
                      </button>
                    )}
                    {(user?.id === c.userId || user?.role === 'ADMIN' || isOwnRecipe) && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700">{c.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
