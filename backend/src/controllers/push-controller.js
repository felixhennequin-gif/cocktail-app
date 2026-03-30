const prisma = require('../prisma');
const { badRequest } = require('../helpers');

// GET /push/vapid-key — retourne la clé publique VAPID (pas d'auth requise)
const getVapidKey = (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ error: 'Push notifications non configurées sur ce serveur' });
  }
  res.json({ publicKey: key });
};

// POST /push/subscribe — enregistre ou met à jour une subscription push
// Body attendu : { endpoint, keys: { p256dh, auth } }
const subscribePush = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
      return badRequest(res, 'endpoint manquant');
    }
    if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
      return badRequest(res, 'keys.p256dh et keys.auth sont requis');
    }

    const userId = req.user.id;

    // Upsert : met à jour si l'endpoint existe déjà (rotation de clés), crée sinon
    const subscription = await prisma.pushSubscription.upsert({
      where:  { endpoint },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    res.status(201).json({ ok: true, id: subscription.id });
  } catch (err) {
    next(err);
  }
};

// DELETE /push/subscribe — supprime une subscription push par endpoint
// Body attendu : { endpoint }
const unsubscribePush = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
      return badRequest(res, 'endpoint manquant');
    }

    const userId = req.user.id;

    // Vérifie que la subscription appartient bien à cet utilisateur
    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (!existing || existing.userId !== userId) {
      // Réponse 200 même si absente — idempotent
      return res.json({ ok: true });
    }

    await prisma.pushSubscription.delete({ where: { endpoint } });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getVapidKey, subscribePush, unsubscribePush };
