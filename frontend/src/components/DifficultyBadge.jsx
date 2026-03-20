import { useTranslation } from 'react-i18next'

const config = {
  EASY: {
    classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dots: 1,
    dotColor: 'bg-green-500 dark:bg-green-400',
  },
  MEDIUM: {
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dots: 2,
    dotColor: 'bg-amber-500 dark:bg-amber-400',
  },
  HARD: {
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dots: 3,
    dotColor: 'bg-red-500 dark:bg-red-400',
  },
}

export default function DifficultyBadge({ difficulty, size = 'sm' }) {
  const { t } = useTranslation()
  const { classes, dots, dotColor } = config[difficulty] || config.EASY

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-1'
    : 'text-sm px-3 py-1'

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeClasses} ${classes}`}>
      <span className="flex gap-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i < dots ? dotColor : 'bg-gray-300/50 dark:bg-gray-600/50'}`}
          />
        ))}
      </span>
      {t(`recipes.difficulty.${difficulty}`)}
    </span>
  )
}
