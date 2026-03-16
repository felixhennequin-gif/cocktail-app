import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://192.168.1.85:3000'

const resolveImageUrl = (url) => {
  if (!url) return null
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`
  return url
}

export default function SearchBar() {
  const [value, setValue]     = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
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
          setOpen(true)
        }
      } catch {
        // Silencieux
      }
    }, 300)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim().length >= 2) {
      setOpen(false)
      navigate(`/?q=${encodeURIComponent(value.trim())}`)
    }
    if (e.key === 'Escape') setOpen(false)
  }

  const handleSelect = (id) => {
    setOpen(false)
    setValue('')
    navigate(`/recipes/${id}`)
  }

  const handleViewAll = () => {
    setOpen(false)
    navigate(`/?q=${encodeURIComponent(value.trim())}`)
  }

  return (
    <div ref={containerRef} className="relative w-56">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Rechercher..."
        className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
      />

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 text-left transition-colors"
            >
              {resolveImageUrl(r.imageUrl) ? (
                <img
                  src={resolveImageUrl(r.imageUrl)}
                  alt=""
                  className="w-10 h-8 object-cover rounded bg-gray-100 shrink-0"
                />
              ) : (
                <div className="w-10 h-8 rounded bg-amber-50 shrink-0 flex items-center justify-center text-lg">
                  🍹
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-400">
                  {r.category?.name}
                  {r.avgRating ? ` · ★ ${r.avgRating}` : ''}
                </p>
              </div>
            </button>
          ))}
          <button
            onClick={handleViewAll}
            className="w-full px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 text-center border-t border-gray-100 font-medium transition-colors"
          >
            Voir tous les résultats →
          </button>
        </div>
      )}
    </div>
  )
}
