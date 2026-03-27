const prisma = require('../prisma');
const { includeList, enrichRecipes } = require('../helpers/recipe-helpers');

// GET /feed?cursor=123&limit=20 — JWT requis, pagination par curseur
const getFeed = async (req, res, next) => {
  try {
  const limit  = Math.min(20, Math.max(1, parseInt(req.query.limit) || 20));
  const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

  // IDs des utilisateurs suivis
  const follows = await prisma.follow.findMany({
    where:  { followerId: req.user.id },
    select: { followingId: true },
  });
  const followingIds = follows.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return res.json({ data: [], nextCursor: null });
  }

  const where = {
    authorId: { in: followingIds },
    status: 'PUBLISHED',
    ...(cursor ? { id: { lt: cursor } } : {}),
  };

  // On prend limit+1 pour détecter s'il reste des résultats
  const recipes = await prisma.recipe.findMany({
    where,
    include: includeList,
    orderBy: { id: 'desc' },
    take: limit + 1,
  });

  const hasMore    = recipes.length > limit;
  const data       = hasMore ? recipes.slice(0, limit) : recipes;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  res.json({ data: await enrichRecipes(data), nextCursor });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFeed };
