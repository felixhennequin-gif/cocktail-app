import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <Helmet>
        <title>404 — Page introuvable — Cocktails</title>
      </Helmet>
      <div className="text-7xl mb-6">🍹</div>
      <h1 className="text-4xl font-bold text-gray-900 mb-3">404</h1>
      <p className="text-xl text-gray-500 mb-2">Page introuvable</p>
      <p className="text-sm text-gray-400 mb-8">
        Cette page n'existe pas ou a été déplacée.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors"
      >
        ← Retour à l'accueil
      </Link>
    </div>
  )
}
