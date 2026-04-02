const prisma = require('../prisma');
const { notFound } = require('../helpers/errors');

// POST /newsletter/subscribe [auth]
const subscribe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user) return notFound(res, 'Utilisateur introuvable');

    const existing = await prisma.newsletterSubscription.findUnique({ where: { userId } });
    if (existing) {
      if (existing.active) return res.json({ subscribed: true, message: 'Déjà inscrit' });
      // Réactiver
      await prisma.newsletterSubscription.update({ where: { userId }, data: { active: true } });
      return res.json({ subscribed: true, message: 'Inscription réactivée' });
    }

    await prisma.newsletterSubscription.create({
      data: { userId, email: user.email },
    });

    res.status(201).json({ subscribed: true, message: 'Inscription confirmée' });
  } catch (err) {
    next(err);
  }
};

// DELETE /newsletter/subscribe [auth]
const unsubscribe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const existing = await prisma.newsletterSubscription.findUnique({ where: { userId } });
    if (!existing) return res.json({ subscribed: false, message: 'Non inscrit' });

    await prisma.newsletterSubscription.update({ where: { userId }, data: { active: false } });
    res.json({ subscribed: false, message: 'Désinscription confirmée' });
  } catch (err) {
    next(err);
  }
};

// GET /newsletter/unsubscribe/:token — lien dans l'email (pas besoin d'auth)
const unsubscribeByToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const sub = await prisma.newsletterSubscription.findUnique({ where: { unsubscribeToken: token } });
    if (!sub) return notFound(res, 'Lien invalide ou expiré');

    await prisma.newsletterSubscription.update({
      where: { unsubscribeToken: token },
      data: { active: false },
    });

    res.json({ subscribed: false, message: 'Désinscription confirmée' });
  } catch (err) {
    next(err);
  }
};

// GET /newsletter/status [auth]
const getStatus = async (req, res, next) => {
  try {
    const sub = await prisma.newsletterSubscription.findUnique({
      where: { userId: req.user.id },
      select: { active: true },
    });
    res.json({ subscribed: sub?.active || false });
  } catch (err) {
    next(err);
  }
};

module.exports = { subscribe, unsubscribe, unsubscribeByToken, getStatus };
