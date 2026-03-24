export default function PortionSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-bold flex items-center justify-center hover:border-gold-400 hover:text-gold-500 transition-colors"
      >
        −
      </button>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value)
          if (v >= 1) onChange(v)
        }}
        className="w-12 text-center border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gold-400"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-bold flex items-center justify-center hover:border-gold-400 hover:text-gold-500 transition-colors"
      >
        +
      </button>
    </div>
  )
}
