const crypto = require('crypto');
const prisma = require('../prisma');
const { includeDetail } = require('../helpers/recipe-helpers');
const { getCache, setCache } = require('../cache');
const { notFound, sendError } = require('../helpers');

const DAILY_CACHE_KEY = 'cocktail:daily-recipe';

// Calcule le TTL jusqu'à minuit
const ttlUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(1, Math.floor((midnight - now) / 1000));
};

// GET /recipes/daily — cocktail du jour (déterministe par date)
const getDailyRecipe = async (req, res) => {
  try {
    // Tenter de lire le cache pour les données publiques de la recette (désactivé en test)
    let publicData = process.env.NODE_ENV === 'test' ? null : await getCache(DAILY_CACHE_KEY);

    if (!publicData) {
      // Nombre de recettes publiées
      const count = await prisma.recipe.count({ where: { status: 'PUBLISHED' } });
      if (count === 0) {
        return notFound(res, 'Aucune recette publiée');
      }

      // Hash déterministe de la date du jour → index stable pour la journée
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const hash = crypto.createHash('sha256').update(today).digest();
      const index = hash.readUInt32BE(0) % count;

      const [recipe] = await prisma.recipe.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { id: 'asc' },
        skip: index,
        take: 1,
        include: includeDetail,
      });

      if (!recipe) {
        return notFound(res, 'Recette introuvable');
      }

      // Calculer la moyenne via aggregate (pas de chargement en mémoire)
      const ratingAgg = await prisma.rating.aggregate({
        where: { recipeId: recipe.id },
        _avg: { score: true },
        _count: { score: true },
      });

      const { tags: recipeTags, ratings, ...recipeRest } = recipe;
      const flatTags = recipeTags ? recipeTags.map((rt) => rt.tag) : [];
      const avgRating = ratingAgg._avg.score !== null
        ? Math.round(ratingAgg._avg.score * 10) / 10
        : null;

      publicData = { ...recipeRest, tags: flatTags, avgRating, ratingsCount: ratingAgg._count.score };

      // Mettre en cache jusqu'à minuit
      setCache(DAILY_CACHE_KEY, publicData, ttlUntilMidnight()).catch(() => {});
    }

    // Données spécifiques à l'utilisateur connecté
    let userFields = {};
    if (req.user) {
      const [fav, userRating] = await Promise.all([
        prisma.favorite.findUnique({
          where: { userId_recipeId: { userId: req.user.id, recipeId: publicData.id } },
        }),
        prisma.rating.findUnique({
          where: { userId_recipeId: { userId: req.user.id, recipeId: publicData.id } },
        }),
      ]);
      userFields = { isFavorited: !!fav, userScore: userRating?.score ?? null };
    }

    res.json({ ...publicData, ...userFields });
  } catch (err) {
    const logger = require('../logger');
    logger.error('daily', 'Erreur cocktail du jour', { error: err.message });
    sendError(res, 500, 'Erreur serveur', 'INTERNAL_ERROR');
  }
};

module.exports = { getDailyRecipe };
