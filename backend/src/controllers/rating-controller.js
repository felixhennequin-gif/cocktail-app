const prisma = require('../prisma');
const { parseId, badRequest, notFound } = require('../helpers');
const { ratingSchema, formatZodError } = require('../schemas');

// POST /ratings/:recipeId — upsert (crée ou met à jour la note de l'user)
const upsertRating = async (req, res) => {
  const userId   = req.user.id;
  const recipeId = parseId(req.params.recipeId);
  if (!recipeId) return badRequest(res, 'recipeId invalide');

  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) {
    return badRequest(res, formatZodError(parsed.error));
  }

  const { score } = parsed.data;

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) return notFound(res, 'Recette introuvable');

  await prisma.rating.upsert({
    where: { userId_recipeId: { userId, recipeId } },
    create: { userId, recipeId, score },
    update: { score },
  });

  // Retourne la nouvelle moyenne via aggregate (pas de chargement en mémoire)
  const agg = await prisma.rating.aggregate({
    where: { recipeId },
    _avg: { score: true },
    _count: { score: true },
  });
  const avgRating = agg._avg.score !== null
    ? Math.round(agg._avg.score * 10) / 10
    : null;

  res.json({ avgRating, ratingsCount: agg._count.score, userScore: score });
};

// GET /ratings/:recipeId/me — note de l'utilisateur connecté pour cette recette
const getMyRating = async (req, res) => {
  const userId   = req.user.id;
  const recipeId = parseId(req.params.recipeId);
  if (!recipeId) return badRequest(res, 'recipeId invalide');

  const rating = await prisma.rating.findUnique({
    where: { userId_recipeId: { userId, recipeId } },
  });

  res.json({ score: rating?.score ?? null });
};

module.exports = { upsertRating, getMyRating };
