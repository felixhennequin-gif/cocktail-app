import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { getImageUrl } from '../../utils/image'

const EMPTY_INGREDIENT = { name: '', quantity: '', unit: '' }
const EMPTY_STEP       = { description: '', imageUrl: '', preview: '' }

const defaultForm = {
  name: '',
  description: '',
  categoryId: '',
  difficulty: 'EASY',
  prepTime: '',
  servings: '',
  imageUrl: '',
  status: 'PUBLISHED',
}

export default function AdminRecipeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, authFetch } = useAuth()
  const { showToast }       = useToast()
  const { t }               = useTranslation()
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
  // Ensemble des indices d'étapes en cours d'upload
  const [uploadingSteps, setUploadingSteps] = useState(new Set())

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
          servings:    recipe.servings ? String(recipe.servings) : '',
          imageUrl:    recipe.imageUrl || '',
          status:      recipe.status ?? 'PUBLISHED',
        })
        if (recipe.imageUrl) {
          setPreview(getImageUrl(recipe.imageUrl))
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
            ? recipe.steps.map((s) => ({
                description: s.description,
                imageUrl:    s.imageUrl || '',
                preview:     getImageUrl(s.imageUrl),
              }))
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
      setPreview(getImageUrl(data.url))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Upload image d'une étape spécifique
  const handleStepImageFile = async (index, e) => {
    const file = e.target.files[0]
    if (!file) return
    // recipeId connu en édition, "tmp" pour les nouvelles recettes
    const recipeIdParam = isEdit ? id : 'tmp'
    setUploadingSteps((prev) => new Set(prev).add(index))
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await authFetch(`/api/upload/step/${recipeIdParam}`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Erreur upload image étape')
      const data = await res.json()
      setSteps((list) => list.map((s, i) =>
        i === index ? { ...s, imageUrl: data.url, preview: getImageUrl(data.url) } : s
      ))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingSteps((prev) => { const next = new Set(prev); next.delete(index); return next })
    }
  }

  const updateIngredient = (index, field, value) => {
    setIngredients((list) => list.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
  }
  const addIngredient    = () => setIngredients((l) => [...l, { ...EMPTY_INGREDIENT }])
  const removeIngredient = (index) => setIngredients((l) => l.filter((_, i) => i !== index))

  const updateStep = (index, field, value) => {
    setSteps((list) => list.map((s, i) => i === index ? { ...s, [field]: value } : s))
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
      servings:   form.servings ? parseInt(form.servings) : null,
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({ name: i.name.trim(), quantity: parseFloat(i.quantity), unit: i.unit })),
      steps: steps
        .filter((s) => s.description.trim())
        .map((s, idx) => ({
          order:       idx + 1,
          description: s.description.trim(),
          ...(s.imageUrl ? { imageUrl: s.imageUrl } : {}),
        })),
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
      showToast(isEdit ? t('admin.editTitle') + ' !' : t('admin.newTitle') + ' !', 'success')
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-center text-gray-400 dark:text-gray-500 py-16">{t('admin.loading')}</p>

  const inputClass = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-400'

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEdit ? t('admin.editTitle') : t('admin.newTitle')}
        </h1>
        <Link to="/admin" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          {t('submit.back')}
        </Link>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Infos principales */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">{t('submit.sections.info')}</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('submit.fields.name')}</label>
            <input
              name="name" value={form.name} onChange={handleField} required
              className={inputClass}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('submit.fields.description')}</label>
            <textarea
              name="description" value={form.description} onChange={handleField} rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('submit.fields.category')}</label>
              <select
                name="categoryId" value={form.categoryId} onChange={handleField} required
                className={inputClass}
              >
                <option value="">{t('submit.fields.categoryPlaceholder')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('submit.fields.difficulty')}</label>
              <select
                name="difficulty" value={form.difficulty} onChange={handleField} required
                className={inputClass}
              >
                <option value="EASY">{t('recipes.difficulty.EASY')}</option>
                <option value="MEDIUM">{t('recipes.difficulty.MEDIUM')}</option>
                <option value="HARD">{t('recipes.difficulty.HARD')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('submit.fields.prepTime')}</label>
              <input
                name="prepTime" type="number" min="1" value={form.prepTime} onChange={handleField} required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verres / portions</label>
              <input
                name="servings" type="number" min="1" value={form.servings} onChange={handleField}
                placeholder="ex : 2"
                className={inputClass}
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('submit.fields.image')}</label>
            <input
              name="imageUrl" value={form.imageUrl} onChange={handleField}
              placeholder={t('submit.fields.imageUrlPlaceholder')}
              className={`${inputClass} mb-2`}
            />
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gold-500 dark:text-gold-400 hover:text-gold-600 dark:hover:text-gold-300 font-medium">
              <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
              {uploading ? t('submit.fields.uploading') : t('submit.fields.chooseImage')}
            </label>
            {preview && (
              <img
                src={preview}
                alt="Aperçu"
                className="mt-3 w-40 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
              />
            )}
          </div>
        </section>

        {/* Ingrédients */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('submit.sections.ingredients')}</h2>

          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder={t('submit.fields.ingredientName')} value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  className={`flex-1 ${inputClass}`}
                />
                <input
                  placeholder={t('submit.fields.ingredientQty')} type="number" step="0.1" min="0" value={ing.quantity}
                  onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                  className={`w-20 ${inputClass}`}
                />
                <input
                  placeholder={t('submit.fields.ingredientUnit')} value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                  className={`w-20 ${inputClass}`}
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
            className="mt-3 text-sm text-gold-500 dark:text-gold-400 hover:text-gold-600 dark:hover:text-gold-300 font-medium"
          >
            {t('submit.fields.addIngredient')}
          </button>
        </section>

        {/* Étapes */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('submit.sections.steps')}</h2>

          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="shrink-0 w-6 h-6 mt-2 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <textarea
                    placeholder={`Étape ${i + 1}`} value={step.description} rows={2}
                    onChange={(e) => updateStep(i, 'description', e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                  {/* Image de l'étape */}
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-400 dark:text-gray-500 hover:text-gold-400 dark:hover:text-gold-300 font-medium transition-colors">
                      <input
                        type="file" accept="image/*"
                        onChange={(e) => handleStepImageFile(i, e)}
                        className="hidden"
                      />
                      {uploadingSteps.has(i) ? t('admin.stepUploading') : t('admin.stepImage')}
                    </label>
                    {step.imageUrl && (
                      <>
                        <img
                          src={step.preview || getImageUrl(step.imageUrl)}
                          alt={`Étape ${i + 1}`}
                          className="w-16 h-12 object-cover rounded border border-gray-200 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => updateStep(i, 'imageUrl', '') || updateStep(i, 'preview', '')}
                          className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
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
            className="mt-3 text-sm text-gold-500 dark:text-gold-400 hover:text-gold-600 dark:hover:text-gold-300 font-medium"
          >
            {t('submit.fields.addStep')}
          </button>
        </section>

        {/* Statut de publication */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('admin.publication')}</h2>
          <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.status === 'PUBLISHED'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.checked ? 'PUBLISHED' : 'DRAFT' }))
                }
              />
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  form.status === 'PUBLISHED' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.status === 'PUBLISHED' ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {form.status === 'PUBLISHED' ? t('admin.publishNow') : t('admin.saveDraft')}
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {form.status === 'PUBLISHED'
                  ? t('admin.publishNowHint')
                  : t('admin.saveDraftHint')}
              </p>
            </div>
          </label>
        </section>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit" disabled={saving || uploading || uploadingSteps.size > 0}
            className="px-6 py-2.5 bg-gold-400 text-ink-900 text-sm font-medium rounded-lg hover:bg-gold-500 disabled:opacity-60 transition-colors"
          >
            {saving ? t('admin.saving') : t('admin.saveButton')}
          </button>
          <Link
            to="/admin"
            className="px-6 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
          >
            {t('submit.cancel')}
          </Link>
        </div>

      </form>
    </div>
  )
}
