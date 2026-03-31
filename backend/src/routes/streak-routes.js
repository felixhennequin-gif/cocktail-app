const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../prisma');

const router = Router();

// GET /streak — retourne le streak de l'utilisateur connecté
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const streak = await prisma.userStreak.findUnique({
      where: { userId: req.user.id },
    });

    if (!streak) {
      return res.json({ currentStreak: 0, longestStreak: 0, lastActiveDate: null });
    }

    res.json({
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActiveDate: streak.lastActiveDate,
      streakFreezeAvailable: streak.streakFreezeAvailable,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
