const PLACEHOLDER = 'https://placehold.co/400x300?text=Cocktail'

/**
 * Résout une URL d'image stockée en base (chemin relatif /uploads/...)
 * vers une URL absolue en utilisant VITE_API_URL (production)
 * ou juste le chemin relatif en dev (proxy Vite gère /uploads).
 */
export function getImageUrl(path) {
  if (!path) return PLACEHOLDER
  if (path.startsWith('http')) return path
  // En production, VITE_API_URL = 'https://cocktail-app.fr'
  // En dev, VITE_API_URL est vide → le chemin relatif fonctionne via le serveur Express
  const base = import.meta.env.VITE_API_URL || ''
  return `${base}${path}`
}
