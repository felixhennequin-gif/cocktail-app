const prisma = require('../prisma');
const { getCache, setCache } = require('../cache');
const { badRequest } = require('../helpers');

const VALID_CATEGORIES = ['recipes', 'ratings', 'followers', 'comments'];
const VALID_PERIODS = ['week', 'month', 'all'];

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

// GET /leaderboard?category=recipes&period=month
const getLeaderboard = async (req, res, next) => {
  try {
    const category = req.query.category || 'recipes';
    const period = req.query.period || 'all';

    if (!VALID_CATEGORIES.includes(category)) return badRequest(res, 'Catégorie invalide');
    if (!VALID_PERIODS.includes(period)) return badRequest(res, 'Période invalide');

    const cacheKey = `leaderboard:${category}:${period}`;
    const cached = process.env.NODE_ENV === 'test' ? null : await getCache(cacheKey);
    if (cached) return res.json(cached);

    const periodStart = getPeriodStart(period);
    let rankings = [];

    // Utilisateurs qui acceptent d'apparaître dans le leaderboard
    const visibleUserIds = await prisma.user.findMany({
      where: { showInLeaderboard: true },
      select: { id: true },
    });
    const visibleIds = visibleUserIds.map((u) => u.id);

    if (category === 'recipes') {
      // Nombre de recettes publiées bien notées
      const where = {
        status: 'PUBLISHED',
        authorId: { not: null, in: visibleIds },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      };
      const result = await prisma.recipe.groupBy({
        by: ['authorId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      });
      const userIds = result.map((r) => r.authorId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, pseudo: true, avatar: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      rankings = result.map((r, i) => ({
        rank: i + 1,
        userId: r.authorId,
        pseudo: userMap[r.authorId]?.pseudo,
        avatar: userMap[r.authorId]?.avatar,
        score: r._count.id,
      }));
    } else if (category === 'ratings') {
      // Plus de notes données
      const where = {
        userId: { in: visibleIds },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      };
      const result = await prisma.rating.groupBy({
        by: ['userId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      });
      const userIds = result.map((r) => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, pseudo: true, avatar: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      rankings = result.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        pseudo: userMap[r.userId]?.pseudo,
        avatar: userMap[r.userId]?.avatar,
        score: r._count.id,
      }));
    } else if (category === 'followers') {
      // Plus de followers
      const where = {
        followingId: { in: visibleIds },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      };
      const result = await prisma.follow.groupBy({
        by: ['followingId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      });
      const userIds = result.map((r) => r.followingId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, pseudo: true, avatar: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      rankings = result.map((r, i) => ({
        rank: i + 1,
        userId: r.followingId,
        pseudo: userMap[r.followingId]?.pseudo,
        avatar: userMap[r.followingId]?.avatar,
        score: r._count.id,
      }));
    } else if (category === 'comments') {
      // Plus de commentaires
      const where = {
        userId: { in: visibleIds },
        ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
      };
      const result = await prisma.comment.groupBy({
        by: ['userId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      });
      const userIds = result.map((r) => r.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, pseudo: true, avatar: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      rankings = result.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        pseudo: userMap[r.userId]?.pseudo,
        avatar: userMap[r.userId]?.avatar,
        score: r._count.id,
      }));
    }

    const data = { category, period, rankings };
    setCache(cacheKey, data, 3600).catch(() => {}); // Cache 1h
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getLeaderboard };
