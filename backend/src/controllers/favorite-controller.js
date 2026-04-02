const prisma = require('../prisma');
const { parseId, badRequest, notFound } = require('../helpers');
const { enrichRecipes } = require('../helpers/recipe-helpers');
const { checkAndAwardBadges } = require('../services/badge-service');
const { recordActivity } = require('../services/streak-service');

// POST /favorites/:recipeId — ajouter (idempotent)
const addFavorite = async (req, res, next) => {
  try {
    const userId   = req.user.id;
    const recipeId = parseId(req.params.recipeId);
    if (!recipeId) return badRequest(res, 'recipeId invalide');

    const existing = await prisma.favorite.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    });
    if (existing) return res.json({ favorited: true });

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return notFound(res, 'Recette introuvable');

    await prisma.favorite.create({ data: { userId, recipeId } });
    res.json({ favorited: true });

    // Vérifier les badges "favoris reçus" pour l'auteur de la recette — fire and forget
    if (recipe.authorId) {
      checkAndAwardBadges(recipe.authorId).catch(console.error);
    }
    recordActivity(req.user.id).catch(() => {});
  } catch (err) {
    next(err);
  }
};

// DELETE /favorites/:recipeId — retirer (idempotent)
const removeFavorite = async (req, res, next) => {
  try {
    const userId   = req.user.id;
    const recipeId = parseId(req.params.recipeId);
    if (!recipeId) return badRequest(res, 'recipeId invalide');

    await prisma.favorite.deleteMany({
      where: { userId, recipeId },
    });
    res.json({ favorited: false });
  } catch (err) {
    next(err);
  }
};

// GET /favorites — recettes favorites de l'utilisateur connecté (paginées)
// ?idsOnly=true retourne uniquement les IDs des recettes (léger, pour le context)
const getMyFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (req.query.idsOnly === 'true') {
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        select: { recipeId: true },
      });
      return res.json({ ids: favorites.map((f) => f.recipeId) });
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        include: {
          recipe: {
            include: {
              category: true,
              author: { select: { id: true, pseudo: true } },
              _count: { select: { ratings: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    const rawRecipes = favorites.map(({ recipe }) => recipe);
    const data = await enrichRecipes(rawRecipes);
    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
};

module.exports = { addFavorite, removeFavorite, getMyFavorites };
