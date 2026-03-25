const prisma = require('../prisma');
const { parseId } = require('../helpers');
const { computeAvgRating } = require('../helpers/recipe-helpers');

// POST /favorites/:recipeId — ajouter (idempotent)
const addFavorite = async (req, res, next) => {
  try {
    const userId   = req.user.id;
    const recipeId = parseId(req.params.recipeId);
    if (!recipeId) return res.status(400).json({ error: 'recipeId invalide' });

    const existing = await prisma.favorite.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    });
    if (existing) return res.json({ favorited: true });

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return res.status(404).json({ error: 'Recette introuvable' });

    await prisma.favorite.create({ data: { userId, recipeId } });
    res.json({ favorited: true });
  } catch (err) {
    next(err);
  }
};

// DELETE /favorites/:recipeId — retirer (idempotent)
const removeFavorite = async (req, res, next) => {
  try {
    const userId   = req.user.id;
    const recipeId = parseId(req.params.recipeId);
    if (!recipeId) return res.status(400).json({ error: 'recipeId invalide' });

    await prisma.favorite.deleteMany({
      where: { userId, recipeId },
    });
    res.json({ favorited: false });
  } catch (err) {
    next(err);
  }
};

// GET /favorites — recettes favorites de l'utilisateur connecté (paginées)
const getMyFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
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
              ratings: { select: { score: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    const data = favorites.map(({ recipe }) => computeAvgRating(recipe));
    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
};

module.exports = { addFavorite, removeFavorite, getMyFavorites };
