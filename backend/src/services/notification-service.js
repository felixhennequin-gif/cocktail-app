const prisma = require('../prisma');

/**
 * Crée une notification.
 * Retourne une Promise — à appeler avec .catch(console.error) (fire and forget).
 */
const createNotification = ({ userId, type, data }) =>
  prisma.notification.create({ data: { userId, type, data } });

/**
 * Crée une notification pour chaque follower d'un auteur.
 * Fire and forget — à appeler sans await.
 */
const notifyFollowers = async ({ authorId, type, data }) => {
  const follows = await prisma.follow.findMany({
    where:  { followingId: authorId },
    select: { followerId: true },
  });
  if (follows.length === 0) return;

  await prisma.notification.createMany({
    data: follows.map((f) => ({ userId: f.followerId, type, data })),
  });
};

module.exports = { createNotification, notifyFollowers };
