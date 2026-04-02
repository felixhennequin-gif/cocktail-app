import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Panneau de filtres avancés : tags, note minimale, temps maximal.
 * Enveloppé dans React.memo pour éviter les re-renders inutiles.
 *
 * Props :
 *   tags              : array — liste des tags disponibles
 *   tagIds            : number[] — ids des tags sélectionnés
 *   minRating         : string — note minimale sélectionnée
 *   maxTimeInput      : string — valeur courante de l'input temps (non-debouncée)
 *   hasAdvancedFilters: boolean — true si au moins un filtre avancé est actif
 *   onToggleTag       : (tagId: number) => void
 *   onMinRatingChange : (value: number|null) => void
 *   onMaxTimeChange   : (e: Event) => void
 *   onReset           : () => void
 */
function FilterPanel({
  tags,
  tagIds,
  minRating,
  maxTimeInput,
  hasAdvancedFilters,
  onToggleTag,
  onMinRatingChange,
  onMaxTimeChange,
  onReset,
}) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-4 space-y-4">
      {/* Tags */}
      {tags.length > 0 && (
        <TagsFilter
          tags={tags}
          tagIds={tagIds}
          onToggleTag={onToggleTag}
        />
      )}

      {/* Note min + Temps max — côte à côte desktop, empilés mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Note minimale */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('recipes.minRatingLabel')}</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onMinRatingChange(n === 0 ? null : n)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                  (minRating ? parseInt(minRating) : 0) === n
                    ? 'bg-gold-400 text-ink-900'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500'
                }`}
              >
                {n === 0 ? '–' : `${n}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Temps max */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('recipes.maxTimeLabel')}</span>
          <input
            type="number"
            min="1"
            value={maxTimeInput}
            onChange={onMaxTimeChange}
            placeholder={t('recipes.maxTimeUnit')}
            className="w-20 px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('recipes.maxTimeUnit')}</span>
        </div>
      </div>

      {/* Réinitialiser */}
      {hasAdvancedFilters && (
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          {t('recipes.resetFilters')}
        </button>
      )}
    </div>
  )
}

/**
 * Sous-composant pour la liste de tags — mémoïsé séparément car souvent longue.
 */
const TagsFilter = memo(function TagsFilter({ tags, tagIds, onToggleTag }) {
  const { t } = useTranslation()
  const [showAllTags, setShowAllTags] = useState(false)

  const sorted = [...tags].sort((a, b) => (b.recipesCount || 0) - (a.recipesCount || 0))
  const visibleTags = showAllTags ? sorted : sorted.slice(0, 10)
  const hiddenCount = sorted.length - 10

  return (
    <div>
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('recipes.filterByTags')}</span>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {visibleTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              tagIds.includes(tag.id)
                ? 'bg-gold-400 text-ink-900'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gold-300 dark:hover:border-gold-500'
            }`}
          >
            {tag.name}
            {tag.recipesCount > 0 && <span className="ml-1 opacity-60">{tag.recipesCount}</span>}
          </button>
        ))}
        {!showAllTags && hiddenCount > 0 && (
          <button
            onClick={() => setShowAllTags(true)}
            className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gold-300 dark:hover:border-gold-500"
          >
            + {hiddenCount} {t('recipes.moreTags')}
          </button>
        )}
        {showAllTags && hiddenCount > 0 && (
          <button
            onClick={() => setShowAllTags(false)}
            className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gold-300 dark:hover:border-gold-500"
          >
            {t('recipes.lessTags')}
          </button>
        )}
      </div>
    </div>
  )
})


export default memo(FilterPanel)
