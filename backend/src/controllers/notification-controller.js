const prisma = require('../prisma');
const { parseId } = require('../helpers');

// GET /notifications — 20 dernières + unreadCount
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        take:    20,
      }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    res.json({ data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// PUT /notifications/read-all — marquer toutes comme lues
const markAllRead = async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data:  { read: true },
    });

    res.json({ updated: result.count });
  } catch (err) {
    next(err);
  }
};

// PUT /notifications/:id/read — marquer une notif comme lue
const markOneRead = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id invalide' });

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return res.status(404).json({ error: 'Notification introuvable' });
    if (notif.userId !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    await prisma.notification.update({ where: { id }, data: { read: true } });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAllRead, markOneRead };
