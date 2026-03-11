import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PLACEHOLDER = 'https://placehold.co/400x300?text=Cocktail'
const API_BASE    = 'http://192.168.1.85:3000'

const resolveImageUrl = (url) => {
  if (!url) return PLACEHOLDER
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`
  return url
}

const difficultyLabel = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' }
const difficultyColor = {
  EASY:   'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HARD:   'bg-red-100 text-red-700',
}

// Étoiles interactives pour noter
function RatingStars({ userScore, onRate }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? userScore ?? 0

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onRate(n)}
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
  const { id }            = useParams()
  const { user, authFetch } = useAuth()

  const [recipe, setRecipe]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [avgRating, setAvgRating] = useState(null)
  const [ratingsCount, setRatingsCount] = useState(0)
  const [userScore, setUserScore] = useState(null)
  const [comments, setComments]   = useState([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error('Recette introuvable')
        if (!res.ok) throw new Error('Erreur lors du chargement')
        return res.json()
      })
      .then((data) => {
        setRecipe(data)
        setAvgRating(data.avgRating)
        setRatingsCount(data.ratingsCount)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    // Commentaires
    fetch(`/api/comments/${id}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setComments)
  }, [id])

  // Données spécifiques à l'utilisateur connecté
  useEffect(() => {
    if (!user) { setIsFavorited(false); setUserScore(null); return }
    authFetch('/api/favorites')
      .then((r) => r.ok ? r.json() : [])
      .then((favs) => setIsFavorited(favs.some((r) => r.id === parseInt(id))))
    authFetch(`/api/ratings/${id}/me`)
      .then((r) => r.ok ? r.json() : { score: null })
      .then((data) => setUserScore(data.score))
  }, [user, id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleFavorite = async () => {
    if (!user) return
    const res = await authFetch(`/api/favorites/${id}`, { method: 'POST' })
    if (!res.ok) return
    const data = await res.json()
    setIsFavorited(data.favorited)
  }

  const handleRate = async (score) => {
    if (!user) return
    const res = await authFetch(`/api/ratings/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    })
    if (!res.ok) return
    const data = await res.json()
    setAvgRating(data.avgRating)
    setRatingsCount(data.ratingsCount)
    setUserScore(data.userScore)
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
    const res = await authFetch(`/api/comments/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText }),
    })
    if (res.ok) {
      const comment = await res.json()
      setComments((prev) => [comment, ...prev])
      setCommentText('')
    }
    setSubmittingComment(false)
  }

  const handleDeleteComment = async (commentId) => {
    const res = await authFetch(`/api/comments/${commentId}`, { method: 'DELETE' })
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  if (loading) return <p className="text-center text-gray-400 py-16">Chargement...</p>
  if (error) return (
    <div className="text-center py-16">
      <p className="text-red-500 mb-4">{error}</p>
      <Link to="/" className="text-amber-600 hover:underline">← Retour à la liste</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="text-sm text-amber-600 hover:underline mb-6 inline-block">
        ← Toutes les recettes
      </Link>

      {/* En-tête */}
      <div className="mb-8">
        <img
          src={resolveImageUrl(recipe.imageUrl)}
          alt={recipe.name}
          className="w-full h-56 object-cover rounded-xl mb-6 bg-gray-100"
        />
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-3xl font-bold text-gray-900">{recipe.name}</h1>
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

        {/* Note moyenne + note de l'user */}
        <div className="flex items-center gap-4 mb-4">
          {avgRating !== null ? (
            <span className="text-sm text-gray-500">
              ★ <span className="font-medium text-gray-800">{avgRating}</span>/5
              <span className="text-gray-400 ml-1">({ratingsCount} note{ratingsCount > 1 ? 's' : ''})</span>
            </span>
          ) : (
            <span className="text-sm text-gray-400">Pas encore noté</span>
          )}
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Votre note :</span>
              <RatingStars userScore={userScore} onRate={handleRate} />
            </div>
          )}
        </div>

        {recipe.description && (
          <p className="text-gray-600 leading-relaxed">{recipe.description}</p>
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
            {recipe.ingredients.map((ri) => (
              <li key={ri.id} className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-gray-800">{ri.ingredient.name}</span>
                <span className="text-gray-500 font-medium">{ri.quantity} {ri.unit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Étapes */}
      {recipe.steps?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Préparation</h2>
          <ol className="space-y-3">
            {recipe.steps.map((step) => (
              <li key={step.id} className="flex gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">
                  {step.order}
                </span>
                <p className="text-gray-700 leading-relaxed pt-0.5">{step.description}</p>
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

        {user ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Votre commentaire..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-2"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors"
            >
              {submittingComment ? 'Envoi...' : 'Commenter'}
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
                    {(user?.id === c.userId || user?.role === 'ADMIN') && (
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
