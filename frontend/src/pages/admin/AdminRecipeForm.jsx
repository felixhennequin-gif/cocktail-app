import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const EMPTY_INGREDIENT = { name: '', quantity: '', unit: '' }
const EMPTY_STEP       = { description: '' }

const defaultForm = {
  name: '',
  description: '',
  categoryId: '',
  difficulty: 'EASY',
  prepTime: '',
  imageUrl: '',
}

export default function AdminRecipeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()
  const isEdit = Boolean(id)

  const [form, setForm]               = useState(defaultForm)
  const [ingredients, setIngredients] = useState([{ ...EMPTY_INGREDIENT }])
  const [steps, setSteps]             = useState([{ ...EMPTY_STEP }])
  const [categories, setCategories]   = useState([])
  const [loading, setLoading]         = useState(isEdit)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [preview, setPreview]         = useState(null)

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') { navigate('/'); return }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chargement des catégories
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then(setCategories)
  }, [])

  // Chargement de la recette en mode édition
  useEffect(() => {
    if (!isEdit) return
    authFetch(`/api/recipes/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Recette introuvable')
        return res.json()
      })
      .then((recipe) => {
        setForm({
          name:        recipe.name,
          description: recipe.description || '',
          categoryId:  String(recipe.categoryId),
          difficulty:  recipe.difficulty,
          prepTime:    String(recipe.prepTime),
          imageUrl:    recipe.imageUrl || '',
        })
        if (recipe.imageUrl) {
          setPreview(
            recipe.imageUrl.startsWith('/uploads/')
              ? `http://192.168.1.85:3000${recipe.imageUrl}`
              : recipe.imageUrl
          )
        }
        setIngredients(
          recipe.ingredients.length > 0
            ? recipe.ingredients.map((ri) => ({
                name:     ri.ingredient.name,
                quantity: String(ri.quantity),
                unit:     ri.unit,
              }))
            : [{ ...EMPTY_INGREDIENT }]
        )
        setSteps(
          recipe.steps.length > 0
            ? recipe.steps.map((s) => ({ description: s.description }))
            : [{ ...EMPTY_STEP }]
        )
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, isEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleField = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleImageFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await authFetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Erreur upload')
      const data = await res.json()
      setForm((f) => ({ ...f, imageUrl: data.url }))
      setPreview(`http://192.168.1.85:3000${data.url}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const updateIngredient = (index, field, value) => {
    setIngredients((list) => list.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
  }
  const addIngredient    = () => setIngredients((l) => [...l, { ...EMPTY_INGREDIENT }])
  const removeIngredient = (index) => setIngredients((l) => l.filter((_, i) => i !== index))

  const updateStep = (index, value) => {
    setSteps((list) => list.map((s, i) => i === index ? { description: value } : s))
  }
  const addStep    = () => setSteps((l) => [...l, { ...EMPTY_STEP }])
  const removeStep = (index) => setSteps((l) => l.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const body = {
      ...form,
      categoryId: parseInt(form.categoryId),
      prepTime:   parseInt(form.prepTime),
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name.trim(), quantity: parseFloat(i.quantity), unit: i.unit })),
      steps: steps
        .filter((s) => s.description.trim())
        .map((s, idx) => ({ order: idx + 1, description: s.description.trim() })),
    }

    const url    = isEdit ? `/api/recipes/${id}` : '/api/recipes'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-16">Chargement...</p>

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Modifier la recette' : 'Nouvelle recette'}
        </h1>
        <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-800">
          ← Retour
        </Link>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Infos principales */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Informations</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              name="name" value={form.name} onChange={handleField} required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description" value={form.description} onChange={handleField} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select
                name="categoryId" value={form.categoryId} onChange={handleField} required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="">--</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulté *</label>
              <select
                name="difficulty" value={form.difficulty} onChange={handleField} required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="EASY">Facile</option>
                <option value="MEDIUM">Moyen</option>
                <option value="HARD">Difficile</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temps (min) *</label>
              <input
                name="prepTime" type="number" min="1" value={form.prepTime} onChange={handleField} required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <input
              name="imageUrl" value={form.imageUrl} onChange={handleField}
              placeholder="https://... ou laisser vide pour uploader"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2"
            />
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-amber-600 hover:text-amber-800 font-medium">
              <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
              {uploading ? 'Upload en cours...' : '📁 Choisir un fichier image'}
            </label>
            {preview && (
              <img
                src={preview}
                alt="Aperçu"
                className="mt-3 w-40 h-28 object-cover rounded-lg border border-gray-200"
              />
            )}
          </div>
        </section>

        {/* Ingrédients */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Ingrédients</h2>

          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="Nom" value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  placeholder="Qté" type="number" step="0.1" min="0" value={ing.quantity}
                  onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <input
                  placeholder="Unité" value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button" onClick={() => removeIngredient(i)}
                  disabled={ingredients.length === 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button" onClick={addIngredient}
            className="mt-3 text-sm text-amber-600 hover:text-amber-800 font-medium"
          >
            + Ajouter un ingrédient
          </button>
        </section>

        {/* Étapes */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Étapes</h2>

          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="shrink-0 w-6 h-6 mt-2 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <textarea
                  placeholder={`Étape ${i + 1}`} value={step.description} rows={2}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
                <button
                  type="button" onClick={() => removeStep(i)}
                  disabled={steps.length === 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 mt-2 px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button" onClick={addStep}
            className="mt-3 text-sm text-amber-600 hover:text-amber-800 font-medium"
          >
            + Ajouter une étape
          </button>
        </section>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit" disabled={saving || uploading}
            className="px-6 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <Link
            to="/admin"
            className="px-6 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:border-gray-300 transition-colors"
          >
            Annuler
          </Link>
        </div>

      </form>
    </div>
  )
}
