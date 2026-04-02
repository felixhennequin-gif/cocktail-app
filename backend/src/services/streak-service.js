// Service de gestion des séries d'activité (streaks)
const prisma = require('../prisma');

/**
 * Enregistre une action qualifiante et met à jour le streak de l'utilisateur.
 * Appelé fire-and-forget après chaque action (noter, commenter, favori, tasting, recette).
 */
const recordActivity = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streak = await prisma.userStreak.findUnique({ where: { userId } });

    if (!streak) {
      // Première activité de l'utilisateur
      await prisma.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
        },
      });
      return;
    }

    const lastActive = streak.lastActiveDate ? new Date(streak.lastActiveDate) : null;
    if (lastActive) lastActive.setHours(0, 0, 0, 0);

    // Déjà actif aujourd'hui — rien à faire
    if (lastActive && lastActive.getTime() === today.getTime()) return;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak;
    if (lastActive && lastActive.getTime() === yesterday.getTime()) {
      // Jour consécutif → incrémente la série
      newStreak = streak.currentStreak + 1;
    } else if (lastActive && lastActive.getTime() < yesterday.getTime()) {
      // Série cassée — vérifier si un freeze est disponible (premium)
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
      const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));

      if (user?.plan === 'PREMIUM' && streak.streakFreezeAvailable > 0 && daysDiff <= 2) {
        // Utiliser un freeze
        newStreak = streak.currentStreak + 1;
        await prisma.userStreak.update({
          where: { userId },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(streak.longestStreak, newStreak),
            lastActiveDate: today,
            streakFreezeAvailable: streak.streakFreezeAvailable - 1,
          },
        });
        return;
      }
      // Série perdue
      newStreak = 1;
    } else {
      newStreak = 1;
    }

    await prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(streak.longestStreak, newStreak),
        lastActiveDate: today,
      },
    });
  } catch (err) {
    // Fire and forget — on ne bloque pas l'action
    console.error('[streak] Erreur:', err.message);
  }
};

module.exports = { recordActivity };
