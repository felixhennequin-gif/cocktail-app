const prisma = require('../prisma');

// Nombre maximum de notifications conservées par user
const MAX_NOTIFICATIONS_PER_USER = 100;

// Nettoie les chaînes dans un objet de données pour éviter le XSS
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value.replace(/<[^>]*>/g, '');
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Crée une notification et supprime l'excédent au-delà de MAX_NOTIFICATIONS_PER_USER.
 * Fire and forget — à appeler sans await.
 */
const createNotification = async ({ userId, type, data }) => {
  const notif = await prisma.notification.create({ data: { userId, type, data: sanitizeData(data) } });

  // Supprimer les notifications les plus anciennes si le seuil est dépassé
  const toDelete = await prisma.notification.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    skip:    MAX_NOTIFICATIONS_PER_USER,
    select:  { id: true },
  });
  if (toDelete.length > 0) {
    await prisma.notification.deleteMany({ where: { id: { in: toDelete.map((n) => n.id) } } });
  }

  return notif;
};

/**
 * Crée une notification pour chaque follower d'un auteur.
 * Traite par lots de 500 pour éviter les requêtes trop volumineuses.
 * Fire and forget — à appeler sans await.
 */
const BATCH_SIZE = 500;

const notifyFollowers = async ({ authorId, type, data }) => {
  const follows = await prisma.follow.findMany({
    where:  { followingId: authorId },
    select: { followerId: true },
  });
  if (follows.length === 0) return;

  // Traitement par lots
  for (let i = 0; i < follows.length; i += BATCH_SIZE) {
    const batch = follows.slice(i, i + BATCH_SIZE);
    await prisma.notification.createMany({
      data: batch.map((f) => ({ userId: f.followerId, type, data })),
    });
  }
};

module.exports = { createNotification, notifyFollowers };
