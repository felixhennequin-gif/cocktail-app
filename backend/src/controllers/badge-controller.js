// Contrôleur des badges
const prisma = require('../prisma');
const { parseId, badRequest, notFound } = require('../helpers');

// GET /badges — liste tous les badges disponibles
const getAllBadges = async (req, res, next) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(badges);
  } catch (err) {
    next(err);
  }
};

// GET /badges/me — badges débloqués de l'utilisateur connecté
const getMyBadges = async (req, res, next) => {
  try {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: req.user.id },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' },
    });
    res.json(userBadges);
  } catch (err) {
    next(err);
  }
};

// GET /badges/user/:userId — badges publics d'un utilisateur
const getUserBadges = async (req, res, next) => {
  try {
    const userId = parseId(req.params.userId);
    if (!userId) return badRequest(res, 'userId invalide');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return notFound(res, 'Utilisateur introuvable');

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' },
    });
    res.json(userBadges);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllBadges, getMyBadges, getUserBadges };
