import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import DOMPurify from 'dompurify'
import { useAuth } from '../contexts/AuthContext'

// ---------------------------------------------------------------------------
// Convertisseur Markdown → HTML minimal (sans dépendance externe)
// Supporte : titres (# ## ###), gras, italique, liens, listes, séparateurs,
//            sauts de ligne et paragraphes.
// ---------------------------------------------------------------------------
function simpleMarkdownToHtml(md) {
  if (!md) return ''

  const lines = md.split('\n')
  const html  = []
  let inList  = false

  const flushList = () => {
    if (inList) { html.push('</ul>'); inList = false }
  }

  const inlineFormat = (text) =>
    text
      // Gras
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italique
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Liens [texte](url)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) => {
        const safe = url.replace(/"/g, '%22')
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-gold-500 dark:text-gold-400 hover:underline">${label}</a>`
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-sm">$1</code>')

  for (const raw of lines) {
    const line = raw

    // Séparateur horizontal
    if (/^---+$/.test(line.trim())) {
      flushList()
      html.push('<hr class="my-6 border-gray-200 dark:border-gray-700" />')
      continue
    }

    // Titres
    const h3 = line.match(/^### (.+)/)
    if (h3) { flushList(); html.push(`<h3 class="font-serif text-xl text-gray-900 dark:text-gray-100 mt-6 mb-2">${inlineFormat(h3[1])}</h3>`); continue }

    const h2 = line.match(/^## (.+)/)
    if (h2) { flushList(); html.push(`<h2 class="font-serif text-2xl text-gray-900 dark:text-gray-100 mt-8 mb-3">${inlineFormat(h2[1])}</h2>`); continue }

    const h1 = line.match(/^# (.+)/)
    if (h1) { flushList(); html.push(`<h1 class="font-serif text-3xl text-gray-900 dark:text-gray-100 mt-8 mb-4">${inlineFormat(h1[1])}</h1>`); continue }

    // Éléments de liste
    const li = line.match(/^[-*] (.+)/)
    if (li) {
      if (!inList) { html.push('<ul class="list-disc list-inside space-y-1 my-3 text-gray-700 dark:text-gray-300">'); inList = true }
      html.push(`<li>${inlineFormat(li[1])}</li>`)
      continue
    }

    // Ligne vide → ferme liste si ouverte, marque séparation de paragraphe
    if (line.trim() === '') {
      flushList()
      html.push('<p class="paragraph-break"></p>')
      continue
    }

    // Paragraphe normal
    flushList()
    html.push(`<p class="leading-relaxed text-gray-700 dark:text-gray-300">${inlineFormat(line)}</p>`)
  }

  flushList()

  // Fusionne les paragraphes consécutifs vides en un seul espace
  return html.join('\n').replace(/(<p class="paragraph-break"><\/p>\n?)+/g, '<br />')
}

// ---------------------------------------------------------------------------

export default function BlogArticle() {
  const { slug }         = useParams()
  const { t, i18n }     = useTranslation()
  const { user, authFetch } = useAuth()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    authFetch(`/api/articles/${slug}`)
      .then((r) => {
        if (r.status === 404) throw new Error('not_found')
        if (!r.ok) throw new Error('fetch_error')
        return r.json()
      })
      .then((data) => { if (!cancelled) setArticle(data) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [slug, authFetch])

  const renderedContent = useMemo(
    () => (article ? DOMPurify.sanitize(simpleMarkdownToHtml(article.content)) : ''),
    [article]
  )

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error === 'not_found' || !article) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('common.notFoundTitle')}</p>
        <Link to="/blog" className="text-gold-500 dark:text-gold-400 hover:underline text-sm">
          {t('blog.backToBlog')}
        </Link>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>{article.title} — {t('blog.title')} — Cocktails</title>
        <meta name="description" content={article.excerpt} />
        {article.coverImage && <meta property="og:image" content={article.coverImage} />}
      </Helmet>

      <article className="max-w-2xl mx-auto">
        {/* Lien retour */}
        <Link
          to="/blog"
          className="inline-block mb-6 text-sm text-gray-400 dark:text-gray-500 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
        >
          {t('blog.backToBlog')}
        </Link>

        {/* Image de couverture */}
        {article.coverImage && (
          <img
            src={article.coverImage}
            alt=""
            className="w-full rounded-xl mb-8 object-cover max-h-96"
          />
        )}

        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-2.5 py-1 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Titre */}
        <h1 className="font-serif text-3xl md:text-4xl text-gray-900 dark:text-gray-100 leading-tight mb-4">
          {article.title}
        </h1>

        {/* Métadonnées auteur / date */}
        <div className="flex items-center gap-3 mb-6 text-sm text-gray-400 dark:text-gray-500">
          {article.author?.avatar ? (
            <img
              src={article.author.avatar}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-gold-200 dark:bg-gold-900/40 flex items-center justify-center text-xs font-bold text-gold-700 dark:text-gold-400">
              {article.author?.pseudo?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
          <span>{t('blog.by', { author: article.author?.pseudo ?? '—' })}</span>
          {article.publishedAt && (
            <>
              <span aria-hidden>·</span>
              <time dateTime={article.publishedAt}>
                {t('blog.publishedOn', { date: formatDate(article.publishedAt) })}
              </time>
            </>
          )}
          {/* Badge brouillon (admin uniquement) */}
          {article.status === 'DRAFT' && user?.role === 'ADMIN' && (
            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium">
              Draft
            </span>
          )}
        </div>

        {/* Extrait mis en avant */}
        <p className="text-lg text-gray-600 dark:text-gray-400 italic mb-8 border-l-4 border-gold-400 pl-4">
          {article.excerpt}
        </p>

        {/* Corps de l'article — Markdown rendu */}
        <div
          className="prose-article space-y-2"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </article>
    </>
  )
}
