/**
 * Convertit une chaîne en slug URL-safe.
 * "Piña Colada" → "pina-colada", "Café Brûlé" → "cafe-brule"
 */
const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Génère un slug de recette au format "{recipe-name}-by-{author-pseudo}".
 * Si pas d'auteur, retourne juste le slug du nom.
 */
const generateRecipeSlug = (recipeName, authorPseudo) => {
  const nameSlug = slugify(recipeName);
  if (!authorPseudo) return nameSlug;
  return `${nameSlug}-by-${slugify(authorPseudo)}`;
};

/**
 * Garantit l'unicité d'un slug en ajoutant un suffixe numérique si nécessaire.
 * @param {string} baseSlug - le slug de base
 * @param {object} prisma - instance PrismaClient
 * @param {string} model - nom du modèle Prisma ('recipe', 'article', etc.)
 * @param {number|null} excludeId - id à exclure (pour les updates)
 */
const uniqueSlug = async (baseSlug, prisma, model, excludeId = null) => {
  let slug = baseSlug;
  let i = 1;
  while (true) {
    const existing = await prisma[model].findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${baseSlug}-${i++}`;
  }
};

module.exports = { slugify, generateRecipeSlug, uniqueSlug };
