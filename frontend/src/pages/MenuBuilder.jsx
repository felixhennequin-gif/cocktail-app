import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

const TEMPLATES = ['elegant', 'tropical', 'minimal']

export default function MenuBuilder() {
  const { t } = useTranslation()
  const { authFetch } = useAuth()
  const [title, setTitle] = useState('')
  const [template, setTemplate] = useState('elegant')
  const [showIngredients, setShowIngredients] = useState(true)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selectedRecipes, setSelectedRecipes] = useState([])
  const [generating, setGenerating] = useState(false)

  // Recherche de recettes
  useEffect(() => {
    if (search.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/recipes?q=${encodeURIComponent(search)}&limit=10`)
        const json = await res.json()
        setResults(json.data || [])
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, authFetch])

  const addRecipe = (recipe) => {
    if (selectedRecipes.length >= 12) return
    if (selectedRecipes.find((r) => r.id === recipe.id)) return
    setSelectedRecipes((prev) => [...prev, recipe])
    setSearch('')
    setResults([])
  }

  const removeRecipe = (id) => {
    setSelectedRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  const generatePdf = async () => {
    if (!title.trim() || selectedRecipes.length === 0) return
    setGenerating(true)
    try {
      const res = await authFetch('/api/menus/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          recipeIds: selectedRecipes.map((r) => r.id),
          template,
          showIngredients,
        }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'menu-cocktails.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // erreur silencieuse
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Helmet><title>{t('menu.title')} — Écume</title></Helmet>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('menu.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('menu.subtitle')}</p>
      </div>

      {/* Titre du menu */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('menu.menuTitle')}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Soirée cocktails..."
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-gold-400 focus:border-transparent"
          maxLength={100}
        />
      </div>

      {/* Template */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('menu.template')}</label>
        <div className="flex gap-3">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl}
              onClick={() => setTemplate(tmpl)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                template === tmpl
                  ? 'bg-gold-400 text-ink-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t(`menu.${tmpl}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Show ingredients toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showIngredients}
            onChange={(e) => setShowIngredients(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-gold-400 focus:ring-gold-400"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{t('menu.showIngredients')}</span>
        </label>
      </div>

      {/* Recherche recettes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('menu.selectRecipes')}</label>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => addRecipe(r)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center gap-3"
                >
                  {r.imageUrl && <img src={r.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                  <span>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recettes sélectionnées */}
      {selectedRecipes.length > 0 && (
        <div className="mb-8 space-y-2">
          {selectedRecipes.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3 bg-white dark:bg-ink-900 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
              <span className="text-gray-400 text-sm font-medium w-6">{i + 1}.</span>
              {r.imageUrl && <img src={r.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
              <span className="flex-1 text-gray-900 dark:text-white font-medium text-sm">{r.name}</span>
              <button onClick={() => removeRecipe(r.id)} className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Bouton générer */}
      <button
        onClick={generatePdf}
        disabled={!title.trim() || selectedRecipes.length === 0 || generating}
        className="w-full py-3 bg-gold-400 text-ink-900 rounded-xl font-semibold hover:bg-gold-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? t('menu.generating') : t('menu.generate')}
      </button>
    </div>
  )
}
