const prisma = require('../prisma');

// POST /ratings/:recipeId — upsert (crée ou met à jour la note de l'user)
const upsertRating = async (req, res) => {
  const userId   = req.user.id;
  const recipeId = parseInt(req.params.recipeId);
  const score    = parseInt(req.body.score);

  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Le score doit être entre 1 et 5' });
  }

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) return res.status(404).json({ error: 'Recette introuvable' });

  await prisma.rating.upsert({
    where: { userId_recipeId: { userId, recipeId } },
    create: { userId, recipeId, score },
    update: { score },
  });

  // Retourne la nouvelle moyenne
  const ratings = await prisma.rating.findMany({ where: { recipeId }, select: { score: true } });
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10) / 10
      : null;

  res.json({ avgRating, ratingsCount: ratings.length, userScore: score });
};

// GET /ratings/:recipeId/me — note de l'utilisateur connecté pour cette recette
const getMyRating = async (req, res) => {
  const userId   = req.user.id;
  const recipeId = parseInt(req.params.recipeId);

  const rating = await prisma.rating.findUnique({
    where: { userId_recipeId: { userId, recipeId } },
  });

  res.json({ score: rating?.score ?? null });
};

module.exports = { upsertRating, getMyRating };
