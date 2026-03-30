const webpush = require('web-push');
const prisma = require('../prisma');

// Configuration VAPID — clés générées via `npx web-push generate-vapid-keys` et stockées dans .env
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contact@cocktail-app.fr',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Envoie une push notification à toutes les subscriptions d'un utilisateur.
 * Supprime automatiquement les subscriptions expirées (410 Gone / 404 Not Found).
 * Fire and forget — à appeler sans await.
 *
 * @param {number} userId  - ID de l'utilisateur destinataire
 * @param {object} payload - Objet sérialisé en JSON envoyé au service worker
 */
const sendPushNotification = async (userId, payload) => {
  // Push désactivé si les clés VAPID ne sont pas configurées
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        // Supprimer les subscriptions périmées signalées par le push service
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
};

module.exports = { sendPushNotification };
