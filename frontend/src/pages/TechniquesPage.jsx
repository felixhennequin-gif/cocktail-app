import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

/**
 * Extrait l'ID de vidéo YouTube depuis une URL standard ou courte.
 * Retourne null si l'URL n'est pas une URL YouTube reconnue.
 */
const getYouTubeId = (url) => {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch {
    // URL invalide
  }
  return null
}

function TechniqueCard({ technique }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const youtubeId = getYouTubeId(technique.videoUrl)

  return (
    <article className="bg-white dark:bg-ink-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3 transition-colors">
      {/* En-tête */}
      <div className="flex items-start gap-3">
        {technique.iconUrl && (
          <img
            src={technique.iconUrl}
            alt=""
            aria-hidden="true"
            className="w-10 h-10 object-contain shrink-0"
          />
        )}
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-snug">
          {technique.name}
        </h2>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {technique.description}
      </p>

      {/* Vidéo YouTube intégrée */}
      {youtubeId && (
        <div>
          {expanded ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                title={technique.name}
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                loading="lazy"
              />
            </div>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="text-sm text-gold-500 dark:text-gold-400 hover:underline focus:outline-none focus:underline"
            >
              {t('techniques.watchVideo')} →
            </button>
          )}
        </div>
      )}

      {/* Lien vidéo non-YouTube */}
      {technique.videoUrl && !youtubeId && (
        <a
          href={technique.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gold-500 dark:text-gold-400 hover:underline"
        >
          {t('techniques.watchVideo')} →
        </a>
      )}
    </article>
  )
}

export default function TechniquesPage() {
  const { t } = useTranslation()
  const [techniques, setTechniques] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchTechniques = async () => {
      try {
        const res = await fetch('/api/techniques')
        if (!res.ok) throw new Error('Erreur réseau')
        const data = await res.json()
        setTechniques(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTechniques()
  }, [])

  // Filtrage local par le champ de recherche
  const filtered = techniques.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Helmet>
        <title>{t('techniques.title')} — Écume</title>
        <meta name="description" content={t('techniques.subtitle')} />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        {/* En-tête de page */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('techniques.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('techniques.subtitle')}
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('techniques.searchPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-ink-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm transition-colors"
            aria-label={t('techniques.searchPlaceholder')}
          />
        </div>

        {/* États de chargement / erreur */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" aria-label={t('common.loading')} />
          </div>
        )}

        {!loading && error && (
          <p className="text-center text-red-500 py-12">{t('common.error')}</p>
        )}

        {/* Grille des techniques */}
        {!loading && !error && (
          <>
            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-12">
                {t('techniques.noResults')}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((technique) => (
                  <TechniqueCard key={technique.id} technique={technique} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
