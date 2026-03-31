import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DifficultyBadge from '../DifficultyBadge'
import PortionSelector from './PortionSelector'

export default function RecipeMeta({ recipe, avgRating, ratingsCount, isFavorited, onToggleFavorite, onAddToCollection, onLogTasting, onAddToShoppingList, isInShoppingCart, portionCount, onPortionChange, user }) {
  const { t } = useTranslation()
  const [showEmbed, setShowEmbed] = useState(false)
  const [embedCopied, setEmbedCopied] = useState(false)
  const embedCode = `<iframe src="${window.location.origin}/embed/recipes/${recipe.id}" width="400" height="600" frameborder="0" style="border-radius:12px;max-width:100%"></iframe>`

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <h1 className="text-2xl sm:text-3xl font-serif font-medium text-gray-900 dark:text-gray-100">{recipe.name}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <DifficultyBadge difficulty={recipe.difficulty} size="md" />
          {user && (
            <button
              onClick={onToggleFavorite}
              className={`text-2xl leading-none transition-colors ${isFavorited ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-400'}`}
              aria-label={isFavorited ? t('recipes.removeFavorite') : t('recipes.addFavorite')}
              title={isFavorited ? t('recipes.removeFavorite') : t('recipes.addFavorite')}
            >
              ♥
            </button>
          )}
          {user && (
            <button
              onClick={onAddToCollection}
              className="text-xl leading-none text-gray-300 dark:text-gray-600 hover:text-gold-400 transition-colors"
              title={t('collections.addRecipe')}
            >
              +
            </button>
          )}
          {user && onLogTasting && (
            <button
              onClick={onLogTasting}
              className="text-xs px-2.5 py-1 rounded-full border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium"
              title={t('tastings.logButton')}
            >
              {t('tastings.iMadeThis')}
            </button>
          )}
          {user && onAddToShoppingList && (
            <button
              onClick={onAddToShoppingList}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                isInShoppingCart
                  ? 'border-gold-400 dark:border-gold-600 text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-900/20'
                  : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gold-400 hover:text-gold-500'
              }`}
              title={t('shoppingList.addToList')}
            >
              {isInShoppingCart ? t('shoppingList.inCart') : t('shoppingList.addToList')}
            </button>
          )}
          <a
            href={`/api/recipes/${recipe.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl leading-none text-gray-300 dark:text-gray-600 hover:text-gold-400 transition-colors"
            title={t('recipes.exportPdf')}
            aria-label={t('recipes.exportPdf')}
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </a>
          <button
            onClick={() => setShowEmbed(true)}
            className="text-xl leading-none text-gray-300 dark:text-gray-600 hover:text-gold-400 transition-colors"
            title={t('embed.title')}
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          {user && (recipe.author?.id === user?.id || user?.role === 'ADMIN') && (
            <Link
              to={`/recipes/${recipe.id}/edit`}
              className="text-xl leading-none text-gray-300 dark:text-gray-600 hover:text-gold-400 transition-colors"
              title={t('common.edit')}
            >
              ✎
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
        <span>⏱ {recipe.prepTime} min</span>
        {recipe.estimatedCost != null && (
          <span title={t('cost.perGlass', { cost: recipe.estimatedCost.toFixed(2) })}>
            💰 ~{recipe.estimatedCost.toFixed(2)} €
          </span>
        )}
        {recipe.category && <span>📂 {recipe.category.name}</span>}
        {recipe.author && (
          <Link to={`/users/${recipe.author.id}`} className="text-gold-500 dark:text-gold-400 hover:underline">
            {t('common.by')} {recipe.author.pseudo}
          </Link>
        )}
      </div>
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
      {recipe.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {recipe.tags.map((tag) => (
            <Link key={tag.id} to={`/recipes?tags=${tag.id}`} className="text-xs px-2.5 py-1 rounded-full bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400 border border-gold-200 dark:border-gold-700 hover:bg-gold-100 dark:hover:bg-gold-900/40 transition-colors">
              {tag.name}
            </Link>
          ))}
        </div>
      )}
      {recipe.servings && (
        <div className="flex items-center gap-3 mt-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('recipes.for')}</span>
          <PortionSelector value={portionCount} onChange={onPortionChange} />
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('recipes.glasses', { count: portionCount })}</span>
        </div>
      )}
      {recipe.status === 'PENDING' && (
        <div className="mt-3 px-3 py-2 bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-700 rounded-lg text-sm text-gold-700 dark:text-gold-400">
          {t('recipes.pending')}
        </div>
      )}
      {/* Modale embed */}
      {showEmbed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEmbed(false)}>
          <div className="bg-white dark:bg-ink-900 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('embed.title')}</h3>
              <button onClick={() => setShowEmbed(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <textarea
              readOnly
              value={embedCode}
              className="w-full h-20 p-3 text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none"
            />
            <button
              onClick={() => { navigator.clipboard.writeText(embedCode); setEmbedCopied(true); setTimeout(() => setEmbedCopied(false), 2000); }}
              className="mt-3 px-4 py-2 bg-gold-400 text-ink-900 rounded-lg text-sm font-medium hover:bg-gold-300 transition-colors"
            >
              {embedCopied ? t('embed.copied') : t('embed.copy')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
