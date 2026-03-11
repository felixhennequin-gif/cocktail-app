import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const difficultyLabel = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' }

export default function AdminRecipeList() {
  const { user, authFetch } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const navigate = useNavigate()

  const fetchRecipes = () => {
    setLoading(true)
    authFetch('/api/recipes?limit=100')
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
    fetchRecipes()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer la recette "${name}" ? Cette action est irréversible.`)) return
    const res = await authFetch(`/api/recipes/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      fetchRecipes()
    } else {
      alert('Erreur lors de la suppression.')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin — Recettes</h1>
          <Link to="/admin/pending" className="text-sm text-amber-600 hover:underline font-medium">
            Voir les recettes en attente
          </Link>
        </div>
        <Link
          to="/admin/recipes/new"
          className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
        >
          + Nouvelle recette
        </Link>
      </div>

      {loading && <p className="text-gray-400 py-8 text-center">Chargement...</p>}
      {error   && <p className="text-red-500 py-8 text-center">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-2/5">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Catégorie</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Difficulté</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Créée le</th>
                <th className="border-l-2 border-gray-300 px-4 py-3 font-semibold text-gray-600 text-center">Modifier</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Supprimer</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-8">Aucune recette.</td>
                </tr>
              )}
              {recipes.map((recipe, i) => (
                <tr
                  key={recipe.id}
                  className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{recipe.name}</td>
                  <td className="px-4 py-3 text-gray-500">{recipe.category?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{difficultyLabel[recipe.difficulty]}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(recipe.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="border-l-2 border-gray-300 px-4 py-3 text-center">
                    <button
                      onClick={() => navigate(`/admin/recipes/${recipe.id}/edit`)}
                      className="inline-flex items-center gap-1.5 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer transition-all duration-150 px-3 py-1"
                    >
                      ✏️ Modifier
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(recipe.id, recipe.name)}
                      className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-700 hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer transition-all duration-150 px-3 py-1"
                    >
                      🗑 Supprimer
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
