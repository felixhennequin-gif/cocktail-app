// Helpers partagés pour les controllers liés aux recettes

// Inclusions des tags (réutilisable)
const includeTags = { tags: { include: { tag: true } } };

// Inclusions pour les vues détaillées
const includeDetail = {
  category: true,
  author: {
    select: { id: true, pseudo: true, avatar: true },
  },
  ingredients: {
    include: { ingredient: true },
  },
  steps: {
    orderBy: { order: 'asc' },
  },
  ratings: {
    select: { score: true },
  },
  parentRecipe: {
    select: { id: true, name: true },
  },
  variants: {
    where: { status: 'PUBLISHED' },
    select: { id: true, name: true, imageUrl: true, difficulty: true, prepTime: true },
  },
  ...includeTags,
};

// Inclusions pour les listes (plus légères)
const includeList = {
  category: true,
  author: { select: { id: true, pseudo: true } },
  ratings: { select: { score: true } },
  ...includeTags,
};

// Calcule la moyenne d'un tableau de ratings (utile pour les résponses API partielles)
const calcAvg = (ratings) =>
  ratings.length > 0
    ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
    : null;

// Calcule la moyenne des notes et aplatit les tags
const computeAvgRating = (recipe) => {
  const { ratings, tags, ...rest } = recipe;
  const avgRating = calcAvg(ratings);
  return {
    ...rest,
    avgRating,
    ratingsCount: ratings.length,
    ...(tags ? { tags: tags.map((rt) => rt.tag) } : {}),
  };
};

// Convertit les erreurs Prisma connues en réponses HTTP appropriées
const handlePrismaError = (err, res) => {
  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Référence invalide : categoryId ou ingredientId inexistant', code: 'BAD_REQUEST' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Recette introuvable', code: 'NOT_FOUND' });
  }
  throw err;
};

module.exports = { includeTags, includeDetail, includeList, computeAvgRating, calcAvg, handlePrismaError };
