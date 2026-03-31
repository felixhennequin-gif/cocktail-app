const prisma = require('../prisma');
const { parseId, badRequest, notFound } = require('../helpers');
const { createTastingLogSchema, formatZodError } = require('../schemas');
const { checkAndAwardBadges } = require('../services/badge-service');

// POST /tastings — créer une entrée de dégustation
const createTasting = async (req, res, next) => {
  try {
    const parsed = createTastingLogSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, formatZodError(parsed.error));

    const { recipeId, notes, photoUrl, personalRating, adjustments, madeAt } = parsed.data;

    // Vérifier que la recette existe
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return notFound(res, 'Recette introuvable');

    const tasting = await prisma.tastingLog.create({
      data: {
        userId: req.user.id,
        recipeId,
        notes,
        photoUrl,
        personalRating,
        adjustments,
        madeAt: madeAt ? new Date(madeAt) : undefined,
      },
      include: {
        recipe: {
          select: { id: true, name: true, imageUrl: true, difficulty: true, prepTime: true, categoryId: true },
        },
      },
    });

    // Vérification des badges (fire and forget)
    checkAndAwardBadges(req.user.id).catch(() => {});

    res.status(201).json(tasting);
  } catch (err) {
    next(err);
  }
};

// GET /tastings — liste paginée des dégustations de l'utilisateur
const getMyTastings = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [tastings, total] = await Promise.all([
      prisma.tastingLog.findMany({
        where: { userId: req.user.id },
        orderBy: { madeAt: 'desc' },
        skip,
        take: limit,
        include: {
          recipe: {
            select: {
              id: true, name: true, imageUrl: true, difficulty: true,
              prepTime: true, categoryId: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.tastingLog.count({ where: { userId: req.user.id } }),
    ]);

    res.json({ data: tastings, total, page, limit });
  } catch (err) {
    next(err);
  }
};

// GET /tastings/stats — statistiques de dégustation
const getTastingStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Total de dégustations
    const total = await prisma.tastingLog.count({ where: { userId } });

    if (total === 0) {
      return res.json({ total: 0, topRecipe: null, mostActiveMonth: null, uniqueRecipes: 0, uniqueCategories: 0 });
    }

    // Recette la plus faite
    const topRecipeResult = await prisma.tastingLog.groupBy({
      by: ['recipeId'],
      where: { userId },
      _count: { recipeId: true },
      orderBy: { _count: { recipeId: 'desc' } },
      take: 1,
    });

    let topRecipe = null;
    if (topRecipeResult.length > 0) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: topRecipeResult[0].recipeId },
        select: { id: true, name: true, imageUrl: true },
      });
      topRecipe = recipe ? { ...recipe, count: topRecipeResult[0]._count.recipeId } : null;
    }

    // Mois le plus actif (via raw SQL pour extraction mois)
    const mostActiveMonthResult = await prisma.$queryRaw`
      SELECT TO_CHAR("madeAt", 'YYYY-MM') AS month, COUNT(*)::int AS count
      FROM "TastingLog"
      WHERE "userId" = ${userId}
      GROUP BY month
      ORDER BY count DESC
      LIMIT 1
    `;
    const mostActiveMonth = mostActiveMonthResult.length > 0
      ? { month: mostActiveMonthResult[0].month, count: mostActiveMonthResult[0].count }
      : null;

    // Nombre de recettes et catégories uniques
    const uniqueRecipes = await prisma.tastingLog.groupBy({
      by: ['recipeId'],
      where: { userId },
    });

    const recipeIds = uniqueRecipes.map((r) => r.recipeId);
    const uniqueCategories = recipeIds.length > 0
      ? await prisma.recipe.groupBy({
          by: ['categoryId'],
          where: { id: { in: recipeIds } },
        })
      : [];

    res.json({
      total,
      topRecipe,
      mostActiveMonth,
      uniqueRecipes: recipeIds.length,
      uniqueCategories: uniqueCategories.length,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /tastings/:id — supprimer une entrée de dégustation
const deleteTasting = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return badRequest(res, 'id invalide');

    const tasting = await prisma.tastingLog.findUnique({ where: { id } });
    if (!tasting) return notFound(res, 'Dégustation introuvable');
    if (tasting.userId !== req.user.id) return notFound(res, 'Dégustation introuvable');

    await prisma.tastingLog.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTasting, getMyTastings, getTastingStats, deleteTasting };
