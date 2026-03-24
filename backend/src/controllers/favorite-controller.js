const prisma = require('../prisma');
const { parseId } = require('../helpers');

// POST /favorites/:recipeId — toggle (ajoute ou retire)
const toggleFavorite = async (req, res, next) => {
  try {
    const userId   = req.user.id;
    const recipeId = parseId(req.params.recipeId);
    if (!recipeId) return res.status(400).json({ error: 'recipeId invalide' });

    const existing = await prisma.favorite.findUnique({
      where: { userId_recipeId: { userId, recipeId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { userId_recipeId: { userId, recipeId } } });
      return res.json({ favorited: false });
    }

    // Vérification que la recette existe
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return res.status(404).json({ error: 'Recette introuvable' });

    await prisma.favorite.create({ data: { userId, recipeId } });
    res.json({ favorited: true });
  } catch (err) {
    next(err);
  }
};

// GET /favorites — recettes favorites de l'utilisateur connecté
const getMyFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const favorites = await prisma.favorite.findMany({
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
    });

    const recipes = favorites.map(({ recipe }) => {
      const { ratings, ...rest } = recipe;
      const avgRating =
        ratings.length > 0
          ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
          : null;
      return { ...rest, avgRating, ratingsCount: ratings.length };
    });

    res.json(recipes);
  } catch (err) {
    next(err);
  }
};

module.exports = { toggleFavorite, getMyFavorites };
