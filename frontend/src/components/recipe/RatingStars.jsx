import { useState } from 'react'

export default function RatingStars({ value, onChange }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value ?? 0

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          aria-label={`${n} / 5`}
          className={`text-2xl leading-none transition-colors ${
            n <= display ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600'
          } hover:text-amber-400`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
