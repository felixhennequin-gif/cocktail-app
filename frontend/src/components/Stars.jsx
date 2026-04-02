import { useTranslation } from 'react-i18next'

export default function Stars({ value, count }) {
  const { t } = useTranslation()
  if (value == null) return null
  const full = Math.round(value)
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full)
  return (
    <span
      role="img"
      aria-label={t('common.starsRating', { rating: value, max: 5 })}
      className="text-amber-400 text-xs whitespace-nowrap shrink-0"
      title={`${t('recipes.avgRating', { value })} ${t('recipes.ratingsCount', { count })}`}
    >
      {stars} <span className="text-gray-400 dark:text-gray-500">{value}</span>
    </span>
  )
}
