// Service de vérification et attribution des badges
const prisma = require('../prisma');
const { createNotification } = require('./notification-service');

/**
 * Compteurs de conditions pour un utilisateur donné.
 * Chaque clé correspond à badge.condition dans la BDD.
 */
const conditionCounters = {
  // Nombre de recettes publiées par l'utilisateur
  published_recipes: (userId) =>
    prisma.recipe.count({ where: { authorId: userId, status: 'PUBLISHED' } }),

  // Nombre de notes données par l'utilisateur
  ratings_given: (userId) =>
    prisma.rating.count({ where: { userId } }),

  // Nombre de commentaires postés par l'utilisateur
  comments_posted: (userId) =>
    prisma.comment.count({ where: { userId } }),

  // Nombre de followers de l'utilisateur
  followers_count: (userId) =>
    prisma.follow.count({ where: { followingId: userId } }),

  // Nombre total de favoris reçus sur les recettes de l'utilisateur
  favorites_received: async (userId) => {
    const result = await prisma.favorite.count({
      where: { recipe: { authorId: userId } },
    });
    return result;
  },
};

/**
 * Vérifie toutes les conditions de badges pour un utilisateur
 * et attribue les nouveaux badges débloqués.
 * Fire and forget — à appeler sans await.
 */
const checkAndAwardBadges = async (userId) => {
  try {
    // Récupérer tous les badges et ceux déjà obtenus par l'utilisateur
    const [allBadges, userBadges] = await Promise.all([
      prisma.badge.findMany(),
      prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
    ]);

    const ownedIds = new Set(userBadges.map((ub) => ub.badgeId));

    // Filtrer les badges non encore obtenus
    const pendingBadges = allBadges.filter((b) => !ownedIds.has(b.id));
    if (pendingBadges.length === 0) return;

    // Regrouper par condition pour éviter les requêtes en double
    const conditionGroups = {};
    for (const badge of pendingBadges) {
      if (!conditionGroups[badge.condition]) {
        conditionGroups[badge.condition] = [];
      }
      conditionGroups[badge.condition].push(badge);
    }

    // Évaluer chaque condition une seule fois
    const newBadges = [];
    for (const [condition, badges] of Object.entries(conditionGroups)) {
      const counter = conditionCounters[condition];
      if (!counter) continue;

      const count = await counter(userId);
      for (const badge of badges) {
        if (count >= badge.threshold) {
          newBadges.push(badge);
        }
      }
    }

    // Attribuer les nouveaux badges et envoyer les notifications
    for (const badge of newBadges) {
      await prisma.userBadge.create({
        data: { userId, badgeId: badge.id },
      }).catch(() => {
        // Ignore les doublons (race condition possible)
      });

      // Notification pour chaque nouveau badge
      createNotification({
        userId,
        type: 'NEW_BADGE',
        data: {
          badgeCode: badge.code,
          badgeName: badge.name,
          badgeIcon: badge.icon,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[badge-service] Erreur lors de la vérification des badges:', err.message);
  }
};

module.exports = { checkAndAwardBadges };
