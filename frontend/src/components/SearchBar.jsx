import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getImageUrl } from '../utils/image'

export default function SearchBar() {
  const { t }                 = useTranslation()
  const [value, setValue]     = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef           = useRef(null)
  const containerRef          = useRef(null)
  const navigate              = useNavigate()

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setValue(val)
    clearTimeout(debounceRef.current)

    if (val.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recipes?q=${encodeURIComponent(val.trim())}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.data || [])
          setActiveIndex(-1)
          setOpen(true)
        }
      } catch {
        // Silencieux
      }
    }, 300)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex].id)
      } else if (value.trim().length >= 2) {
        setOpen(false)
        navigate(`/recipes?q=${encodeURIComponent(value.trim())}`)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const handleSelect = (id) => {
    setOpen(false)
    setValue('')
    navigate(`/recipes/${id}`)
  }

  const handleViewAll = () => {
    setOpen(false)
    navigate(`/recipes?q=${encodeURIComponent(value.trim())}`)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor="search-nav" className="sr-only">{t('recipes.searchNavPlaceholder')}</label>
      <input
        id="search-nav"
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t('recipes.searchNavPlaceholder')}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `search-option-${results[activeIndex]?.id}` : undefined}
        aria-controls="search-listbox"
        className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
      />

      {open && results.length > 0 && (
        <div
          role="listbox"
          id="search-listbox"
          aria-label={t('recipes.searchNavPlaceholder')}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          {results.map((r, index) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r.id)}
              role="option"
              id={`search-option-${r.id}`}
              aria-selected={index === activeIndex}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gold-50 dark:hover:bg-gold-900/20 text-left transition-colors ${index === activeIndex ? 'bg-gold-50 dark:bg-gold-900/20' : ''}`}
            >
              {r.imageUrl ? (
                <img
                  src={getImageUrl(r.imageUrl)}
                  alt=""
                  className="w-10 h-8 object-cover rounded bg-gray-100 dark:bg-gray-700 shrink-0"
                />
              ) : (
                <div className="w-10 h-8 rounded bg-gold-50 dark:bg-gold-900/20 shrink-0 flex items-center justify-center text-lg">
                  🍹
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {r.category?.name}
                  {r.avgRating ? ` · ★ ${r.avgRating}` : ''}
                </p>
              </div>
            </button>
          ))}
          <button
            onClick={handleViewAll}
            className="w-full px-3 py-2 text-xs text-gold-500 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-900/20 text-center border-t border-gray-100 dark:border-gray-700 font-medium transition-colors"
          >
            {t('recipes.viewAll')}
          </button>
        </div>
      )}
    </div>
  )
}
