const prisma = require('../prisma');
const { sendPushNotification } = require('./push-service');

// Nombre maximum de notifications conservées par user
const MAX_NOTIFICATIONS_PER_USER = 100;

/**
 * Construit le payload push à partir du type de notification et de ses données.
 * Retourne un objet { title, body, url? } destiné au service worker.
 */
const buildPushPayload = (type, data = {}) => {
  switch (type) {
    case 'NEW_RECIPE':
      return {
        title: 'Nouvelle recette',
        body:  `${data.authorPseudo || 'Quelqu\'un'} a publié "${data.recipeName || 'une recette'}"`,
        url:   data.recipeId ? `/recipes/${data.recipeId}` : '/recipes',
      };
    case 'COMMENT_ON_RECIPE':
      return {
        title: 'Nouveau commentaire',
        body:  `${data.commenterPseudo || 'Quelqu\'un'} a commenté "${data.recipeName || 'votre recette'}"`,
        url:   data.recipeId ? `/recipes/${data.recipeId}` : '/',
      };
    case 'RECIPE_APPROVED':
      return {
        title: 'Recette approuvée',
        body:  `Votre recette "${data.recipeName || ''}" a été publiée`,
        url:   data.recipeId ? `/recipes/${data.recipeId}` : '/',
      };
    case 'NEW_FOLLOWER':
      return {
        title: 'Nouveau follower',
        body:  `${data.followerPseudo || 'Quelqu\'un'} vous suit maintenant`,
        url:   data.followerId ? `/users/${data.followerId}` : '/',
      };
    case 'NEW_BADGE':
      return {
        title: 'Nouveau badge débloqué',
        body:  `Vous avez obtenu le badge ${data.badgeIcon || ''} ${data.badgeName || ''}`.trim(),
        url:   '/',
      };
    default:
      return { title: 'Écume', body: 'Vous avez une nouvelle notification', url: '/' };
  }
};

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
  const sanitized = sanitizeData(data);
  const notif = await prisma.notification.create({ data: { userId, type, data: sanitized } });

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

  // Envoyer la push notification (fire and forget — ne bloque pas la réponse HTTP)
  sendPushNotification(userId, buildPushPayload(type, sanitized)).catch(() => {});

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

  const pushPayload = buildPushPayload(type, data);

  // Traitement par lots
  for (let i = 0; i < follows.length; i += BATCH_SIZE) {
    const batch = follows.slice(i, i + BATCH_SIZE);
    await prisma.notification.createMany({
      data: batch.map((f) => ({ userId: f.followerId, type, data })),
    });

    // Envoyer les push notifications à tous les followers du lot (fire and forget)
    for (const f of batch) {
      sendPushNotification(f.followerId, pushPayload).catch(() => {});
    }
  }
};

module.exports = { createNotification, notifyFollowers };
