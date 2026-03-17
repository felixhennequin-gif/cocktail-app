import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getImageUrl } from '../utils/image'

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

export default function RecipeSubmit() {
  const { user, authFetch } = useAuth()
  const { showToast }       = useToast()
  const navigate = useNavigate()

  const [form, setForm]             = useState(defaultForm)
  const [ingredients, setIngredients] = useState([{ ...EMPTY_INGREDIENT }])
  const [steps, setSteps]           = useState([{ ...EMPTY_STEP }])
  const [categories, setCategories] = useState([])
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState(null)
  const [preview, setPreview]       = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!user) { navigate('/login', { state: { from: '/recipes/new' } }); return }
    fetch('/api/categories').then((r) => r.json()).then(setCategories)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

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
      setPreview(getImageUrl(data.url))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const updateIngredient = (index, field, value) =>
    setIngredients((list) => list.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
  const addIngredient    = () => setIngredients((l) => [...l, { ...EMPTY_INGREDIENT }])
  const removeIngredient = (index) => setIngredients((l) => l.filter((_, i) => i !== index))

  const updateStep = (index, value) =>
    setSteps((list) => list.map((s, i) => i === index ? { description: value } : s))
  const addStep    = () => setSteps((l) => [...l, { ...EMPTY_STEP }])
  const removeStep = (index) => setSteps((l) => l.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validation frontend
    const fe = {}
    if (!form.name.trim())          fe.name = 'Le titre est requis'
    if (!form.categoryId)           fe.categoryId = 'La catégorie est requise'
    if (!form.prepTime)             fe.prepTime = 'Le temps de préparation est requis'
    const validIngredients = ingredients.filter((i) => i.name.trim())
    if (validIngredients.length === 0) fe.ingredients = 'Au moins un ingrédient est requis'
    const validSteps = steps.filter((s) => s.description.trim())
    if (validSteps.length === 0)    fe.steps = 'Au moins une étape est requise'
    setFieldErrors(fe)
    if (Object.keys(fe).length > 0) return
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

    try {
      const res = await authFetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la soumission')
      }
      showToast(isAdmin ? 'Recette publiée !' : 'Recette soumise ! Elle sera publiée après validation.', 'success')
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const isAdmin = user?.role === 'ADMIN'

  const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400'

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Proposer une recette</h1>
          {!isAdmin && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Votre recette sera soumise pour validation avant publication.</p>
          )}
        </div>
        <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">← Retour</Link>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Informations</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
            <input
              name="name" value={form.name} onChange={handleField}
              className={`${inputClass} ${fieldErrors.name ? 'border-red-400' : ''}`}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              name="description" value={form.description} onChange={handleField} rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie *</label>
              <select
                name="categoryId" value={form.categoryId} onChange={handleField} required
                className={inputClass}
              >
                <option value="">--</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulté *</label>
              <select
                name="difficulty" value={form.difficulty} onChange={handleField} required
                className={inputClass}
              >
                <option value="EASY">Facile</option>
                <option value="MEDIUM">Moyen</option>
                <option value="HARD">Difficile</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temps (min) *</label>
              <input
                name="prepTime" type="number" min="1" value={form.prepTime} onChange={handleField} required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image</label>
            <input
              name="imageUrl" value={form.imageUrl} onChange={handleField}
              placeholder="https://... ou laisser vide pour uploader"
              className={`${inputClass} mb-2`}
            />
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium">
              <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
              {uploading ? 'Upload en cours...' : '📁 Choisir un fichier image'}
            </label>
            {preview && (
              <img src={preview} alt="Aperçu" className="mt-3 w-40 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Ingrédients</h2>
          {fieldErrors.ingredients && <p className="mb-2 text-xs text-red-500">{fieldErrors.ingredients}</p>}
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="Nom" value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  className={`flex-1 ${inputClass}`}
                />
                <input
                  placeholder="Qté" type="number" step="0.1" min="0" value={ing.quantity}
                  onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                  className={`w-20 ${inputClass}`}
                />
                <input
                  placeholder="Unité" value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                  className={`w-20 ${inputClass}`}
                />
                <button
                  type="button" onClick={() => removeIngredient(i)}
                  disabled={ingredients.length === 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 px-1"
                >✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addIngredient} className="mt-3 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium">
            + Ajouter un ingrédient
          </button>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Étapes</h2>
          {fieldErrors.steps && <p className="mb-2 text-xs text-red-500">{fieldErrors.steps}</p>}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="shrink-0 w-6 h-6 mt-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <textarea
                  placeholder={`Étape ${i + 1}`} value={step.description} rows={2}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className={`flex-1 ${inputClass} resize-none`}
                />
                <button
                  type="button" onClick={() => removeStep(i)}
                  disabled={steps.length === 1}
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30 mt-2 px-1"
                >✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addStep} className="mt-3 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium">
            + Ajouter une étape
          </button>
        </section>

        <div className="flex gap-3">
          <button
            type="submit" disabled={saving || uploading}
            className="px-6 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors"
          >
            {saving ? 'Envoi...' : isAdmin ? 'Publier' : 'Soumettre pour validation'}
          </button>
          <Link
            to="/"
            className="px-6 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
