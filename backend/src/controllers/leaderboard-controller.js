const { z } = require('zod');
const prisma = require('../prisma');
const { getCache, setCache } = require('../cache');
const { badRequest } = require('../helpers');
const { formatZodError } = require('../schemas');

// Schéma de validation des paramètres du leaderboard
const leaderboardSchema = z.object({
  category: z.enum(['recipes', 'ratings', 'followers', 'comments']).default('recipes'),
  period:   z.enum(['all', 'month', 'week']).default('all'),
});

// Retourne la date de début de la période
const getPeriodStart = (period) => {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'week') {
    now.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    now.setMonth(now.getMonth() - 1);
  }
  return now;
};

/**
 * Calcule un classement générique via groupBy sur un modèle Prisma.
 * @param {object} model         - Le modèle Prisma (ex: prisma.recipe)
 * @param {string} groupByField  - Le champ sur lequel grouper (ex: 'authorId')
 * @param {object} where         - La clause where à appliquer
 * @param {object} userMap       - Map id → { pseudo, avatar }
 */
const computeRanking = async (model, groupByField, where) => {
  const result = await model.groupBy({
    by: [groupByField],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  const userIds = result.map((r) => r[groupByField]);
  const users = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, pseudo: true, avatar: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return result.map((r, i) => ({
    rank:   i + 1,
    userId: r[groupByField],
    pseudo: userMap[r[groupByField]]?.pseudo,
    avatar: userMap[r[groupByField]]?.avatar,
    score:  r._count.id,
  }));
};

// GET /leaderboard?category=recipes&period=month
const getLeaderboard = async (req, res, next) => {
  try {
    const parsed = leaderboardSchema.safeParse(req.query);
    if (!parsed.success) return badRequest(res, formatZodError(parsed.error));
    const { category, period } = parsed.data;

    const cacheKey = `leaderboard:${category}:${period}`;
    const cached = process.env.NODE_ENV === 'test' ? null : await getCache(cacheKey);
    if (cached) return res.json(cached);

    const periodStart = getPeriodStart(period);

    // Utilisateurs qui acceptent d'apparaître dans le leaderboard
    const visibleUserIds = await prisma.user.findMany({
      where:  { showInLeaderboard: true },
      select: { id: true },
    });
    const visibleIds = visibleUserIds.map((u) => u.id);

    let rankings = [];

    if (category === 'recipes') {
      rankings = await computeRanking(prisma.recipe, 'authorId', {
        status:   'PUBLISHED',
        authorId: { not: null, in: visibleIds },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      });
    } else if (category === 'ratings') {
      rankings = await computeRanking(prisma.rating, 'userId', {
        userId: { in: visibleIds },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      });
    } else if (category === 'followers') {
      rankings = await computeRanking(prisma.follow, 'followingId', {
        followingId: { in: visibleIds },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      });
    } else if (category === 'comments') {
      rankings = await computeRanking(prisma.comment, 'userId', {
        userId: { in: visibleIds },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      });
    }

    const data = { category, period, rankings };
    setCache(cacheKey, data, 3600).catch(() => {}); // Cache 1h
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeaderboard };
